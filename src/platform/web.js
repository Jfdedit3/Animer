const noop = () => {};

export const webPlatform = {
  name: "web",
  os: null,
  isMobile: false,
  isDesktop: false,
  getMachineId: async () => null,
  resolveStream: async ({token,apiBaseUrl,forceRefresh=false}) => {
    const {supabase}=await import('../lib/supabase.js');
    const {data}=await supabase.auth.getSession();
    const local=new URL(apiBaseUrl,window.location.origin).origin===window.location.origin;
    if(!local)return {success:false,error:'Ce fournisseur doit proposer une résolution vidéo compatible avec le navigateur.'};
    try{
      const res=await fetch('/api/web/resolve',{method:'POST',headers:{'Content-Type':'application/json',...(data.session?.access_token?{Authorization:`Bearer ${data.session.access_token}`}:{})},body:JSON.stringify({token,forceRefresh}),signal:AbortSignal.timeout(25000)});
      const result=await res.json();return res.ok?result:{success:false,error:result.error||'La source vidéo est indisponible.'};
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
  getAuthRedirectUrl: async () => {sessionStorage.setItem('animer:oauth:pending',String(Date.now()));return `${window.location.origin}/auth/callback`;},
  onAuthCallback: (callback) => {
    const url=new URL(window.location.href),at=Number(sessionStorage.getItem('animer:oauth:pending'));
    if(url.pathname!=='/auth/callback'||!(url.searchParams.has('code')||url.searchParams.has('error'))||!at||Date.now()-at>15*60000||at>Date.now()+5000)return noop;
    sessionStorage.removeItem('animer:oauth:pending');
    history.replaceState(null,'','/#/login');
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
