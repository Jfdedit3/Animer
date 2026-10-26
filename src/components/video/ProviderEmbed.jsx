import {useState} from 'react';
import {ArrowLeft,SkipBack,SkipForward,RefreshCw} from 'lucide-react';
export default function ProviderEmbed({url,title,sources=[],sourceId,onSourceChange,onBack,onPrev,onNext,hasPrev,hasNext}){
 const [retry,setRetry]=useState(0);
 return <section className="provider-embed">
  <header><button onClick={onBack} aria-label="Retour à la fiche"><ArrowLeft size={20}/></button><h1>{title}</h1><button aria-label="Recharger le lecteur" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={18}/></button></header>
  <iframe key={url+':'+retry} src={url} title={title} sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="origin"/>
  <footer><div className="provider-controls"><button disabled={!hasPrev} onClick={onPrev}><SkipBack size={17}/>Précédent</button>{sources.length>1&&<label>Source<select aria-label="Source du lecteur intégré" value={sourceId} onChange={e=>onSourceChange(e.target.value)}>{sources.map(source=><option key={source.id} value={source.id}>{source.label}</option>)}</select></label>}<button disabled={!hasNext} onClick={onNext}>Suivant<SkipForward size={17}/></button></div><p>Lecteur du fournisseur. Si cette source est bloquée, choisissez-en une autre. Anime4K et la reprise automatique nécessitent le lecteur Animer avec un relais.</p></footer>
 </section>;
}
