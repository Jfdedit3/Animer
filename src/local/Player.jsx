import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { saveEpisodeProgress, getEpisodeProgress } from "../api/progress";
import { LOCAL_USER } from "./database";
export default function Player({ url, anime, season, episode, onClose }) {
  const ref = useRef(),
    [error, setError] = useState("");
  const direct = /\.(mp4|webm|m3u8)(?:[?#]|$)/i.test(url);
  useEffect(() => {
    if (!direct) return;
    const video = ref.current;
    let hls,
      cancelled = false,
      last = 0;
    const save = () => {
      if (video.currentTime > 0 && video.duration > 0)
        void saveEpisodeProgress({
          slug: anime.slug,
          seasonId: season,
          episodeNumber: episode,
          language: "vostfr",
          positionSeconds: video.currentTime,
          duration: video.duration,
          title: anime.title,
          cover: anime.cover,
          userId: LOCAL_USER.id,
        }).catch(() => setError("La sauvegarde locale a échoué."));
    };
    const tick = () => {
      if (Date.now() - last > 5000) {
        last = Date.now();
        save();
      }
    };
    const ready = async () => {
      const progress = await getEpisodeProgress(
        anime.slug,
        season,
        episode,
        "vostfr",
        LOCAL_USER.id,
      );
      if (
        !cancelled &&
        progress &&
        !progress.completed &&
        progress.positionSeconds > 0
      )
        video.currentTime = progress.positionSeconds;
    };
    if (
      /\.m3u8(?:[?#]|$)/i.test(url) &&
      !video.canPlayType("application/vnd.apple.mpegurl") &&
      Hls.isSupported()
    ) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, e) => {
        if (e.fatal)
          setError(
            "Cette source ne peut pas être lue. Vérifiez son accès et les autorisations CORS.",
          );
      });
    } else video.src = url;
    video.addEventListener("loadedmetadata", ready);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("pause", save);
    video.addEventListener("ended", save);
    window.addEventListener("pagehide", save);
    return () => {
      cancelled = true;
      save();
      video.removeEventListener("loadedmetadata", ready);
      video.removeEventListener("timeupdate", tick);
      video.removeEventListener("pause", save);
      video.removeEventListener("ended", save);
      window.removeEventListener("pagehide", save);
      hls?.destroy();
    };
  }, [url, anime.slug, season, episode, direct]);
  return (
    <section className="local-player">
      <div>
        <h2>Épisode {episode}</h2>
        <button onClick={onClose}>Fermer le lecteur</button>
      </div>
      {direct ? (
        <video
          ref={ref}
          controls
          playsInline
          onError={() =>
            setError(
              "La source vidéo est indisponible ou refuse la lecture dans ce navigateur.",
            )
          }
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
            Lecteur externe : la progression ne peut pas être mesurée. Marquez
            l’épisode vu manuellement.
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
