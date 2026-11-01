import { checkedFetch, boundedText } from './security.js';
import { resolveMovieStreams } from './movieStreams.js';

const SOURCE = 'https://cinemaos.tech';
const cache = new Map();
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const positive = (value, max = 100000000) => {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) throw new Error('Coordonnées Movies invalides.');
  return Number(value);
};
const typeOf = value => {
  if (!['movie', 'tv'].includes(value)) throw new Error('Type de programme invalide.');
  return value;
};
export function movieImage(path, size = 'w500') {
  return typeof path === 'string' && /^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(path)
    ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
export function normalizeMovie(item, type) {
  if (!item || item.adult || !Number.isSafeInteger(item.id) || item.id < 1) return null;
  const kind = typeOf(item.media_type === 'tv' || item.media_type === 'movie' ? item.media_type : type);
  return {
    id: item.id, type: kind, key: `${kind}-${item.id}`,
    title: String(item.title || item.name || item.original_title || item.original_name || '').slice(0, 250),
    overview: String(item.overview || '').slice(0, 12000),
    cover: movieImage(item.poster_path), backdrop: movieImage(item.backdrop_path, 'original'),
    year: String(item.release_date || item.first_air_date || '').slice(0, 4),
    rating: Number(item.vote_average) || 0, duration: Number(item.runtime) || 0,
    genres: (item.genres || []).map(g => ({ id: g.id, name: String(g.name || '') })),
    seasons: (item.seasons || []).filter(s => s.season_number > 0).map(s => ({ number: s.season_number, name: s.name, count: s.episode_count })),
  };
}
async function sourceJson(params, fetcher) {
  const url = `${SOURCE}/api/tmdb?${new URLSearchParams({ language: 'fr-FR', ...params })}`;
  const hit = cache.get(url);
  if (hit && hit.until > Date.now()) return hit.data;
  const { response } = await checkedFetch(url, { headers: { Accept: 'application/json' } }, fetcher);
  if (!response.ok) throw new Error('La source Movies est indisponible. Réessayez dans un instant.');
  const data = JSON.parse(await boundedText(response, 3000000));
  if (!data || data.success === false || data.error) throw new Error('La source Movies ne renvoie pas de données utilisables.');
  if (cache.size >= 160) cache.delete(cache.keys().next().value);
  cache.set(url, { data, until: Date.now() + 5 * 60000 });
  return data;
}
export function moviePlayerUrl({ type, id, season = 1, episode = 1 }) {
  const kind = typeOf(type), title = positive(id);
  const url = new URL(`${SOURCE}/watch/${kind}/${title}`);
  if (kind === 'tv') { url.searchParams.set('season', positive(season, 10000)); url.searchParams.set('episode', positive(episode, 10000)); }
  return url.href;
}
export async function handleMovies(request, env, fetcher = fetch) {
  if (request.method !== 'GET') return json({ error: 'Méthode non autorisée.' }, 405);
  const url = new URL(request.url), q = url.searchParams, route = url.pathname.slice('/api/movies/'.length);
  try {
    if (route === 'catalog') {
      const type = typeOf(q.get('type') || 'movie'), page = positive(q.get('page') || 1, 500);
      const query = (q.get('q') || '').trim().slice(0, 160), genre = q.get('genre');
      const suffix = type === 'tv' ? 'Tv' : 'Movie';
      const params = { requestID: (query ? 'search' : genre ? 'filter' : q.get('sort') === 'rating' ? 'topRated' : 'popular') + suffix, page: String(page) };
      if (query) params.query = query;
      if (genre) { params.genreKeywords = String(positive(genre, 100000)); params.sortBy = q.get('sort') === 'rating' ? 'vote_average.desc' : 'popularity.desc'; }
      const data = await sourceJson(params, fetcher);
      if (!Array.isArray(data.results)) throw new Error('Catalogue Movies non reconnu.');
      return json({ data: { items: data.results.map(item => normalizeMovie(item, type)).filter(Boolean), page, hasNext: page < Math.min(Number(data.total_pages) || page, 500), source: 'CinemaOS / TMDB' } });
    }
    if (route === 'genres') {
      const type = typeOf(q.get('type') || 'movie');
      const data = await sourceJson({ requestID: type === 'tv' ? 'genresTv' : 'genresMovie' }, fetcher);
      return json({ data: (data.genres || []).map(g => ({ id: g.id, name: g.name })) });
    }
    const title = route.match(/^title\/(movie|tv)\/(\d+)$/);
    if (title) {
      const id = positive(title[2]);
      const data = await sourceJson({ requestID: title[1] === 'tv' ? 'tvData' : 'movieData', id: String(id) }, fetcher);
      const item = normalizeMovie(data, title[1]);
      return item ? json({ data: item }) : json({ error: 'Ce programme est introuvable.' }, 404);
    }
    const season = route.match(/^season\/(\d+)\/(\d+)$/);
    if (season) {
      const id = positive(season[1]), number = positive(season[2], 10000);
      const data = await sourceJson({ requestID: 'tvEpisodes', id: String(id), season: String(number) }, fetcher);
      return json({ data: { number, episodes: (data.episodes || []).map(ep => ({ number: ep.episode_number, title: ep.name, overview: ep.overview, image: movieImage(ep.still_path, 'w300'), duration: ep.runtime })) } });
    }
    if (route === 'resolve' || route === 'player') {
      const type = typeOf(q.get('type') || 'movie'), id = positive(q.get('id'));
      const season = positive(q.get('season') || 1, 10000), episode = positive(q.get('episode') || 1, 10000);
      const metadata = await sourceJson({ requestID: type === 'tv' ? 'tvData' : 'movieData', id: String(id), language: 'en-US' }, fetcher);
      return json({ data: await resolveMovieStreams({ type, id, season, episode, metadata }, env, fetcher) });
    }
    return json({ error: 'Route Movies introuvable.' }, 404);
  } catch (error) {
    return json({ error: error.message || 'La source Movies ne répond pas.' }, /invalides?|invalide/.test(error.message) ? 400 : 502);
  }
}
