import { WEB_RELAY } from '../config/webHosting';

const base = `${WEB_RELAY}/api/movies`;
export async function moviesRequest(path, signal) {
  const response = await fetch(base + path, { credentials: 'omit', signal: signal || AbortSignal.timeout(path.startsWith('/resolve') ? 90000 : 25000) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'La source Movies ne répond pas.');
  return value.data;
}
export function movieMediaUrl(path) {
  const origin = WEB_RELAY || window.location.origin;
  const url = new URL(path, origin);
  if (url.origin !== new URL(origin).origin || url.pathname !== '/api/media' || !url.searchParams.get('t')) throw new Error('Lien de lecture non reconnu.');
  return url.href;
}
