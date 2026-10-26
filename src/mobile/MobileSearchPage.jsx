import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Search,SlidersHorizontal,X,Loader2} from "lucide-react";
import {searchCatalog,getAnimePage} from "@/api/animeApi";
import {getOrFetch} from "@/hooks/useCachedResource";
import {MAIN_GENRES} from "@/utils/genres";
import {normalizeFilters,filterCatalogBatch} from "@/utils/catalogFilters";
import AnimeCard from "@/components/home/AnimeCard";

export default function MobileSearchPage(){
 const [params,setParams]=useSearchParams();const key=params.toString();const filters=useMemo(()=>normalizeFilters(new URLSearchParams(key)),[key]);
 const [term,setTerm]=useState(filters.query),[open,setOpen]=useState(false),[rows,setRows]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false),[unknown,setUnknown]=useState(0);const generation=useRef(0),page=useRef(1),failedPage=useRef(1),seen=useRef(new Set());
 const update=useCallback((name,value)=>{const p=new URLSearchParams(key);if(value)p.set(name,value);else p.delete(name);setParams(p,{replace:true});},[key,setParams]);
 useEffect(()=>{setTerm(filters.query);},[filters.query]);
 useEffect(()=>{if(term.trim()===filters.query)return;const t=setTimeout(()=>update("q",term.trim()),320);return()=>clearTimeout(t);},[term,filters.query,update]);
 const load=useCallback(async(p,token,reset=false)=>{
  failedPage.current=p;setLoading(true);setError("");
  try{
   const raw=await searchCatalog({search:filters.query,genres:filters.genre?[filters.genre]:[],type:filters.type,lang:filters.language,page:p});
   if(token!==generation.current)return;
   const batch=Array.isArray(raw)?raw:[];let enriched=batch,unavailableYears=0;
   if(filters.year){
    enriched=[];
    for(let i=0;i<batch.length;i+=3){
     if(token!==generation.current)return;
     const chunk=await Promise.all(batch.slice(i,i+3).map(async row=>{
      if(row.year)return row;
      try{const info=await getOrFetch(`search-year:${row.slug}`,()=>getAnimePage(row.slug),24*60*60*1000);return {...row,year:info?.anilist?.year||info?.year||null};}catch{return {...row,year:null};}
     }));enriched.push(...chunk);
    }
    unavailableYears=enriched.filter(r=>!r.year).length;
   }
   if(token!==generation.current)return;
   const filtered=filterCatalogBatch(enriched,filters).filter(r=>r.slug&&!seen.current.has(r.slug));filtered.forEach(r=>seen.current.add(r.slug));
   setRows(old=>reset?filtered:[...old,...filtered]);setUnknown(n=>reset?unavailableYears:n+unavailableYears);setDone(batch.length===0);page.current=p;
  }catch(e){if(token===generation.current)setError(e.message||"La recherche est indisponible.");}
  finally{if(token===generation.current)setLoading(false);}
 },[filters]);
 useEffect(()=>{const token=++generation.current;seen.current=new Set();page.current=1;setRows([]);setUnknown(0);setDone(false);void load(1,token,true);return()=>{if(generation.current===token)generation.current=token+1;};},[load]);
 const years=Array.from({length:70},(_,i)=>new Date().getFullYear()+1-i);
 return <div className="yoru-search yoru-route-enter"><div className="yoru-search-head"><div className="yoru-search-input"><Search size={19} className="text-muted"/><input aria-label="Rechercher un anime" placeholder="Titre, aventure, nouveau coup de cœur…" value={term} onChange={e=>setTerm(e.target.value)} autoCapitalize="none" autoComplete="off"/>{term&&<button className="yoru-icon-button" onClick={()=>{setTerm("");update("q","");}} aria-label="Effacer la recherche"><X size={17}/></button>}<button className="yoru-icon-button" onClick={()=>setOpen(v=>!v)} aria-label="Filtres de recherche" aria-expanded={open}><SlidersHorizontal size={19}/></button></div><div className="yoru-search-chipbar">{[["","Toutes les langues"],["vostfr","VOSTFR"],["vf","VF"]].map(([v,l])=><button key={l} aria-pressed={filters.language===v} onClick={()=>update("lang",v)}>{l}</button>)}<button aria-pressed={filters.available} onClick={()=>update("available",filters.available?"":"1")}>Avec épisodes</button></div>{open&&<div className="glass-panel yoru-search-filters"><label className="yoru-filter-label">Genre<select className="yoru-select" aria-label="Genre" value={filters.genre} onChange={e=>update("genre",e.target.value)}><option value="">Tous les genres</option>{MAIN_GENRES.map(g=><option key={g} value={g}>{g}</option>)}</select></label><label className="yoru-filter-label">Format<select className="yoru-select" aria-label="Format" value={filters.type} onChange={e=>update("type",e.target.value)}><option value="">Tous</option><option value="Anime">Série</option><option value="Film">Film</option><option value="Autres">Autres</option></select></label><label className="yoru-filter-label">Année<select className="yoru-select" aria-label="Année" value={filters.year||""} onChange={e=>update("year",e.target.value)}><option value="">Toutes les années</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><button className="yoru-small-button self-end" onClick={()=>{setTerm("");setParams({},{replace:true});}}>Réinitialiser</button><p className="col-span-2 text-xs text-muted">L’année utilise les métadonnées des fiches et peut demander un chargement supplémentaire. La disponibilité du flux est vérifiée au lancement.</p></div>}</div><div className="mb-4 flex items-center justify-between"><h1 className="section-title">{filters.query?"Vos résultats":"Explorer le catalogue"}</h1><span className="text-xs text-muted">{rows.length} affiché(s)</span></div>{unknown>0&&<p className="mb-3 text-xs text-muted">{unknown} fiche(s) sans année renseignée exclue(s) du filtre.</p>}<div className="yoru-search-results">{rows.map(row=><div key={row.slug} className="yoru-carousel-card"><AnimeCard anime={{...row,id:row.id||row.slug,cover:row.cover||row.image}} titleLines={2}/><p className="mt-1 text-xs text-muted">{row.year?`${row.year} · `:""}{Number(row.episodeCount??row.episodes)>0?`${row.episodeCount??row.episodes} épisodes`:"Épisodes non renseignés"}</p></div>)}</div>{loading&&<p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted"><Loader2 className="animate-spin" size={18}/>{filters.year?"Vérification des années…":"Recherche…"}</p>}{error&&<div role="alert" className="glass-panel mt-4 p-4"><p className="text-sm">{error}</p><button className="yoru-small-button mt-3" onClick={()=>load(failedPage.current,generation.current,failedPage.current===1)}>Réessayer</button></div>}{!loading&&!error&&!rows.length&&<p className="py-8 text-sm text-muted">Aucun résultat dans les pages chargées pour ces critères.</p>}{!loading&&!error&&!done&&<button className="yoru-small-button mt-5 w-full" onClick={()=>load(page.current+1,generation.current)}>Charger les résultats suivants</button>}</div>;
}
