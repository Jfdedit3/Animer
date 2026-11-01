export const MOVIES_KEY = 'animer:movies:v1';
const EVENT = 'animer:movies-changed';
const image = value => {
  try { const u = new URL(value); return u.origin === 'https://image.tmdb.org' && u.pathname.startsWith('/t/p/') ? u.href : null; } catch { return null; }
};
export function cleanMovie(item) {
  if (!item || !['movie', 'tv'].includes(item.type) || !Number.isSafeInteger(item.id) || item.id < 1) throw new Error('Programme de sauvegarde invalide.');
  return { id: item.id, type: item.type, key: `${item.type}-${item.id}`, title: String(item.title || '').slice(0, 250), cover: image(item.cover), backdrop: image(item.backdrop), year: String(item.year || '').slice(0,4), rating: Number(item.rating) || 0 };
}
export function readMovies() {
  try { const data = JSON.parse(localStorage.getItem(MOVIES_KEY) || '{}'); return data.version === 1 && data.items && !Array.isArray(data.items) ? data.items : {}; } catch { return {}; }
}
function write(items) {
  localStorage.setItem(MOVIES_KEY, JSON.stringify({ version: 1, items }));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
export function updateMovie(item, patch) {
  const raw = localStorage.getItem(MOVIES_KEY);
  if (raw) {
    let previous;
    try { previous = JSON.parse(raw); } catch { throw new Error('La sauvegarde Movies est illisible. Exporte-la avant de la remplacer.'); }
    if (previous.version !== 1 || !previous.items || Array.isArray(previous.items)) throw new Error('Format de sauvegarde Movies non reconnu.');
  }
  const cleaned = cleanMovie(item), items = readMovies();
  items[cleaned.key] = { ...items[cleaned.key], item: cleaned, ...patch, updatedAt: Date.now() };
  write(items);
}
export function markMovieEpisode(item, season, episode) {
  const row = readMovies()[item.key] || {};
  const key = `${season}:${episode}`, watched = new Set(row.watched || []);
  if (watched.has(key)) watched.delete(key); else watched.add(key);
  updateMovie(item, { watched: [...watched], ...(item.type === 'movie' ? { status: watched.has(key) ? 'completed' : 'watching' } : {}) });
}
export function subscribeMovies(listener) {
  const storage = event => { if (event.key === MOVIES_KEY || event.key === null) listener(); };
  window.addEventListener(EVENT, listener); window.addEventListener('storage', storage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', storage); };
}
export function exportMovies() { return { app: 'animer-movies', version: 1, items: readMovies() }; }
export function importMovies(data) {
  if (data?.app !== 'animer-movies' || data.version !== 1 || !data.items || Array.isArray(data.items) || Object.keys(data.items).length > 5000) throw new Error('Sauvegarde Movies non reconnue.');
  const items = {};
  for (const row of Object.values(data.items)) {
    const item = cleanMovie(row.item), seen = (row.watched || []).filter(x => /^\d{1,4}:\d{1,4}$/.test(x)).slice(0,5000);
    const last = row.last && Number.isInteger(row.last.season) && Number.isInteger(row.last.episode) && row.last.season > 0 && row.last.episode > 0 ? { season: row.last.season, episode: row.last.episode } : null;
    items[item.key] = { item, favorite: row.favorite === true, status: ['planned','watching','completed'].includes(row.status) ? row.status : '', watched: seen, last, openedAt: Number(row.openedAt) || 0, updatedAt: Number(row.updatedAt) || 0 };
  }
  write(items);
}
