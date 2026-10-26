import { useCallback, useEffect, useRef, useState } from "react";
import VideoPlayer from "../components/player/VideoPlayer";
import { saveEpisodeProgress, getEpisodeProgress } from "../api/progress";
import { LOCAL_USER } from "./database";

function NartyaMedia({
  url,
  anime,
  season,
  episode,
  format,
  language,
  languages,
  sources,
  sourceId,
  onSourceChange,
  onLanguageChange,
  onNext,
  hasNext,
}) {
  const [resume, setResume] = useState(null),
    [error, setError] = useState("");
  const api = useRef(null),
    last = useRef({ time: 0, duration: 0 }),
    savedAt = useRef(0),
    mounted = useRef(true);
  const save = useCallback(
    (time, duration) => {
      if (!(time > 0 && Number.isFinite(duration) && duration > 0)) return;
      last.current = { time, duration };
      void saveEpisodeProgress({
        slug: anime.slug,
        seasonId: season,
        episodeNumber: episode,
        language,
        positionSeconds: time,
        duration,
        title: anime.title,
        cover: anime.cover,
        userId: LOCAL_USER.id,
      }).catch(() => {
        if (mounted.current) setError("La sauvegarde locale a échoué.");
      });
    },
    [anime.slug, anime.title, anime.cover, season, episode, language],
  );
  const checkpoint = useCallback(() => {
    const time = api.current?.getCurrentTime() || last.current.time,
      duration = api.current?.getDuration() || last.current.duration;
    save(time, duration);
  }, [save]);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    getEpisodeProgress(anime.slug, season, episode, language, LOCAL_USER.id)
      .then((progress) => {
        if (!cancelled)
          setResume(
            progress && !progress.completed ? progress.positionSeconds || 0 : 0,
          );
      })
      .catch(() => {
        if (!cancelled) setResume(0);
      });
    window.addEventListener("pagehide", checkpoint);
    const hide = () => {
      if (document.hidden) checkpoint();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelled = true;
      mounted.current = false;
      checkpoint();
      window.removeEventListener("pagehide", checkpoint);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [anime.slug, season, episode, language, checkpoint]);
  const playerApi = useCallback(
    (value) => {
      if (!value) checkpoint();
      api.current = value;
    },
    [checkpoint],
  );
  return (
    <>
      <div className="nartya-local-stage" aria-label="Lecteur Nartya">
        {resume === null ? (
          <p role="status">Préparation du lecteur…</p>
        ) : (
          <VideoPlayer
            videoUrl={url}
            mediaFormat={format}
            mediaKey={[anime.slug, season, episode, language, url].join("|")}
            title={`${anime.title} — Épisode ${episode}`}
            poster={anime.cover || ""}
            resumeAt={resume}
            episodeLabel={`Épisode ${episode}`}
            language={language}
            languages={languages}
            sources={sources}
            sourceId={sourceId}
            sourceControls={true}
            provider={sourceId}
            showEpisodes={false}
            showNav={hasNext}
            hasNext={hasNext}
            onNext={onNext}
            onSourceChange={onSourceChange}
            onLanguageChange={onLanguageChange}
            onPlayerApi={playerApi}
            onTimeUpdate={(time, duration) => {
              last.current = { time, duration };
              if (Date.now() - savedAt.current >= 5000) {
                savedAt.current = Date.now();
                save(time, duration);
              }
            }}
            onPause={save}
            onSeek={save}
            onEnded={checkpoint}
            onError={() =>
              setError(
                "Cette source ne peut pas être lue. Choisissez un autre lecteur dans les réglages de lecture ou dans la fiche.",
              )
            }
          />
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export default function Player({
  url,
  anime,
  season,
  episode,
  kind,
  format,
  language = "vostfr",
  languages = [],
  sources = [],
  sourceId = "auto",
  onSourceChange,
  onLanguageChange,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  onClose,
}) {
  const section = useRef(null);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      section.current?.scrollIntoView({ block: "center", behavior: "auto" }),
    );
    return () => cancelAnimationFrame(id);
  }, [url, episode, language]);
  const direct =
    kind === "video" ||
    format === "hls" ||
    /[?&]kind=hls(?:&|$)/.test(url) ||
    /\.(mp4|webm|m3u8)(?:[?#]|$)/i.test(url);
  return (
    <section ref={section} className="local-player">
      <header className="local-player-heading">
        <div>
          <small>{direct ? "LECTEUR NARTYA" : "LECTEUR DU FOURNISSEUR"}</small>
          <h2>Épisode {episode}</h2>
        </div>
        <button onClick={onClose}>Fermer le lecteur</button>
      </header>
      {direct ? (
        <NartyaMedia
          key={[url, anime.slug, season, episode, language, format].join("|")}
          {...{
            url,
            anime,
            season,
            episode,
            format,
            language,
            languages,
            sources,
            sourceId,
            onSourceChange,
            onLanguageChange,
            onNext,
            hasNext,
          }}
        />
      ) : (
        <>
          <iframe
            src={url}
            title={"Épisode " + episode}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin"
          />
          <p>
            Ce fournisseur ne fournit pas de flux compatible avec le lecteur
            Nartya. La progression du lecteur externe se marque manuellement.
          </p>
        </>
      )}
      {(hasPrev || hasNext) && (
        <nav
          className="local-player-episodes"
          aria-label="Navigation entre épisodes"
        >
          <button disabled={!hasPrev} onClick={onPrev}>
            Épisode précédent
          </button>
          <button disabled={!hasNext} onClick={onNext}>
            Épisode suivant
          </button>
        </nav>
      )}
    </section>
  );
}
