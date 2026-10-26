import {useEffect,useState} from 'react';
import {Download,X} from 'lucide-react';
export default function WebInstall(){
 const [prompt,setPrompt]=useState(null);
 useEffect(()=>{const offer=e=>{e.preventDefault();setPrompt(e);};const done=()=>setPrompt(null);window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',done);return()=>{window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',done);};},[]);
 if(!prompt)return null;
 return <aside className="animer-install glass-panel" aria-label="Installer Animer"><button onClick={async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null);}}><Download size={17}/> Installer Animer</button><button aria-label="Masquer l’installation" onClick={()=>setPrompt(null)}><X size={17}/></button></aside>;
}
