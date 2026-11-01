import { useCallback, useEffect, useRef, useState } from 'react';
import VideoPlayer from '../components/player/VideoPlayer';
import { moviesRequest, movieMediaUrl } from './api';
import { getMovieProgress, saveMovieProgress } from './library';

export default function MovieVideo({ item, season, episode, hasNext, onNext }) {
  const [result, setResult] = useState({ loading: true }), [attempt, setAttempt] = useState(0);
  const [sourceId, setSourceId] = useState(''), [captionId, setCaptionId] = useState(''), [ready, setReady] = useState(false), [error, setError] = useState('');
  const api = useRef(null), last = useRef({ time: 0, duration: 0 }), savedAt = useRef(0);
  const initial = useRef(getMovieProgress(item, season, episode));
  const resume = useRef(initial.current && initial.current.time < initial.current.duration * .95 ? initial.current.time : 0);
  const save = useCallback((time, duration) => {
    if (!Number.isFinite(duration) || duration <= 0) return;
    last.current = { time, duration };
    try { saveMovieProgress(item, season, episode, time, duration); } catch { setError('La position de lecture n’a pas pu être enregistrée sur cet appareil.'); }
  }, [item, season, episode]);
  const checkpoint = useCallback(() => save(api.current?.getCurrentTime() ?? last.current.time, api.current?.getDuration() || last.current.duration), [save]);
  useEffect(() => {
    const controller = new AbortController(), timer = setTimeout(() => { controller.abort(); setResult({ error: 'La recherche du flux a pris trop de temps. Réessaie dans un instant.' }); }, 90000);
    setResult({ loading: true }); setReady(false); setError('');
    const params = new URLSearchParams({ type: item.type, id: item.id, season, episode });
    moviesRequest('/resolve?' + params, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (data.kind !== 'video' || !data.sources?.length) throw new Error('Aucun flux vidéo disponible.');
      const sources = data.sources.filter(s => ['hls','video'].includes(s.format)).map(s => ({ ...s, url: movieMediaUrl(s.url) }));
      if (!sources.length) throw new Error('Aucun flux vidéo compatible.');
      const captions = (data.captions || []).map(s => ({ ...s, url: movieMediaUrl(s.url) }));
      setResult({ sources, captions });
      setSourceId(sources.some(s => s.id === data.selectedId) ? data.selectedId : sources[0].id);
      const french = captions.findIndex(c => /french|fran[çc]ais/i.test(c.label));
      setCaptionId(french >= 0 ? String(french) : '');
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ error: error.message });
    }).finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, [item.type, item.id, season, episode, attempt]);
  useEffect(() => {
    window.addEventListener('pagehide', checkpoint);
    const visibility = () => { if (document.hidden) checkpoint(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { checkpoint(); window.removeEventListener('pagehide', checkpoint); document.removeEventListener('visibilitychange', visibility); };
  }, [checkpoint]);
  const setApi = useCallback(value => { if (!value) checkpoint(); api.current = value; setReady(!!value); }, [checkpoint]);
  useEffect(() => {
    if (ready) api.current?.setSubtitle(captionId === '' ? null : result.captions?.[Number(captionId)]);
  }, [ready, captionId, result.captions]);
  const source = result.sources?.find(s => s.id === sourceId);
  const retry = () => { checkpoint(); resume.current = last.current.time || resume.current; setAttempt(n => n + 1); };
  if (result.loading) return <div className="mv-stream-state" role="status"><span className="mv-stream-spinner" /><h3>Préparation de la vidéo…</h3><p>Recherche d’un flux HLS ou MP4 disponible.</p></div>;
  if (result.error) return <div className="mv-stream-state" role="alert"><h3>La vidéo n’est pas disponible.</h3><p>{result.error}</p><button onClick={retry}>Réessayer</button></div>;
  return <>
    <div className="mv-stream-stage">{source && <VideoPlayer videoUrl={source.url} mediaFormat={source.format} mediaKey={`${item.key}:${season}:${episode}:${sourceId}`} title={item.title} poster={item.backdrop || item.cover || ''} episodeLabel={item.type === 'tv' ? `Saison ${season} · Épisode ${episode}` : item.title} resumeAt={resume.current} showEpisodes={false} showNav={hasNext} hasNext={hasNext} onNext={onNext} onPlayerApi={setApi} onTimeUpdate={(time,duration) => { last.current = { time, duration }; if (Date.now() - savedAt.current > 5000) { savedAt.current = Date.now(); save(time,duration); } }} onPause={save} onSeek={save} onEnded={checkpoint} onError={() => setError('Ce flux ne répond plus. Essaie une autre source ou actualise les liens.')} />}</div>
    <div className="mv-stream-tools"><label>Source vidéo<select aria-label="Source vidéo Movies" value={sourceId} onChange={e => { checkpoint(); resume.current = last.current.time; setError(''); setSourceId(e.target.value); }}>{result.sources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>{result.captions?.length > 0 && <label>Sous-titres<select aria-label="Sous-titres Movies" value={captionId} onChange={e => setCaptionId(e.target.value)}><option value="">Désactivés</option>{result.captions.map((c,i) => <option key={i} value={i}>{c.label}</option>)}</select></label>}<button onClick={retry}>Actualiser les flux</button></div>
    {error && <p className="mv-error" role="alert">{error}</p>}
  </>;
}
