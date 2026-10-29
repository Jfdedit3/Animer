import DiscoveryHero from "./components/catalog/DiscoveryHero";
import { asCatalogue, asAnime, asEpisodes, asStream } from "./local/animesama";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Home,
  Search,
  Heart,
  List,
  History,
  Settings,
  ArrowLeft,
  Star,
  Download,
  Upload,
  Play,
  ArrowUpRight,
  ShieldCheck,
  Moon,
} from "lucide-react";
import { publicCatalog, publicAnime, publicEpisodes } from "./local/catalog";
import { exportLocalData, importLocalData, LOCAL_USER } from "./local/database";
import { useFavorite } from "./hooks/useFavorite";
import { useListsStore } from "./stores/useListsStore";
import { useFavoritesStore } from "./stores/useFavoritesStore";
import { useSettingsStore } from "./stores/useSettingsStore";
import {
  markEpisodeWatched,
  unmarkEpisodeWatched,
  getAnimeProgressMap,
} from "./api/progress";
import { LIST_STATUSES } from "./utils/lists";
import { getProvider, saveProvider } from "./providers/registry";
import { safeProviderUrl } from "./web/urls";
import { toast } from "./lib/toast";
const Favorites = lazy(() => import("./pages/FavoritesPage"));
const Lists = lazy(() => import("./pages/MyListsPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const Player = lazy(() => import("./local/Player"));
const nav = [
  ["/", "Accueil", Home],
  ["/search", "Recherche", Search],
  ["/favorites", "Favoris", Heart],
  ["/lists", "Listes", List],
  ["/history", "Historique", History],
  ["/settings", "Réglages", Settings],
];
function Busy() {
  return (
    <p className="local-state" role="status">
      Chargement…
    </p>
  );
}
function Failure({ error, retry }) {
  return (
    <div className="local-state" role="alert">
      <p>{error}</p>
      <button className="btn-shu" onClick={retry}>
        Réessayer
      </button>
    </div>
  );
}
function useResource(fetcher, deps) {
  const [state, set] = useState({ loading: true });
  const [retry, bump] = useState(0);
  useEffect(() => {
    let active = true;
    set({ loading: true });
    fetcher()
      .then((data) => active && set({ data }))
      .catch((e) => active && set({ error: e.message }));
    return () => {
      active = false;
    };
  }, [...deps, retry]);
  return { ...state, retry: () => bump((v) => v + 1) };
}
async function sourceGet(path) {
  const p = getProvider();
  const res = await fetch(p.baseUrl + path, {
    credentials: "omit",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok)
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Cette source exige un compte. Choisissez une source publique dans les réglages."
        : "La source publique ne répond pas.",
    );
  return (await res.json()).data;
}
function metadata(item) {
  return {
    slug: item.slug,
    title: item.title,
    cover: item.cover || item.image,
    genre: item.genre || item.genres?.[0],
  };
}
function AnimeCard({ item }) {
  const m = metadata(item);
  return (
    <Link to={"/anime/" + encodeURIComponent(m.slug)} className="local-card">
      <div>
        <img src={m.cover} alt="" loading="lazy" />
        <span className="local-card-open" aria-hidden="true"><Play size={20} fill="currentColor" /></span>
        {item.score > 0 && (
          <span>
            <Star size={12} />
            {item.score}
          </span>
        )}
      </div>
      <h2>{m.title}</h2>
      <p>
        {item.year || item.source || "Anime"}
        {item.episodes ? " · " + item.episodes + " épisodes" : ""}
      </p>
    </Link>
  );
}
function Catalog() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    page = Number(params.get("page")) || 1;
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);
  const result = useResource(async () => {
    if (getProvider().id === "anime-sama") return asCatalogue(q, page);
    if (getProvider().id === "jikan") return publicCatalog(q, page);
    const data = await sourceGet(
      "/v1/anime/catalog?search=" + encodeURIComponent(q) + "&page=" + page,
    );
    return {
      items: Array.isArray(data) ? data : data?.items || [],
      hasNext: !!data?.hasNext,
    };
  }, [q, page]);
  return (
    <section className="local-catalog">
      {isHome && !q && page === 1 && <DiscoveryHero />}
      <header className="local-hero local-search-header" id="catalogue">
        <div>
          <p className="local-eyebrow">{isHome && !q ? "LA SUITE DE TA SOIRÉE" : "EXPLORER"}</p>
          <h1>{q ? `À la recherche de « ${q} »` : isHome ? "Une envie d’anime ?" : "Trouve ta prochaine histoire."}</h1>
          <p>Des univers à explorer. Une collection qui te ressemble.</p>
        </div>
        <form role="search" onSubmit={(e) => {
          e.preventDefault();
          setParams(input.trim() ? { q: input.trim() } : {});
        }}>
          <Search size={20} aria-hidden="true" />
          <input type="search" aria-label="Rechercher un anime" placeholder="Un titre, une nouvelle aventure…"
            value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" aria-label="Rechercher"><ArrowUpRight size={20} /><span>Rechercher</span></button>
        </form>
      </header>
      <div className="local-section-title">
        <div><p className="local-eyebrow">LE CATALOGUE</p><h2>{q ? "Les résultats" : "Tous les univers"}</h2></div>
        <span>
          {getProvider().id === "nartya"
            ? "Catalogue public · Jikan / MyAnimeList"
            : getProvider().label}
        </span>
      </div>
      {result.loading ? (
        <div className="local-grid local-skeleton-grid" role="status" aria-label="Chargement du catalogue">
          {Array.from({length: 12}, (_, i) => <div className="local-card-skeleton" key={i}><div /><span /></div>)}
        </div>
      ) : result.error ? (
        <Failure error={result.error} retry={result.retry} />
      ) : (
        <>
          <>
            {result.data.snapshot && (
              <p className="local-notice">
                Sélection Anime-Sama enregistrée le{" "}
                {new Date(result.data.fetchedAt).toLocaleDateString("fr-FR")}.
                Le catalogue en direct est temporairement indisponible. Les fiches et lecteurs nécessitent une connexion au service.{" "}
                <a
                  href="https://anime-sama.to/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ouvrir Anime-Sama ↗
                </a>
              </p>
            )}
            {result.data.fallback && (
              <p className="local-notice">
                Jikan est indisponible. Catalogue de secours du{" "}
                {result.data.lastUpdate} ·{" "}
                <a
                  href="https://github.com/manami-project/anime-offline-database"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  anime-offline-database
                </a>{" "}
                ·{" "}
                <a href={import.meta.env.BASE_URL + "data/LICENSE.txt"}>
                  ODbL / DbCL
                </a>
                .
              </p>
            )}
          </>
          <div className="local-grid">
            {result.data.items.map((item) => (
              <AnimeCard key={item.slug} item={item} />
            ))}
          </div>
          {!result.data.items.length && (
            <p className="local-state">Aucun anime trouvé.</p>
          )}
          <div className="local-pagination">
            <button
              disabled={page === 1}
              onClick={() => setParams({ q, page: String(page - 1) })}
            >
              Précédent
            </button>
            <span>Page {page}</span>
            <button
              disabled={!result.data.hasNext}
              onClick={() => setParams({ q, page: String(page + 1) })}
            >
              Suivant
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function Anime() {
  const { slug } = useParams();
  const result = useResource(async () => {
    if (slug.startsWith("as-")) return asAnime(slug);
    if (slug.startsWith("mal-")) return publicAnime(slug);
    const p = await sourceGet("/v1/anime/" + encodeURIComponent(slug));
    return {
      ...p,
      ...metadata({
        ...p.anime,
        slug,
        cover: p.images?.poster || p.anime?.image,
      }),
      synopsis: p.anime?.synopsis,
      seasons: p.seasons || [],
    };
  }, [slug]);
  if (result.loading) return <Busy />;
  if (result.error)
    return <Failure error={result.error} retry={result.retry} />;
  return <AnimeDetail key={slug} anime={result.data} />;
}
function AnimeDetail({ anime }) {
  const { fav, toggle, busy } = useFavorite(anime.slug, anime);
  const statuses = useListsStore((s) => s.statuses),
    setStatus = useListsStore((s) => s.setStatus),
    removeStatus = useListsStore((s) => s.remove);
  const [season, setSeason] = useState(anime.seasons?.[0]?.id || "saison1"),
    [page, setPage] = useState(1),
    [lang, setLang] = useState(anime.seasons?.[0]?.languages?.[0] || "vostfr"),
    [reader, setReader] = useState("auto"),
    [viewed, setViewed] = useState({}),
    [playing, setPlaying] = useState(null),
    [resolving, setResolving] = useState(false);
  const playRequest = useRef(0);
  useEffect(
    () => () => {
      playRequest.current++;
    },
    [],
  );
  const stopPlayback = () => {
    playRequest.current++;
    setResolving(false);
    setPlaying(null);
  };
  const episodes = useResource(
    () =>
      anime.slug.startsWith("as-")
        ? asEpisodes(anime.slug, season, lang)
        : anime.slug.startsWith("mal-")
          ? publicEpisodes(anime.slug, page)
          : sourceGet(
              "/v1/anime/" +
                encodeURIComponent(anime.slug) +
                "/seasons/" +
                encodeURIComponent(season) +
                "/episodes",
            ),
    [anime.slug, season, page, lang],
  );
  useEffect(() => {
    getAnimeProgressMap(anime.slug).then(setViewed);
  }, [anime.slug]);
  const setSeen = async (ep) => {
    try {
      const key = season + ":" + ep.episode;
      if (viewed[key]?.completed)
        await unmarkEpisodeWatched({
          slug: anime.slug,
          seasonId: season,
          episodeNumber: ep.episode,
        });
      else
        await markEpisodeWatched({
          slug: anime.slug,
          seasonId: season,
          episodeNumber: ep.episode,
          language: lang,
          title: anime.title,
          cover: anime.cover,
          userId: LOCAL_USER.id,
        });
      setViewed(await getAnimeProgressMap(anime.slug));
    } catch {
      toast.error("La sauvegarde locale a échoué.");
    }
  };
  const play = async (
    ep,
    { selectedReader = reader, selectedLanguage = lang } = {},
  ) => {
    const requestId = ++playRequest.current;
    setPlaying(null);
    setResolving(true);
    try {
      if (anime.slug.startsWith("as-")) {
        const data = await asStream({
          slug: anime.slug,
          season,
          lang: selectedLanguage,
          episode: ep.episode,
          reader: selectedReader,
        });
        if (requestId !== playRequest.current) return;
        setPlaying({
          ...data,
          ep,
          season,
          language: selectedLanguage,
          selectedReader,
        });
        return;
      }
      const entries = Object.values(
        ep.lecteurs?.vostfr || ep.lecteurs?.vf || {},
      );
      const first = entries
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .find((v) => v?.id);
      if (!first)
        throw new Error("Aucun flux public disponible pour cet épisode.");
      const data = await sourceGet(
        "/v1/streams/" + encodeURIComponent(first.id),
      );
      const url = safeProviderUrl(data.url, { appOrigin: location.origin });
      if (requestId !== playRequest.current) return;
      setPlaying({
        url,
        ep,
        season,
        language: selectedLanguage,
        selectedReader,
        kind: /\.(mp4|webm|m3u8)(?:[?#]|$)/i.test(url) ? "video" : "embed",
      });
    } catch (e) {
      if (requestId === playRequest.current) toast.error(e.message);
    } finally {
      if (requestId === playRequest.current) setResolving(false);
    }
  };
  const changeReader = (value) => {
    const current = playing?.ep;
    setReader(value);
    stopPlayback();
    if (current) void play(current, { selectedReader: value });
  };
  const changeLanguage = (value) => {
    const current = playing?.ep;
    setLang(value);
    setReader("auto");
    stopPlayback();
    if (current)
      void play(current, { selectedReader: "auto", selectedLanguage: value });
  };
  const episodeItems = episodes.data?.episodes || [];
  const playingIndex = playing
    ? episodeItems.findIndex((e) => e.episode === playing.ep.episode)
    : -1;
  const readerOptions = [
    { id: "auto", label: "Automatique" },
    ...[
      ...new Map(
        episodeItems.flatMap((e) => e.readers || []).map((r) => [r.id, r]),
      ).values(),
    ],
  ];
  const languageOptions = [
    ...new Set([
      lang,
      ...(episodes.data?.languages ||
        anime.seasons?.find((s) => s.id === season)?.languages ||
        []),
    ]),
  ];
  return (
    <article className="local-detail">
      <Link to="/" className="local-back">
        <ArrowLeft size={18} />
        Retour au catalogue
      </Link>
      <div className="local-detail-top">
        <img src={anime.cover} alt="" />
        <div>
          <p className="local-eyebrow">MA BIBLIOTHÈQUE</p>
          <h1>{anime.title}</h1>
          <p className="local-meta">
            {anime.year || ""} {anime.score ? " · ★ " + anime.score : ""}{" "}
            {anime.episodes ? " · " + anime.episodes + " épisodes" : ""}
          </p>
          <div className="local-actions">
            <button onClick={toggle} disabled={busy} aria-pressed={fav}>
              <Heart size={18} fill={fav ? "currentColor" : "none"} />
              {fav ? "Retirer des favoris" : "Ajouter aux favoris"}
            </button>
            <label>
              <span className="sr-only">Ma liste</span>
              <select
                aria-label="Ma liste"
                value={statuses.get(anime.slug) || ""}
                onChange={(e) =>
                  e.target.value
                    ? setStatus(anime.slug, e.target.value, anime)
                    : removeStatus(anime.slug)
                }
              >
                <option value="">Choisir une liste</option>
                {LIST_STATUSES.map((s) => (
                  <option value={s.key} key={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="local-synopsis">
            {anime.synopsis || anime.description || "Synopsis indisponible."}
          </p>
          {anime.url && (
            <a href={anime.url} target="_blank" rel="noopener noreferrer">
              Fiche MyAnimeList ↗
            </a>
          )}
        </div>
      </div>
      {anime.trailer && /^[\w-]{11}$/.test(anime.trailer) && (
        <details className="local-trailer">
          <summary>Bande-annonce officielle</summary>
          <iframe
            title="Bande-annonce"
            src={"https://www.youtube-nocookie.com/embed/" + anime.trailer}
            allowFullScreen
            loading="lazy"
          />
        </details>
      )}
      {anime.fallback && (
        <p className="local-notice">
          Fiche de secours du {anime.lastUpdate} ·{" "}
          <a href="https://github.com/manami-project/anime-offline-database">
            anime-offline-database
          </a>{" "}
          ·{" "}
          <a href={import.meta.env.BASE_URL + "data/LICENSE.txt"}>
            ODbL / DbCL
          </a>
          . Les titres détaillés des épisodes peuvent manquer.
        </p>
      )}
      <div className="local-section-title">
        <h2>Épisodes</h2>
        {anime.seasons?.length > 0 && (
          <select
            aria-label="Saison"
            value={season}
            onChange={(e) => {
              setSeason(e.target.value);
              setLang(
                anime.seasons?.find((s) => s.id === e.target.value)
                  ?.languages?.[0] || "vostfr",
              );
              stopPlayback();
              setReader("auto");
              setPage(1);
            }}
          >
            {anime.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {anime.slug.startsWith("as-") && (
        <div className="local-actions local-episode-tools">
          <label>
            Langue{" "}
            <select
              aria-label="Langue des épisodes"
              value={lang}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              {[
                ...new Set([
                  lang,
                  ...(episodes.data?.languages ||
                    anime.seasons?.find((s) => s.id === season)?.languages ||
                    []),
                ]),
              ].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lecteur{" "}
            <select
              aria-label="Lecteur vidéo"
              value={reader}
              onChange={(e) => changeReader(e.target.value)}
            >
              <option value="auto">Premier lecteur disponible</option>
              {[
                ...new Map(
                  (episodes.data?.episodes || [])
                    .flatMap((e) => e.readers || [])
                    .map((r) => [r.id, r]),
                ).values(),
              ].map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <a href={anime.sourceUrl} target="_blank" rel="noopener noreferrer">
            Source : Anime-Sama ↗
          </a>
        </div>
      )}
      {anime.slug.startsWith("mal-") && (
        <p className="local-notice">
          Le catalogue public fournit les informations et la liste des épisodes.
          Il ne fournit pas de flux vidéo. Vous pouvez marquer les épisodes vus
          ; une source publique compatible peut être configurée dans les
          réglages.
        </p>
      )}
      {resolving && (
        <p className="local-player-loading" role="status">
          Chargement du lecteur…
        </p>
      )}
      {playing && (
        <Suspense fallback={<Busy />}>
          <Player
            url={playing.url}
            kind={playing.kind}
            format={playing.format}
            language={playing.language}
            languages={languageOptions}
            sources={readerOptions}
            sourceId={playing.selectedReader}
            onSourceChange={changeReader}
            onLanguageChange={changeLanguage}
            hasPrev={playingIndex > 0}
            hasNext={
              playingIndex >= 0 && playingIndex < episodeItems.length - 1
            }
            onPrev={() => void play(episodeItems[playingIndex - 1])}
            onNext={() => void play(episodeItems[playingIndex + 1])}
            anime={anime}
            season={playing.season}
            episode={playing.ep.episode}
            onClose={stopPlayback}
          />
        </Suspense>
      )}
      {episodes.loading ? (
        <Busy />
      ) : episodes.error ? (
        <Failure error={episodes.error} retry={episodes.retry} />
      ) : (
        <>
          <ul className="local-episodes">
            {(episodes.data?.episodes || []).map((ep) => (
              <li key={ep.episode}>
                <span>
                  <small>ÉPISODE {ep.episode}</small>
                  {ep.title || "Épisode " + ep.episode}
                </span>
                {!anime.slug.startsWith("mal-") && (
                  <button disabled={resolving} onClick={() => play(ep)}>
                    Lire
                  </button>
                )}
                <button
                  aria-label={"Épisode " + ep.episode + " vu"}
                  aria-pressed={!!viewed[season + ":" + ep.episode]?.completed}
                  onClick={() => setSeen(ep)}
                >
                  {viewed[season + ":" + ep.episode]?.completed
                    ? "✓ Vu"
                    : "Marquer vu"}
                </button>
              </li>
            ))}
          </ul>
          {!episodes.data?.episodes?.length && (
            <p className="local-state">
              Aucun épisode répertorié pour le moment.
            </p>
          )}
          {episodes.data?.hasNext && (
            <button onClick={() => setPage((v) => v + 1)}>
              Épisodes suivants
            </button>
          )}
        </>
      )}
    </article>
  );
}
function LocalSettings() {
  const glass = useSettingsStore((s) => s.glassEffects),
    motion = useSettingsStore((s) => s.reduceMotion),
    setSetting = useSettingsStore((s) => s.setSetting);
  const [provider, setProvider] = useState(
    getProvider().id === "compatible" ? getProvider().baseUrl : "",
  );
  const [message, setMessage] = useState("");
  const [sourceMode, setSourceMode] = useState(getProvider().id);
  const save = () => {
    const blob = new Blob([JSON.stringify(exportLocalData(), null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "animer-sauvegarde.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="local-settings">
      <h1>Sur cet appareil</h1>
      <p>
        Votre bibliothèque est enregistrée uniquement dans ce navigateur.
        Effacer les données du site supprime cette sauvegarde. Exportez-la pour
        la conserver ou changer d’appareil.
      </p>
      <div className="glass-panel">
        <h2>Apparence</h2>
        <label>
          <input
            type="checkbox"
            checked={glass}
            onChange={(e) => setSetting("glassEffects", e.target.checked)}
          />
          Effet glass
        </label>
        <label>
          <input
            type="checkbox"
            checked={motion}
            onChange={(e) => setSetting("reduceMotion", e.target.checked)}
          />
          Réduire les animations
        </label>
      </div>
      <div className="glass-panel">
        <h2>Sauvegarde locale</h2>
        <button
          onClick={() => {
            try {
              save();
            } catch (e) {
              setMessage(e.message);
            }
          }}
        >
          <Download size={18} />
          Exporter ma bibliothèque
        </button>
        <label className="local-import">
          <Upload size={18} />
          Importer une sauvegarde
          <input
            aria-label="Importer une sauvegarde"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              try {
                if (file.size > 10 * 1024 * 1024)
                  throw new Error("Fichier trop volumineux.");
                const data = JSON.parse(await file.text());
                importLocalData(data);
                location.reload();
              } catch (error) {
                setMessage(error.message);
              }
              e.target.value = "";
            }}
          />
        </label>
        <p>
          L’import remplace la bibliothèque locale. Exportez votre sauvegarde
          actuelle avant de la remplacer.
        </p>
      </div>
      <div className="glass-panel">
        <h2>Source du catalogue</h2>
        <p>
          Par défaut : Jikan / MyAnimeList, sans compte. Pour la lecture,
          utilisez une API publique compatible avec les routes catalogue,
          fiches, épisodes et flux. Elle doit autoriser les requêtes de ce site.
          Aucun jeton de compte n’est envoyé.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              saveProvider(
                sourceMode === "anime-sama"
                  ? null
                  : sourceMode === "jikan"
                    ? { id: "jikan" }
                    : provider.trim()
                      ? {
                          id: "compatible",
                          label: "Ma source publique",
                          baseUrl: provider.trim(),
                        }
                      : null,
              );
              location.reload();
            } catch (error) {
              setMessage(error.message);
            }
          }}
        >
          <select
            aria-label="Source du catalogue"
            value={sourceMode}
            onChange={(e) => setSourceMode(e.target.value)}
          >
            <option value="anime-sama">Anime-Sama</option>
            <option value="jikan">Jikan / MyAnimeList (informations)</option>
            <option value="compatible">Autre API publique</option>
          </select>
          {sourceMode === "compatible" && (
            <input
              aria-label="API publique compatible"
              placeholder="https://votre-source.example"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          )}
          <button>Enregistrer la source</button>
        </form>
      </div>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({top: 0, behavior: "instant"}); }, [pathname]);
  const favoriteCount = useFavoritesStore((s) => s.slugs.size);
  const currentSection = nav.find(([path]) => path === pathname)?.[1] || "Fiche anime";
  useEffect(() => {
    useListsStore.getState().ensureLoaded();
    useFavoritesStore.getState().ensureLoaded();
  }, []);
  return (
    <div className="local-app">
      <a className="local-skip" href="#contenu" onClick={(e) => {e.preventDefault();document.getElementById("contenu")?.focus();}}>Aller au contenu</a>
      <header className="local-topbar">
        <Link to="/" className="local-brand">
          <Moon size={27} fill="currentColor" aria-hidden="true" />animer<span>夜</span>
        </Link>
        <span className="local-current-section">{currentSection}</span>
        <Link to="/settings" className="local-save-indicator"><ShieldCheck size={16} /><span>Sur cet appareil</span></Link>
      </header>
      <nav className="local-nav" aria-label="Navigation principale">
        {nav.map(([path, label, Icon], i) => (
          <div className="local-nav-item" key={path}>
            {(i === 0 || i === 2) && <p className="local-nav-label">{i === 0 ? "DÉCOUVRIR" : "MA COLLECTION"}</p>}
            <NavLink to={path} end={path === "/"}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
              {path === "/favorites" && favoriteCount > 0 && <b className="local-nav-count">{favoriteCount}</b>}
            </NavLink>
          </div>
        ))}
        <aside className="local-library-note"><ShieldCheck size={20} /><strong>Ta collection, à toi.</strong><p>Favoris et progression sont conservés sur cet appareil.</p><Link to="/settings">Gérer ma sauvegarde <ArrowUpRight size={14} /></Link></aside>
      </nav>
      <main className="local-main" id="contenu" tabIndex={-1}>
        <Suspense fallback={<Busy />}>
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/search" element={<Catalog />} />
            <Route path="/anime/:slug" element={<Anime />} />
            <Route path="/favorites" element={<div className="local-collection"><Favorites /></div>} />
            <Route path="/lists" element={<div className="local-collection"><Lists /></div>} />
            <Route path="/history" element={<div className="local-collection"><HistoryPage /></div>} />
            <Route path="/settings" element={<LocalSettings />} />
            <Route path="/watch/:slug" element={<ResumeLink />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
function ResumeLink() {
  const { slug } = useParams();
  return <Navigate to={"/anime/" + encodeURIComponent(slug)} replace />;
}
