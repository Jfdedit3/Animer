/** Provider selection is local. A Nartya session is never forwarded to another origin. */
import {permitsSession} from '../web/urls.js';
export const PROVIDER_STORAGE_KEY = "yoru:provider:v1";
export const NARTYA_BASE = "https://anime.nartya.app";
export function normalizeProvider(value) {
  if (!value || value.id === "nartya" || value.id === "anime-sama") return { id: "anime-sama", label: "Anime-Sama", baseUrl: "https://anime-sama.to", publicCatalog: true };
  if(value.id === "jikan")return {id:"jikan",label:"Jikan / MyAnimeList",baseUrl:"https://api.jikan.moe",publicCatalog:true};
  const url = new URL(value.baseUrl);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash) throw new Error("Utilisez une adresse HTTPS sans identifiants ni paramètres.");
  if (url.origin === NARTYA_BASE) return normalizeProvider(null);
  return { id: "compatible", label: String(value.label || "Mon fournisseur").slice(0, 45), baseUrl: url.href.replace(/\/+$/, ""), publicCatalog: true };
}
export function getProvider() {
  try { return normalizeProvider(JSON.parse(localStorage.getItem(PROVIDER_STORAGE_KEY))); } catch { return normalizeProvider(null); }
}
export function saveProvider(value) {
  const provider = normalizeProvider(value);
  localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(provider));
  return provider;
}
export function canSendNartyaSession(apiBaseUrl) {
  return permitsSession(apiBaseUrl,{providerId:getProvider().id,relay:import.meta.env?.VITE_RELAY_URL||'',nartya:NARTYA_BASE});
}
export function providerCacheNamespace() { return encodeURIComponent(getProvider().baseUrl); }
