import { load } from "cheerio/slim";
import { parse } from "acorn";
import {
  publicHttps,
  checkedFetch,
  boundedText,
  sealTicket,
} from "./security.js";
import { parsePackedJwPlayer } from "../src/shared/videoExtract.js";
export const ANIME_SAMA = "https://anime-sama.to";
const cache = new Map(),
  TTL = 10 * 60 * 1000;
const response = (data, status = 200) =>
  Response.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
const failure = (message, status = 502) =>
  Response.json({ error: message }, { status });
export function coordinate(value, kind = "slug") {
  const pattern =
    kind === "slug"
      ? /^[a-z0-9][a-z0-9-]{0,180}$/
      : kind === "lang"
        ? /^(vostfr|vf\d*|va|vj|var|vkr|vcn|vqc)$/
        : /^[a-z0-9][a-z0-9-]{0,60}$/;
  if (typeof value !== "string" || !pattern.test(value))
    throw new Error("Coordonnées Anime-Sama invalides.");
  return value;
}
function cover(value) {
  try {
    return publicHttps(new URL(value, ANIME_SAMA)).href;
  } catch {
    return null;
  }
}
export function parseCatalogue(html, page = 1) {
  const $ = load(html),
    items = [],
    seen = new Set();
  $(".as-carte").each((_, el) => {
    const card = $(el);
    if (!card.find(".as-badge-anime").length && !card.hasClass("Anime")) return;
    const path =
      card.attr("data-url") ||
      card.find('a[href*="/catalogue/"]').attr("href") ||
      "";
    let slug;
    try {
      const url = new URL(path, ANIME_SAMA);
      if (url.origin !== ANIME_SAMA) return;
      slug =
        url.pathname.match(/^\/catalogue\/([a-z0-9-]+)\/?$/)?.[1] ||
        url.pathname.match(/^\/catalogue\/([a-z0-9-]+)\//)?.[1];
      coordinate(slug);
    } catch {
      return;
    }
    if (seen.has(slug)) return;
    seen.add(slug);
    const title =
      card.attr("data-nom") || card.find("h3").first().text().trim();
    if (!title) return;
    items.push({
      slug: "as-" + slug,
      title,
      cover: cover(
        card.find(".as-carte-image img").attr("src") || card.attr("data-img"),
      ),
      source: "Anime-Sama",
    });
  });
  let max = page;
  $('a[href*="page="]').each((_, el) => {
    try {
      max = Math.max(
        max,
        Number(
          new URL($(el).attr("href"), ANIME_SAMA).searchParams.get("page"),
        ) || 0,
      );
    } catch {}
  });
  return { items, hasNext: max > page, source: "Anime-Sama" };
}
export function parseAnime(html, slug) {
  coordinate(slug);
  const $ = load(html),
    title = $("#titreOeuvre").first().text().trim();
  if (!title) throw new Error("Fiche Anime-Sama non reconnue.");
  const seasons = [],
    seen = new Set();
  $("script:not([src])").each((_, el) => {
    // Parse literal calls, ignoring comments; never execute remote JavaScript.
    let ast;
    try {
      ast = parse($(el).html() || "", { ecmaVersion: "latest" });
    } catch {
      return;
    }
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (
        node.type === "CallExpression" &&
        node.callee?.name === "panneauAnime"
      ) {
        const [label, path] = node.arguments || [];
        if (
          label?.type === "Literal" &&
          typeof label.value === "string" &&
          path?.type === "Literal" &&
          typeof path.value === "string"
        ) {
          const match = path.value.match(
            /^([a-z0-9-]+)\/(vostfr|vf\d*|va|vj|var|vkr|vcn|vqc)\/?$/,
          );
          if (match) {
            const id = coordinate(match[1], "season"),
              key = id + ":" + match[2];
            if (!seen.has(key)) {
              seen.add(key);
              let season = seasons.find((s) => s.id === id);
              if (!season) {
                season = { id, name: label.value, languages: [] };
                seasons.push(season);
              }
              season.languages.push(match[2]);
            }
          }
        }
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    };
    visit(ast);
  });
  return {
    slug: "as-" + slug,
    title,
    cover: cover($('meta[property="og:image"]').attr("content")),
    synopsis:
      $("#synopsisText").text().trim() ||
      $('meta[name="description"]').attr("content") ||
      "",
    genres: $(".oe-genres a")
      .map((_, el) => $(el).text().trim())
      .get(),
    seasons,
    source: "Anime-Sama",
    sourceUrl: ANIME_SAMA + "/catalogue/" + slug + "/",
  };
}
export function parseEpisodes(script) {
  if (script.length > 1000000)
    throw new Error("Liste d’épisodes trop volumineuse.");
  const ast = parse(script, { ecmaVersion: "latest" }),
    sources = [];
  for (const statement of ast.body) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const decl of statement.declarations) {
      if (
        !/^eps\d+$/.test(decl.id?.name || "") ||
        decl.init?.type !== "ArrayExpression"
      )
        continue;
      const urls = decl.init.elements.map((el) => {
        if (el?.type !== "Literal" || typeof el.value !== "string") return null;
        try {
          return publicHttps(el.value.trim()).href;
        } catch {
          return null;
        }
      });
      sources.push({ id: decl.id.name, urls });
    }
  }
  if (!sources.length)
    throw new Error("Aucun lecteur public reconnu pour cette saison.");
  const count = Math.max(...sources.map((s) => s.urls.length));
  if (count > 5000) throw new Error("Liste d’épisodes trop volumineuse.");
  return { sources, count };
}
async function sourceText(path, fetcher, referer = ANIME_SAMA + "/") {
  const url = new URL(path, ANIME_SAMA);
  if (url.origin !== ANIME_SAMA) throw new Error("Source non autorisée.");
  const result = await checkedFetch(
    url.href,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AnimerWeb)",
        Referer: referer,
        Accept: "text/html,application/javascript",
      },
      signal: AbortSignal.timeout(15000),
    },
    fetcher,
  );
  if (new URL(result.url).origin !== ANIME_SAMA) {
    await result.response.body?.cancel();
    throw new Error("Redirection Anime-Sama non autorisée.");
  }
  if (!result.response.ok) {
    await result.response.body?.cancel();
    throw new Error(
      result.response.status === 403
        ? "Anime-Sama refuse temporairement cette requête."
        : "Anime-Sama est indisponible.",
    );
  }
  return boundedText(result.response, 3000000);
}
async function cached(key, fn) {
  const old = cache.get(key);
  if (old && old.exp > Date.now()) return old.promise;
  const promise = fn();
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  cache.set(key, { promise, exp: Date.now() + TTL });
  try {
    return await promise;
  } catch (e) {
    cache.delete(key);
    throw e;
  }
}
export async function animeSamaCatalogue(
  { search = "", page = 1 } = {},
  fetcher = fetch,
) {
  page = Math.min(1000, Math.max(1, Number(page) || 1));
  search = String(search).trim().slice(0, 150);
  return cached("catalog:" + search + ":" + page, async () => {
    const q = new URLSearchParams({ "type[]": "Anime", page: String(page) });
    if (search) q.set("search", search);
    return parseCatalogue(await sourceText("/catalogue/?" + q, fetcher), page);
  });
}
export async function animeSamaAnime(slug, fetcher = fetch) {
  coordinate(slug);
  return cached("anime:" + slug, async () =>
    parseAnime(await sourceText("/catalogue/" + slug + "/", fetcher), slug),
  );
}
async function episodeData(slug, season, lang, fetcher) {
  coordinate(slug);
  coordinate(season, "season");
  coordinate(lang, "lang");
  const path = "/catalogue/" + slug + "/" + season + "/" + lang + "/";
  return cached("episodes:" + path, async () => {
    const page = await sourceText(path, fetcher),
      $ = load(page);
    const scripts = $("script[src]")
      .map((_, el) => $(el).attr("src"))
      .get();
    const relative = scripts.find((src) =>
      /^episodes\.js(?:\?[^#]*)?$/.test(src),
    );
    if (!relative)
      throw new Error("Cette saison n’expose pas de liste de lecteurs.");
    const parsed = parseEpisodes(
      await sourceText(path + relative, fetcher, ANIME_SAMA + path),
    );
    const languages = [];
    for (const a of $(".ct-langues a").toArray()) {
      const value = $(a)
        .attr("href")
        ?.match(/(?:\.\.\/|\/)(vostfr|vf\d*|va|vj|var|vkr|vcn|vqc)\/?$/)?.[1];
      if (value && !languages.includes(value)) languages.push(value);
    }
    return {
      ...parsed,
      languages: languages.length ? languages : [lang],
      referer: ANIME_SAMA + path,
    };
  });
}
export async function animeSamaEpisodes(slug, season, lang, fetcher = fetch) {
  const data = await episodeData(slug, season, lang, fetcher);
  return {
    seasonName: season,
    totalEpisodes: data.count,
    languages: data.languages,
    episodes: Array.from({ length: data.count }, (_, i) => ({
      episode: i + 1,
      title: "",
      readers: data.sources
        .filter((s) => s.urls[i])
        .map((s, n) => ({ id: s.id, label: "Lecteur " + s.id.slice(3) })),
    })),
  };
}
export function extractPublicVideo(html, embed) {
  const $ = load(html);
  const direct =
    $('video[src],video source[src],source[type^="video/"]')
      .first()
      .attr("src") ||
    $('meta[property="og:video"],meta[property="og:video:url"]').attr(
      "content",
    );
  const jw = html.match(
    /(?:sources\s*:\s*\[\s*(?:\{\s*file\s*:)?|file\s*:)\s*["']([^"']+\.(?:mp4|m3u8|webm)(?:\?[^"']*)?)["']/i,
  )?.[1];
  const packed = direct || jw ? null : parsePackedJwPlayer(html);
  const raw = direct || jw || (packed?.success ? packed.videoUrl : null);
  if (!raw) return null;
  try {
    return publicHttps(new URL(raw.replace(/\\\//g, "/"), embed)).href;
  } catch {
    return null;
  }
}
export async function animeSamaStream(
  { slug, season, lang, episode, reader },
  env,
  fetcher = fetch,
) {
  const data = await episodeData(slug, season, lang, fetcher);
  const number = Number(episode);
  if (!Number.isInteger(number) || number < 1 || number > data.count)
    throw new Error("Épisode introuvable.");
  const choices = data.sources.filter((s) => s.urls[number - 1]);
  const source =
    reader && reader !== "auto"
      ? choices.find((s) => s.id === reader)
      : choices[0];
  if (!source) throw new Error("Lecteur indisponible pour cet épisode.");
  const embed = publicHttps(source.urls[number - 1]).href;
  let media = /\.(mp4|m3u8|webm)(?:[?#]|$)/i.test(embed) ? embed : null;
  if (!media) {
    try {
      const loaded = await checkedFetch(
        embed,
        {
          headers: { Referer: data.referer, "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(12000),
        },
        fetcher,
      );
      if (loaded.response.ok)
        media = extractPublicVideo(
          await boundedText(loaded.response),
          loaded.url,
        );
      else await loaded.response.body?.cancel();
    } catch {
      /* The authorized provider player remains available. */
    }
  }
  if (media && env.STREAM_SIGNING_KEY) {
    const format = /\.m3u8(?:[?#]|$)/i.test(media) ? "hls" : "video";
    const ticket = await sealTicket(
      { url: media, referer: embed, exp: Date.now() + 3600000 },
      env.STREAM_SIGNING_KEY,
    );
    return {
      url:
        "/api/media?t=" +
        encodeURIComponent(ticket) +
        (format === "hls" ? "&kind=hls" : ""),
      kind: "video",
      format,
      reader: source.id,
    };
  }
  return {
    url: embed,
    kind: /\.(mp4|m3u8|webm)(?:[?#]|$)/i.test(embed) ? "video" : "embed",
    reader: source.id,
  };
}
export async function handleAnimeSama(request, env = {}, fetcher = fetch) {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/animesama/catalog" && request.method === "GET")
      return response(
        await animeSamaCatalogue(
          {
            search: url.searchParams.get("search"),
            page: url.searchParams.get("page"),
          },
          fetcher,
        ),
      );
    const match = url.pathname.match(
      /^\/api\/animesama\/anime\/([a-z0-9-]+)(\/episodes)?$/,
    );
    if (match && request.method === "GET")
      return response(
        match[2]
          ? await animeSamaEpisodes(
              match[1],
              url.searchParams.get("season"),
              url.searchParams.get("lang") || "vostfr",
              fetcher,
            )
          : await animeSamaAnime(match[1], fetcher),
      );
    if (
      url.pathname === "/api/animesama/resolve" &&
      request.method === "POST"
    ) {
      let input;
      try {
        input = JSON.parse(await boundedText(request, 3000));
      } catch {
        return failure("Requête invalide.", 400);
      }
      return response(await animeSamaStream(input, env, fetcher));
    }
    return failure("Route Anime-Sama introuvable.", 404);
  } catch (e) {
    return failure(e.message, 502);
  }
}
export function resetAnimeSamaCache() {
  cache.clear();
}
