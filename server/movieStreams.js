import { load } from 'cheerio/slim';
import { checkedFetch, boundedText, publicHttps, sealTicket } from './security.js';
import { movieboxSources } from './movieboxStreams.js';

const ORIGIN = 'https://cinemaos.tech';
const encoder = new TextEncoder(), decoder = new TextDecoder();
const AGENT = 'Mozilla/5.0';
let protocolCache = null;
const hex = bytes => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
function unhex(value, size) {
  if (typeof value !== 'string' || !/^(?:[a-f0-9]{2})+$/i.test(value) || value.length > 4000000 || size && value.length !== size * 2) throw new Error('Réponse vidéo non reconnue.');
  return Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));
}
async function hmac(key, text) {
  const imported = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', imported, encoder.encode(text)));
}
export async function contentSignature(fields, primary, secondary) {
  const names = ['tmdbId', 'imdbId', 'seasonId', 'episodeId'];
  const content = names.filter(key => fields[key]).map(key => `${key}:${fields[key]}`).join('|');
  return hmac(secondary, await hmac(primary, content));
}
// Decode the public site's API envelope, as its browser client does. This is not a media DRM decoder.
export async function decodeMovieEnvelope(envelope, publicKey) {
  if (!envelope?.encrypted) return envelope;
  const value = envelope.data;
  if (!value || value.version !== 1) throw new Error('Format de réponse vidéo non pris en charge.');
  const password = await crypto.subtle.importKey('raw', encoder.encode(publicKey), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(value.salt, 32), iterations: 100000 }, password, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const encrypted = unhex(value.encrypted), tag = unhex(value.mao, 16), bytes = new Uint8Array(encrypted.length + tag.length);
  bytes.set(encrypted); bytes.set(tag, encrypted.length);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unhex(value.cin, 16), tagLength: 128 }, key, bytes);
  return JSON.parse(decoder.decode(plain));
}
async function textAt(url, fetcher, max = 1500000, timeout = 18000) {
  const { response } = await checkedFetch(url, { headers: { Accept: 'application/json,text/html,*/*', 'User-Agent': AGENT, Referer: ORIGIN + '/' }, signal: AbortSignal.timeout(timeout) }, fetcher);
  if (!response.ok) {
    const path = new URL(url).pathname;
    const phase = path.startsWith('/watch/') ? 'Page de lecture' : path.startsWith('/_next/') ? 'Configuration du lecteur' : 'Recherche de sources';
    throw new Error(`${phase} indisponible (HTTP ${response.status}).`);
  }
  return boundedText(response, max);
}
function scriptUrl(path) {
  const url = new URL(path, ORIGIN);
  if (url.origin !== ORIGIN || !url.pathname.startsWith('/_next/static/chunks/') || !url.pathname.endsWith('.js')) throw new Error('Configuration de lecture non reconnue.');
  return url.href;
}
async function publicProtocol(html, fetcher) {
  const $ = load(html), scripts = $('script[src]').map((_, node) => $(node).attr('src')).get();
  const pagePath = scripts.find(path => path.includes('/app/(watch)/watch/') && /\/page-[a-f0-9]+\.js$/.test(path));
  const runtimePath = scripts.find(path => /\/webpack-[a-f0-9]+\.js$/.test(path));
  if (!pagePath || !runtimePath) throw new Error('La source a changé sa configuration de lecture.');
  if (protocolCache?.path === pagePath && protocolCache.until > Date.now()) return protocolCache.value;
  const [page, runtime] = await Promise.all([textAt(scriptUrl(pagePath), fetcher), textAt(scriptUrl(runtimePath), fetcher)]);
  const signing = page.slice(page.indexOf('generateContentHash')).match(/"([a-f0-9]{64})",\w+="([a-f0-9]{64})"/);
  const chunk = runtime.match(/1712\s*:\s*"([a-f0-9]+)"/);
  if (!signing || !chunk) throw new Error('La source a changé son protocole de lecture.');
  const codec = await textAt(scriptUrl(`/_next/static/chunks/1712.${chunk[1]}.js`), fetcher);
  const key = codec.match(/ENCRYPTION_KEY\s*\|\|\s*"([a-f0-9]{64})"/);
  if (!key) throw new Error('La réponse vidéo ne peut pas être décodée.');
  // Only public browser protocol constants are cached; no account cookie or user credential is used.
  const value = { primary: signing[1], secondary: signing[2], envelopeKey: key[1] };
  protocolCache = { path: pagePath, value, until: Date.now() + 20 * 60000 };
  return value;
}
function transportFor(source, data) {
  const headers = { ...data.headers, ...source.headers };
  const referer = headers.Referer || headers.referer || ORIGIN + '/';
  return { referer: publicHttps(referer).href, transport: { userAgent: AGENT } };
}
export function collectMovieSources(data, provider) {
  const items = [];
  for (const [label, source] of Object.entries(data?.sources || {})) {
    if (!source || typeof source !== 'object') continue;
    const format = /hls|m3u8/i.test(source.type || '') ? 'hls' : /mp4|webm/i.test(source.type || '') ? 'video' : null;
    // DASH/DRM sources are not treated as MP4 or handed to the HLS player.
    if (!format) continue;
    const variants = source.url ? [{ url: source.url, quality: source.quality || '' }] : Object.entries(source.qualities || {}).sort(([a], [b]) => (Number(b) || 0) - (Number(a) || 0)).slice(0, 2).map(([quality, value]) => ({ url: value.url, quality: `${quality}p` }));
    for (const variant of variants) {
      try {
        const url = publicHttps(variant.url).href;
        items.push({ id: `${provider}-${items.length}`, label: `${label}${variant.quality ? ' · ' + variant.quality : ''}`.slice(0, 140), url, format, ...transportFor(source, data) });
      } catch { /* Ignore malformed source addresses instead of exposing an arbitrary proxy. */ }
    }
  }
  return items;
}
async function usableSource(source, fetcher) {
  try {
    const { response } = await checkedFetch(source.url, { headers: { Range: 'bytes=0-1023', 'User-Agent': AGENT, Referer: source.referer }, signal: AbortSignal.timeout(10000) }, fetcher);
    if (!response.ok) { await response.body?.cancel(); return false; }
    if (source.format === 'hls') return (await boundedText(response, 1000000)).trimStart().startsWith('#EXTM3U');
    const mime = response.headers.get('Content-Type') || '';
    await response.body?.cancel();
    return /video\/|octet-stream/i.test(mime);
  } catch { return false; }
}
export async function resolveMovieStreams({ type, id, season = 1, episode = 1, metadata }, env, fetcher = fetch) {
  if (!env.STREAM_SIGNING_KEY) throw new Error('Le relais vidéo n’est pas configuré.');
  let directError;
  try {
    const direct = await movieboxSources({ type, id, season, episode, metadata }, fetcher);
    if (direct.sources.length) return await issueMovieStreams(direct.sources, direct.captions, env, fetcher);
  } catch (error) { directError = error; }
  const watch = new URL(`${ORIGIN}/watch/${type}/${id}`);
  if (type === 'tv') { watch.searchParams.set('season', season); watch.searchParams.set('episode', episode); }
  let html;
  try { html = await textAt(watch.href, fetcher); }
  catch (error) { throw directError || error; }
  const token = html.replace(/\\"/g, '"').match(/"scrapeToken"\s*:\s*"([a-zA-Z0-9_.-]{20,600})"/)?.[1];
  if (!token) throw new Error('La source ne fournit pas de session publique de lecture.');
  const protocol = await publicProtocol(html, fetcher);
  const fields = { type, tmdbId: String(id), imdbId: metadata.imdb_id || metadata.external_ids?.imdb_id || '', t: metadata.title || metadata.name || '', ry: String(metadata.release_date || metadata.first_air_date || '').slice(0, 4) };
  if (type === 'tv') { fields.seasonId = String(season); fields.episodeId = String(episode); }
  const signature = await contentSignature(fields, protocol.primary, protocol.secondary);
  const captions = [], sources = [];
  const results = await Promise.allSettled(['q4', 'mb2'].map(async provider => {
    const params = new URLSearchParams({ ...fields, secret: signature, _st: token, scraper: provider });
    const envelope = JSON.parse(await textAt(`${ORIGIN}/api/relay/scrape?${params}`, fetcher, 3000000, 24000));
    return { provider, data: await decodeMovieEnvelope(envelope, protocol.envelopeKey) };
  }));
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    sources.push(...collectMovieSources(result.value.data, result.value.provider));
    for (const caption of result.value.data?.captions || []) {
      try {
        const url = publicHttps(caption.url).href, label = String(caption.label || caption.language || 'Sous-titres').slice(0, 80);
        if (!captions.some(c => c.url === url)) captions.push({ url, label, format: /\.srt(?:\?|$)/i.test(url) ? 'srt' : 'vtt' });
      } catch { /* Ignore invalid subtitle addresses. */ }
    }
  }
  return issueMovieStreams(sources, captions, env, fetcher);
}
export async function issueMovieStreams(sources, captions, env, fetcher) {
  const ordered = sources.sort((a, b) => Number(a.format !== 'hls') - Number(b.format !== 'hls'));
  let selectedId = null;
  // Confirm a playable media response, not a provider HTML page, before opening our player.
  for (const source of ordered.slice(0, 5)) {
    if (await usableSource(source, fetcher)) { selectedId = source.id; break; }
  }
  if (!selectedId) throw new Error('Aucun flux HLS ou MP4 ne répond actuellement. Réessaie dans un instant.');
  const exp = Date.now() + 4 * 3600000;
  const seal = async payload => '/api/media?t=' + encodeURIComponent(await sealTicket({ ...payload, exp }, env.STREAM_SIGNING_KEY));
  return {
    kind: 'video', selectedId,
    sources: await Promise.all(ordered.slice(0, 16).map(async source => ({ id: source.id, label: source.label, format: source.format, url: await seal({ url: source.url, referer: source.referer, transport: source.transport }) }))),
    captions: await Promise.all(captions.slice(0, 40).map(async caption => ({ label: caption.label, format: 'vtt', url: await seal({ url: caption.url, subtitle: true, referer: ORIGIN + '/', transport: { userAgent: AGENT } }) }))),
  };
}
