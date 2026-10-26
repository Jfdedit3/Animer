import {useEffect} from "react";
import {Link} from "react-router-dom";
import {BellRing,ChevronRight} from "lucide-react";
import {usePlanningStore} from "@/stores/usePlanningStore";
import {useNotifyStore} from "@/stores/useNotifyStore";
import {useFollowedReleases} from "@/hooks/useFollowedReleases";
import CachedImage from "@/components/ui/CachedImage";
export default function FollowedReleases(){
 const load=usePlanningStore(s=>s.load),loading=usePlanningStore(s=>s.loading),error=usePlanningStore(s=>s.error);const followed=useNotifyStore(s=>s.slugs);const releases=useFollowedReleases();
 useEffect(()=>{if(followed.size)void load();},[load,followed]);
 const items=releases.filter(r=>r.at==null||r.at>=Date.now()-24*60*60*1000).slice(0,8);
 return <section className="px-4 sm:px-8"><div className="mb-3 flex items-center justify-between"><h2 className="section-title">Vos prochains rendez-vous</h2><Link to="/planning" aria-label="Voir le calendrier" className="yoru-icon-button"><ChevronRight size={20}/></Link></div>{!followed.size?<div className="glass-panel flex items-center gap-3 p-4"><BellRing className="shrink-0 text-primary" size={24}/><p className="text-sm text-muted">Activez la cloche sur une fiche pour retrouver ses prochaines sorties ici.</p></div>:loading&&!items.length?<p role="status" className="text-sm text-muted">Chargement des sorties…</p>:error&&!items.length?<button className="yoru-small-button" onClick={()=>load(true)}>Réessayer le calendrier</button>:!items.length?<p className="text-sm text-muted">Aucune sortie annoncée pour vos animes suivis.</p>:<div className="yoru-release-row">{items.map((r,i)=><Link key={`${r.slug}-${r.season}-${i}`} to={`/anime/${r.slug}?season=${encodeURIComponent(r.season||"")}`} className="glass-panel yoru-release-card">{r.image&&<CachedImage src={r.image} alt="" loading="lazy"/>}<span className="min-w-0"><span className="yoru-eyebrow">{r.dayName} · {r.time||"Horaire à confirmer"}</span><strong className="block truncate">{r.title}</strong><span className="text-xs text-muted">{(r.langs||[]).map(s=>s.toUpperCase()).join(" · ")}</span></span></Link>)}</div>}</section>;
}
