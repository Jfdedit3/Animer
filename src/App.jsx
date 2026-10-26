import { lazy, Suspense, useEffect, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  Link,
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
        {item.score > 0 && (
          <span>
            <Star size={12} />
            {item.score}
          </span>
        )}
      </div>
      <h2>{m.title}</h2>
      <p>
        {item.year || ""}
        {item.episodes ? " · " + item.episodes + " épisodes" : ""}
      </p>
    </Link>
  );
}
function Catalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    page = Number(params.get("page")) || 1;
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);
  const result = useResource(async () => {
    if (getProvider().id === "nartya") return publicCatalog(q, page);
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
      <header className="local-hero">
        <p className="local-eyebrow">ANIME APRÈS MINUIT</p>
        <h1>
          {q
            ? "À la recherche de votre prochaine aventure."
            : "Votre univers anime, à votre rythme."}
        </h1>
        <p>
          Sans compte. Vos favoris, listes et épisodes vus restent sur cet
          appareil.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParams(input.trim() ? { q: input.trim() } : {});
          }}
        >
          <Search size={20} />
          <input
            aria-label="Rechercher un anime"
            placeholder="Rechercher un anime…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit">Rechercher</button>
        </form>
      </header>
      <div className="local-section-title">
        <h2>{q ? "Résultats pour « " + q + " »" : "Les incontournables"}</h2>
        <span>
          {getProvider().id === "nartya"
            ? "Catalogue public · Jikan / MyAnimeList"
            : getProvider().label}
        </span>
      </div>
      {result.loading ? (
        <Busy />
      ) : result.error ? (
        <Failure error={result.error} retry={result.retry} />
      ) : (
        <>
          <>
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
    [viewed, setViewed] = useState({}),
    [playing, setPlaying] = useState(null);
  const episodes = useResource(
    () =>
      anime.slug.startsWith("mal-")
        ? publicEpisodes(anime.slug, page)
        : sourceGet(
            "/v1/anime/" +
              encodeURIComponent(anime.slug) +
              "/seasons/" +
              encodeURIComponent(season) +
              "/episodes",
          ),
    [anime.slug, season, page],
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
          language: "vostfr",
          title: anime.title,
          cover: anime.cover,
          userId: LOCAL_USER.id,
        });
      setViewed(await getAnimeProgressMap(anime.slug));
    } catch {
      toast.error("La sauvegarde locale a échoué.");
    }
  };
  const play = async (ep) => {
    try {
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
      setPlaying({ url, ep });
    } catch (e) {
      toast.error(e.message);
    }
  };
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
      {anime.slug.startsWith("mal-") && (
        <p className="local-notice">
          Le catalogue public fournit les informations et la liste des épisodes.
          Il ne fournit pas de flux vidéo. Vous pouvez marquer les épisodes vus
          ; une source publique compatible peut être configurée dans les
          réglages.
        </p>
      )}
      {playing && (
        <Suspense fallback={<Busy />}>
          <Player
            url={playing.url}
            anime={anime}
            season={season}
            episode={playing.ep.episode}
            onClose={() => setPlaying(null)}
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
                  <button onClick={() => play(ep)}>Lire</button>
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
                provider.trim()
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
          <input
            aria-label="API publique compatible"
            placeholder="https://votre-source.example"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
          <button>Enregistrer la source</button>
        </form>
      </div>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
export default function App() {
  useEffect(() => {
    useListsStore.getState().ensureLoaded();
    useFavoritesStore.getState().ensureLoaded();
  }, []);
  return (
    <div className="local-app">
      <header className="local-topbar">
        <Link to="/" className="local-brand">
          animer<span>夜</span>
        </Link>
        <span className="local-save-indicator">● Sauvegarde locale</span>
      </header>
      <nav className="local-nav" aria-label="Navigation principale">
        {nav.map(([path, label, Icon]) => (
          <NavLink key={path} to={path} end={path === "/"}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="local-main">
        <Suspense fallback={<Busy />}>
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/search" element={<Catalog />} />
            <Route path="/anime/:slug" element={<Anime />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/history" element={<HistoryPage />} />
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
