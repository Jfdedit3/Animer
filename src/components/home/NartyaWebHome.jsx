import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Play, Compass, Heart, History, Library } from 'lucide-react';
import HeroCarousel from './HeroCarousel';
import selection from '../catalog/selection.json';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getWatchHistory } from '../../api/history';
import { listFavorites } from '../../api/favorites';

function Poster({ item }) {
  return <Link className="nartya-poster-card" to={'/anime/' + encodeURIComponent(item.slug)}><div><img src={item.cover || item.image} alt="" loading="lazy" /><span className="nartya-poster-play" aria-hidden="true"><Play size={24} fill="currentColor" /></span>{item.source && <small>{item.source}</small>}</div><h3>{item.title}</h3><p>{item.year || 'Anime'}{item.episodes ? ` · ${item.episodes} épisodes` : ''}</p></Link>;
}
function Row({ title, items, href, label }) {
  const ref = useRef(null);
  if (!items.length) return null;
  const scroll = direction => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * .8, behavior: document.documentElement.classList.contains('reduce-motion') ? 'instant' : 'smooth' });
  return <section className="nartya-anime-row" aria-label={title}><header><div>{label && <p>{label}</p>}<h2>{title}</h2></div><div>{href && <Link to={href}>Tout voir <ArrowRight size={15} /></Link>}<button aria-label={`Défiler vers la gauche : ${title}`} onClick={() => scroll(-1)}><ChevronLeft size={18} /></button><button aria-label={`Défiler vers la droite : ${title}`} onClick={() => scroll(1)}><ChevronRight size={18} /></button></div></header><div className="nartya-row-track" ref={ref}>{items.map(item => <Poster item={item} key={item.slug} />)}</div></section>;
}
export default function NartyaWebHome({ result }) {
  const reducedMotion = useSettingsStore(s => s.reduceMotion);
  const [history, setHistory] = useState([]), [favorites, setFavorites] = useState([]);
  useEffect(() => { let active = true; Promise.allSettled([getWatchHistory(), listFavorites()]).then(([recent, saved]) => { if (!active) return; if (recent.status === 'fulfilled') setHistory(recent.value); if (saved.status === 'fulfilled') setFavorites(saved.value.map(row => ({ slug: row.anime_slug, title: row.anime_title || row.title || row.anime_slug, cover: row.anime_cover || row.cover }))); }); return () => { active = false; }; }, []);
  const hero = selection.items.map(item => ({ ...item, id: item.slug, description: 'À découvrir dans la sélection Animer. Retrouve les saisons et les épisodes sur sa fiche.' }));
  const items = result.data?.items || [];
  return <div className="nartya-home">
    <HeroCarousel items={hero} autoplay={!reducedMotion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches} />
    <div className="nartya-home-body">
      <div className="nartya-shortcuts"><Link to="/search"><Compass size={22} /><span><strong>Explorer</strong><small>Tout le catalogue</small></span><ArrowRight size={17} /></Link><Link to="/favorites"><Heart size={22} /><span><strong>Mes favoris</strong><small>Les anime que tu aimes</small></span><ArrowRight size={17} /></Link><Link to="/history"><History size={22} /><span><strong>Reprendre</strong><small>Ton historique local</small></span><ArrowRight size={17} /></Link></div>
      {history.length > 0 && <section className="nartya-continue"><header><h2>Continuer à regarder</h2><Link to="/history">Historique <ArrowRight size={15} /></Link></header><div>{history.slice(0, 8).map(item => <Link to={'/anime/' + encodeURIComponent(item.slug)} key={item.slug}><img src={item.cover} alt="" /><span><strong>{item.title}</strong><small>Épisode {item.episodeNumber} · {item.language?.toUpperCase()}</small><progress aria-label={`Progression de ${item.title}`} max="100" value={item.progressPercent} /></span><Play size={20} /></Link>)}</div></section>}
      <Row title="À découvrir" label="LA SÉLECTION ANIMER" items={items.length ? items.slice(0, 12) : hero} href="/search" />
      <Row title="Tes favoris" label="TA BIBLIOTHÈQUE" items={favorites} href="/favorites" />
      {result.loading && <p className="nartya-home-notice" role="status">Chargement du catalogue…</p>}
      {result.error && <div className="nartya-home-notice" role="alert"><p>{result.error}</p><button onClick={result.retry}>Réessayer le catalogue</button></div>}
      {(result.data?.snapshot || result.data?.fallback) && <p className="nartya-home-notice">Sélection enregistrée affichée : le catalogue en direct est temporairement indisponible. Les fiches et la lecture nécessitent une connexion à la source.</p>}
      <Row title="Explorer le catalogue" items={items.slice(12, 30)} href="/search" />
      <Link className="nartya-library-banner" to="/lists"><Library size={31} /><span><strong>Ta prochaine histoire commence ici.</strong><small>Retrouve tes listes, tes envies et ta progression sur cet appareil.</small></span><ArrowRight size={22} /></Link>
    </div>
  </div>;
}
