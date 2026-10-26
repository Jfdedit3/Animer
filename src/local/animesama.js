import { WEB_RELAY } from "../config/webHosting";
import { safeProviderUrl } from "../web/urls";
const base = WEB_RELAY
  ? WEB_RELAY + "/api/animesama"
  : import.meta.env.MODE === "pages"
    ? null
    : "/api/animesama";
async function request(path, options = {}) {
  if (!base)
    throw new Error(
      "Le relais Anime-Sama doit être configuré pour accéder aux fiches et aux lecteurs depuis GitHub Pages.",
    );
  const response = await fetch(base + path, {
    ...options,
    credentials: "omit",
    signal: AbortSignal.timeout(25000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      value.error ||
        "Le relais Anime-Sama est indisponible. Réessayez dans un instant.",
    );
  return value.data;
}
export async function asCatalogue(search = "", page = 1) {
  try {
    return await request(
      "/catalog?search=" + encodeURIComponent(search) + "&page=" + page,
    );
  } catch (error) {
    const response = await fetch(
      import.meta.env.BASE_URL + "data/animesama-home.json",
    );
    if (!response.ok) throw error;
    const saved = await response.json(),
      q = search.toLowerCase().trim(),
      items = saved.items.filter(
        (a) => !q || a.title.toLowerCase().includes(q),
      );
    return {
      items: items.slice((page - 1) * 24, page * 24),
      hasNext: items.length > page * 24,
      snapshot: true,
      fetchedAt: saved.fetchedAt,
      relayUnavailable: true,
    };
  }
}
export const asAnime = (slug) =>
  request("/anime/" + encodeURIComponent(slug.replace(/^as-/, "")));
export const asEpisodes = (slug, season, lang) =>
  request(
    "/anime/" +
      encodeURIComponent(slug.replace(/^as-/, "")) +
      "/episodes?season=" +
      encodeURIComponent(season) +
      "&lang=" +
      encodeURIComponent(lang),
  );
export async function asStream({ slug, season, lang, episode, reader }) {
  const data = await request("/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: slug.replace(/^as-/, ""),
      season,
      lang,
      episode,
      reader,
    }),
  });
  const target = new URL(
    data.url,
    base.startsWith("/") ? location.origin : base,
  );
  const relayOrigin = new URL(base, location.origin).origin;
  if (
    data.kind === "video" &&
    target.origin === relayOrigin &&
    target.pathname === "/api/media"
  )
    return { ...data, url: target.href };
  return {
    ...data,
    url: safeProviderUrl(target.href, { appOrigin: location.origin }),
  };
}
