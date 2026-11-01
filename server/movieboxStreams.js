import { checkedFetch, boundedText, publicHttps } from './security.js';

const BFF = 'https://h5-api.aoneroom.com/wefeed-h5api-bff';
const WEBSITE = 'https://moviebox.ph';
const AGENT = 'Mozilla/5.0';
const titleKey = value => String(value || '').replace(/\s+(?:s\d+(?:\s*[-–]\s*s?\d+)?|season\s*\d+.*)$/i, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function matchMovieboxTitle(items, metadata, type) {
  const titles = [metadata.title, metadata.name, metadata.original_title, metadata.original_name].map(titleKey).filter(Boolean);
  const year = String(metadata.release_date || metadata.first_air_date || '').slice(0,4);
  return items.find(item => Number(item.subjectType) === (type === 'tv' ? 2 : 1) && titles.includes(titleKey(item.title)) && (!year || String(item.releaseDate || '').slice(0,4) === year));
}

// This is the service's public REST guest flow. No logged-in user's session is reused.
export async function movieboxSources({ type, id, season, episode, metadata }, fetcher = fetch) {
  let guestToken = '';
  async function api(path, body) {
    const url = new URL(BFF + path); url.searchParams.set('host', 'moviebox.ph');
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': AGENT, Referer: WEBSITE + '/', Origin: WEBSITE, 'X-Request-Lang': 'en', 'X-Client-Info': '{"timezone":"UTC"}' };
    if (guestToken) headers.Authorization = 'Bearer ' + guestToken;
    const { response } = await checkedFetch(url.href, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(18000) }, fetcher);
    if (!response.ok) throw new Error(`Le fournisseur vidéo est indisponible (HTTP ${response.status}).`);
    try {
      const token = JSON.parse(response.headers.get('x-user') || '{}').token;
      if (typeof token === 'string' && /^[a-zA-Z0-9_.-]{20,12000}$/.test(token)) guestToken = token;
    } catch { /* Anonymous endpoints may not rotate a guest token on every request. */ }
    const data = JSON.parse(await boundedText(response, 2000000));
    if (data.code !== 0) throw new Error('Le fournisseur vidéo ne propose pas cette lecture publique.');
    return data.data;
  }
  await api('/home');
  const search = await api('/subject/search', { keyword: metadata.title || metadata.name || metadata.original_title || metadata.original_name, page: 1, perPage: 30 });
  const item = matchMovieboxTitle(search.items || search.list || [], metadata, type);
  if (!item || !/^\d{1,30}$/.test(String(item.subjectId)) || !/^[a-zA-Z0-9_-]{1,250}$/.test(item.detailPath || '')) throw new Error('Ce programme n’a pas de source publique correspondante.');
  const publishedDomain = publicHttps(await api('/media-player/get-domain'));
  const playerOrigin = publishedDomain.origin;
  const se = type === 'tv' ? season : 0, ep = type === 'tv' ? episode : 0;
  const coordinates = new URLSearchParams({ subjectId: String(item.subjectId), se: String(se), ep: String(ep), detailPath: item.detailPath });
  const referer = `${playerOrigin}/spa/videoPlayPage/movies/${item.detailPath}?${new URLSearchParams({ id: String(item.subjectId), type: '/movie/detail', detailSe: String(se), detailEp: String(ep), lang: 'en' })}`;
  // The guest token belongs only to BFF. It is never sent to the player or a CDN.
  const { response } = await checkedFetch(`${playerOrigin}/wefeed-h5api-bff/subject/play?${coordinates}`, { headers: { Accept: 'application/json', 'User-Agent': AGENT, Referer: referer }, signal: AbortSignal.timeout(20000) }, fetcher);
  if (!response.ok) throw new Error('Le fournisseur ne renvoie pas de vidéo disponible.');
  const value = JSON.parse(await boundedText(response, 2000000));
  const data = value.data;
  if (value.code !== 0 || !data?.hasResource || data.limited || data.vipLocked) throw new Error('Aucune vidéo publique n’est disponible pour ce film ou cet épisode.');
  const sources = [];
  for (const stream of [...(Array.isArray(data.streams) ? data.streams : []), ...(Array.isArray(data.hls) ? data.hls : [])]) {
    const format = String(stream.format || stream.type || '');
    if (/dash|drm|mpd/i.test(format) || stream.drm || stream.licenseUrl) continue;
    if (!/mp4|hls|m3u8/i.test(format)) continue;
    try {
      const url = publicHttps(stream.url).href;
      sources.push({ id: `moviebox-${sources.length}`, label: `Original${stream.resolutions ? ' · ' + stream.resolutions + 'p' : ''}`, format: /hls|m3u8/i.test(format) ? 'hls' : 'video', url, referer, transport: { userAgent: AGENT }, resolution: Number(stream.resolutions) || 0 });
    } catch { /* Ignore invalid media URLs. */ }
  }
  sources.sort((a,b) => b.resolution-a.resolution);
  const captions = [];
  const captionStream = (data.streams || []).find(s => s.id && /mp4/i.test(s.format || ''));
  if (captionStream) {
    try {
      const captionData = await api('/subject/caption?' + new URLSearchParams({ format: captionStream.format || 'MP4', id: String(captionStream.id), subjectId: String(item.subjectId), detailPath: item.detailPath }));
      for (const track of Array.isArray(captionData) ? captionData : captionData?.captions || []) {
        try { captions.push({ url: publicHttps(track.url).href, label: String(track.lanName || track.language || track.lan || 'Sous-titres').slice(0,80) }); } catch { /* Invalid subtitles cannot become proxy targets. */ }
      }
    } catch { /* Unavailable subtitles must not prevent playback. */ }
  }
  return { sources, captions };
}
