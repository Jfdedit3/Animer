import {handleApi} from '../server/router.js';
// Filled by scripts/build-worker.mjs; source contains no media or session credentials.
const assets=__ANIMER_ASSETS__;
const TYPES={html:'text/html;charset=utf-8',js:'text/javascript;charset=utf-8',css:'text/css;charset=utf-8',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml',gif:'image/gif',ttf:'font/ttf',ico:'image/x-icon',txt:'text/plain;charset=utf-8',md:'text/plain;charset=utf-8'};
const CSP="default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https:; worker-src 'self' blob:; frame-src https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return handleApi(request,env);
  if(!['GET','HEAD'].includes(request.method))return new Response('Méthode non autorisée',{status:405});
  if(url.pathname.startsWith('/profile-art/')){
   if(!/^\/profile-art\/(?:grand-line|kurotsuki|raijin)\/(?:avatar-frame|banner-background|banner-overlay)\.png$/.test(url.pathname))return new Response('Introuvable',{status:404});
   return Response.redirect(`https://raw.githubusercontent.com/Jfdedit3/Animer/main/public${url.pathname}`,302);
  }
  let pathname=url.pathname==='/'||url.pathname.replace(/\/$/,'')==='/auth/callback'?'/index.html':url.pathname;
  const file=assets[pathname];
  if(!file)return new Response('Page introuvable',{status:404,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  const body=Uint8Array.from(atob(file),c=>c.charCodeAt(0)),extension=pathname.split('.').at(-1);
  const headers=new Headers({'Content-Type':TYPES[extension]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});
  headers.set('Cache-Control',pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache');
  if(extension==='html')headers.set('Content-Security-Policy',CSP);
  if(pathname==='/sw.js')headers.set('Service-Worker-Allowed','/');
  return new Response(request.method==='HEAD'?null:body,{headers});
 }
};
