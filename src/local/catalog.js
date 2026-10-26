const BASE = "https://api.jikan.moe/v4";
const memory = new Map();
let queue = Promise.resolve(),
  last = 0;
async function jikan(path) {
  if (memory.has(path)) return memory.get(path);
  const task = queue
    .catch(() => {})
    .then(async () => {
      const delay = 380 - (Date.now() - last);
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      last = Date.now();
      let res = await fetch(BASE + path, {
        signal: AbortSignal.timeout(6000),
        credentials: "omit",
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1200));
        res = await fetch(BASE + path, {
          signal: AbortSignal.timeout(6000),
          credentials: "omit",
        });
      }
      if (!res.ok)
        throw new Error(
          "Le catalogue public est indisponible. Réessayez dans un instant.",
        );
      return res.json();
    });
  queue = task;
  memory.set(path, task);
  task.catch(() => memory.delete(path));
  return task;
}
export function card(a) {
  return {
    slug: "mal-" + a.mal_id,
    title: a.title_english || a.title,
    cover: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url,
    genre: a.genres?.[0]?.name,
    year: a.year,
    score: a.score,
    episodes: a.episodes,
    description: a.synopsis,
  };
}
async function liveCatalog(query = "", page = 1) {
  const value = await jikan(
    query
      ? "/anime?sfw=true&limit=24&q=" +
          encodeURIComponent(query) +
          "&page=" +
          page
      : "/top/anime?sfw=true&limit=24&page=" + page,
  );
  return {
    items: (value.data || []).map(card),
    hasNext: !!value.pagination?.has_next_page,
  };
}
async function liveAnime(slug) {
  if (!/^mal-\d+$/.test(slug))
    throw new Error("Cette fiche appartient à une autre source.");
  const { data } = await jikan("/anime/" + slug.slice(4) + "/full");
  return {
    ...card(data),
    synopsis: data.synopsis,
    genres: data.genres || [],
    trailer: data.trailer?.youtube_id,
    url: data.url,
    episodes: data.episodes,
  };
}
async function liveEpisodes(slug, page = 1) {
  const { data, pagination } = await jikan(
    "/anime/" + slug.slice(4) + "/episodes?page=" + page,
  );
  return {
    episodes: (data || []).map((e) => ({ episode: e.mal_id, title: e.title })),
    hasNext: !!pagination?.has_next_page,
  };
}

let snapshotPromise;
async function snapshot() {
  if (!snapshotPromise)
    snapshotPromise = fetch(import.meta.env.BASE_URL + "data/catalog.json")
      .then((r) => {
        if (!r.ok) throw new Error("Catalogue de secours indisponible.");
        return r.json();
      })
      .catch((e) => {
        snapshotPromise = null;
        throw e;
      });
  return snapshotPromise;
}
export async function publicCatalog(query = "", page = 1) {
  try {
    return await liveCatalog(query, page);
  } catch {
    const db = await snapshot(),
      q = query.trim().toLowerCase();
    const all = db.items.filter(
      (a) =>
        !q || [a.title, ...a.synonyms].some((t) => t.toLowerCase().includes(q)),
    );
    return {
      items: all.slice((page - 1) * 24, page * 24),
      hasNext: all.length > page * 24,
      fallback: true,
      lastUpdate: db.lastUpdate,
    };
  }
}
export async function publicAnime(slug) {
  try {
    return await liveAnime(slug);
  } catch {
    const db = await snapshot(),
      a = db.items.find((a) => a.slug === slug);
    if (!a)
      throw new Error(
        "Cette fiche est indisponible pendant la panne du catalogue public.",
      );
    return {
      ...a,
      fallback: true,
      synopsis:
        "Les informations détaillées et le synopsis seront disponibles au retour du service public.",
      lastUpdate: db.lastUpdate,
    };
  }
}
export async function publicEpisodes(slug, page = 1) {
  try {
    return await liveEpisodes(slug, page);
  } catch {
    const db = await snapshot(),
      a = db.items.find((a) => a.slug === slug);
    if (!a) throw new Error("Liste des épisodes indisponible.");
    const total = Number(a.episodes) || 0;
    return {
      episodes: Array.from(
        { length: Math.max(0, Math.min(100, total - (page - 1) * 100)) },
        (_, i) => ({ episode: (page - 1) * 100 + i + 1, title: "" }),
      ),
      hasNext: total > page * 100,
      fallback: true,
    };
  }
}
