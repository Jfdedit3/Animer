import { WEB_RELAY } from '../config/webHosting';

const base = `${WEB_RELAY}/api/movies`;
export async function moviesRequest(path, signal) {
  const response = await fetch(base + path, { credentials: 'omit', signal: signal || AbortSignal.timeout(25000) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'La source Movies ne répond pas.');
  return value.data;
}
export function playerUrl(item, season = 1, episode = 1) {
  if (!['movie', 'tv'].includes(item.type) || !Number.isSafeInteger(item.id) || item.id < 1) throw new Error('Programme invalide.');
  const url = new URL(`https://cinemaos.tech/watch/${item.type}/${item.id}`);
  if (item.type === 'tv') {
    for (const n of [season, episode]) if (!Number.isSafeInteger(n) || n < 1 || n > 10000) throw new Error('Épisode invalide.');
    url.searchParams.set('season', season); url.searchParams.set('episode', episode);
  }
  return url.href;
}
