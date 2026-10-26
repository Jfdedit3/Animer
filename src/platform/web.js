import {callbackUrl,loginPath,isExpectedAuthCallback,permitsSession} from '../web/urls.js';
import {streamResolveEndpoint,WEB_RELAY} from '../config/webHosting.js';
import {resolveStaticPlayback} from '../web/staticPlayback.js';
const noop = () => {};
const authRedirect=()=>callbackUrl(window.location.origin,import.meta.env.BASE_URL);

export const webPlatform = {
  name: "web",
  os: null,
  isMobile: false,
  isDesktop: false,
  getMachineId: async () => null,
  resolveStream: async ({token,apiBaseUrl,forceRefresh=false}) => {
    const endpoint=streamResolveEndpoint();
    const target=new URL(apiBaseUrl,window.location.origin),localApi=target.origin===window.location.origin&&target.pathname==='/api';
    if(!localApi&&!permitsSession(apiBaseUrl,{relay:WEB_RELAY}))return {success:false,error:'Ce fournisseur doit proposer un relais vidéo compatible avec le navigateur.'};
    const {supabase}=await import('../lib/supabase.js');
    const {data}=await supabase.auth.getSession();
    if(!endpoint)return resolveStaticPlayback({token,apiBaseUrl,accessToken:data.session?.access_token||'',appOrigin:window.location.origin});
    try{
      const res=await fetch(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',...(data.session?.access_token?{Authorization:`Bearer ${data.session.access_token}`}:{})},body:JSON.stringify({token,forceRefresh}),signal:AbortSignal.timeout(25000)});
      const result=await res.json();return res.ok&&result.url?{...result,url:new URL(result.url,new URL(endpoint,window.location.origin)).href}:res.ok?result:{success:false,error:result.error||'La source vidéo est indisponible.'};
    }catch{return {success:false,error:'Le relais vidéo ne répond pas. Réessayez ou choisissez une autre source.'};}
  },
  downloads: null,
  session: null,
  cast: null,
  hub: null,
  discord: null,
  openExternal: (url) => window.open(url, "_blank", "noopener,noreferrer"),
  async openAuth(url) {
    window.location.assign(url);
    return { opened: true };
  },
  getAuthRedirectUrl: async ({kind='oauth'}={}) => {
    const pending={kind,at:Date.now()};sessionStorage.setItem('animer:oauth:pending',String(pending.at));
    if(kind==='email')localStorage.setItem('animer:email:pending',JSON.stringify(pending));
    return authRedirect();
  },
  onAuthCallback: (callback) => {
    const url=new URL(window.location.href),at=Number(sessionStorage.getItem('animer:oauth:pending'));
    let pending=at;try{if(!at)pending=JSON.parse(localStorage.getItem('animer:email:pending'));}catch{/* Ignore invalid metadata. */}
    if(!isExpectedAuthCallback(url.href,authRedirect(),pending))return noop;
    sessionStorage.removeItem('animer:oauth:pending');
    localStorage.removeItem('animer:email:pending');
    history.replaceState(null,'',loginPath(import.meta.env.BASE_URL));
    queueMicrotask(()=>callback(url.href));return noop;
  },
  onNavigate: () => noop,
  getVersion: async () => null,
  installUpdate: async ({ url } = {}) => {
    window.open(url, "_blank", "noopener,noreferrer");
    return { opened: true };
  },
  setOrientation: noop,
  setBrightness: noop,
  getVolume: async () => null,
  setVolume: noop,
  captureVolumeButtons: noop,
  onVolumeChange: () => noop,
  nativePip: null,
  haptic: () => navigator.vibrate?.(10),
  share: async (data) => {
    if (!navigator.share) return false;
    await navigator.share(data);
    return true;
  },
  canOpenNewWindow: false,
  openNewWindow: noop,
  quit: noop,
  focusWindow: noop,
};
