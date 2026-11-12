import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Home, Heart, List, History, Settings, Compass, Library, ChevronDown, ShieldCheck, PanelLeftClose, Moon, Download } from 'lucide-react';

const groups = [
  { name: 'Parcourir', Icon: Compass, items: [['/', 'Accueil', Home], ['/search', 'Recherche', Search]] },
  { name: 'Bibliothèque', Icon: Library, items: [['/favorites', 'Favoris', Heart], ['/lists', 'Mes listes', List], ['/history', 'Historique', History]] },
];
export default function NartyaWebLayout({ children, favoriteCount }) {
  const [rail, setRail] = useState(false), [drawer, setDrawer] = useState(false), [query, setQuery] = useState('');
  const [closed, setClosed] = useState({});
  const sidebar = useRef(null);
  const { pathname } = useLocation(), navigate = useNavigate();
  useEffect(() => { setDrawer(false); setClosed(current => ({ ...current, [groups.find(group => group.items.some(([path]) => path === pathname))?.name]: false })); }, [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector('.nartya-drawer-close')?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawer(false); }
      if (event.key === 'Tab') {
        const nodes = [...sidebar.current.querySelectorAll('a,button')].filter(node => node.getClientRects().length);
        if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [drawer]);
  const item = ([path, label, Icon]) => <NavLink to={path} end={path === '/'} key={path} title={rail ? label : undefined} aria-label={label}><Icon size={18} aria-hidden="true" /><span>{label}</span>{path === '/favorites' && favoriteCount > 0 && <b>{favoriteCount}</b>}</NavLink>;
  return <div className={`nartya-web${rail ? ' nartya-rail' : ''}${drawer ? ' nartya-drawer-open' : ''}`} data-interface="nartya">
    <a className="local-skip" href="#contenu" onClick={event => { event.preventDefault(); document.getElementById('contenu')?.focus(); }}>Aller au contenu</a>
    <header className="nartya-topbar">
      <button className="nartya-mobile-menu" aria-label="Ouvrir le menu" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu size={22} /></button>
      <Link to="/" className="nartya-wordmark"><Moon size={27} fill="currentColor" /><span>animer<i>.</i></span></Link>
      <form className="nartya-header-search" role="search" onSubmit={event => { event.preventDefault(); navigate('/search' + (query.trim() ? '?q=' + encodeURIComponent(query.trim()) : '')); }}><Search size={17} /><input aria-label="Rechercher dans le catalogue" placeholder="Rechercher un anime…" value={query} onChange={event => setQuery(event.target.value)} /><button type="submit" aria-label="Lancer la recherche">Entrée ↵</button></form>
      <Link to="/search" className="nartya-mobile-search" aria-label="Rechercher un anime"><Search size={21} /></Link>
      <Link to="/favorites" className="nartya-top-library"><Heart size={17} /><span>Ma collection</span></Link>
    </header>
    {drawer && <button className="nartya-drawer-backdrop" aria-label="Fermer le menu" onClick={() => setDrawer(false)} />}
    <aside ref={sidebar} className="nartya-sidebar" aria-label="Menu Nartya Anime" role={drawer ? 'dialog' : undefined} aria-modal={drawer ? true : undefined}>
      <div className="nartya-sidebar-heading"><span>ANIME</span><button className="nartya-rail-toggle" aria-label={rail ? 'Déplier la navigation' : 'Replier la navigation'} onClick={() => setRail(value => !value)}><PanelLeftClose size={18} /></button><button className="nartya-drawer-close" aria-label="Fermer le menu" onClick={() => setDrawer(false)}><X size={22} /></button></div>
      <nav aria-label="Navigation principale">
        {groups.map(({ name, Icon, items }) => <section className="nartya-nav-group" key={name}><button aria-expanded={!closed[name]} onClick={() => { if (rail) setRail(false); setClosed(current => ({ ...current, [name]: !current[name] })); }} title={name}><Icon size={18} /><span>{name}</span><ChevronDown size={14} /></button>{!closed[name] && <div>{items.map(item)}</div>}</section>)}
        <div className="nartya-settings-link">{item(['/downloads', 'Application Linux', Download])}{item(['/settings', 'Réglages', Settings])}</div>
      </nav>
      <Link to="/lists" className="nartya-local-profile"><ShieldCheck size={21} /><span><strong>Ma bibliothèque</strong><small>Sur cet appareil</small></span></Link>
    </aside>
    <main className="nartya-content" id="contenu" tabIndex={-1}>{children}</main>
    <nav className="nartya-mobile-tabs" aria-label="Navigation mobile">{[['/', 'Accueil', Home], ['/search', 'Recherche', Search], ['/favorites', 'Favoris', Heart], ['/lists', 'Bibliothèque', Library], ['/settings', 'Réglages', Settings]].map(item)}</nav>
  </div>;
}
