import {handleAnimeSama} from './animesama.js';
import {publicHttps,inDomains,sealTicket,openTicket,checkedFetch,boundedText} from './security.js';
import {setRecipe} from '../src/shared/sourceRecipe.js';
import {extractFromHtml,isExtractedVideoUrlConsistentWithEmbed} from '../src/shared/videoExtract.js';

const DEFAULT_UPSTREAM='https://anime.nartya.app';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const error=(message,status=502)=>json({success:false,error:message},status);
function authHeaders(request){const value=request.headers.get('Authorization');return value&&/^Bearer [\w.\-]+$/.test(value)?{Authorization:value}:{};}
function upstreamBase(env){const u=publicHttps(env.UPSTREAM_API_URL||DEFAULT_UPSTREAM);return u.href.replace(/\/$/,'');}
function sameOrigin(request,env={}){const origin=request.headers.get('Origin');return !origin||origin===new URL(request.url).origin||(env.ALLOWED_WEB_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin);}
export function mediaHeaders(payload,range){
 const headers={'Accept-Encoding':'identity'};
 if(payload.transport?.userAgent)headers['User-Agent']=payload.transport.userAgent;
 if(payload.transport?.language)headers['Accept-Language']=payload.transport.language;
 if(payload.referer){headers.Referer=payload.referer;headers.Origin=new URL(payload.referer).origin;}
 const rules=payload.transport;
 if(rules?.dropRefererOffHost&&rules.hostMatch){const target=new URL(payload.url);if(target.hostname.includes(rules.hostMatch)){headers.Referer=target.origin+'/';headers.Origin=target.origin;}else{delete headers.Referer;delete headers.Origin;}}
 if(rules?.mp4Referer?.pattern&&rules.mp4Referer.template){try{const match=payload.url.match(new RegExp(rules.mp4Referer.pattern));if(match){const ref=rules.mp4Referer.template.replace(/\{(\d+)\}/g,(_,i)=>match[Number(i)]||'');headers.Referer=publicHttps(ref).href;}}catch{/* Ignore an invalid provider rule. */}}
 if(range&&/^bytes=\d*-\d*$/.test(range))headers.Range=range;
 return headers;
}
async function mediaLink(payload,secret){return '/api/media?t='+encodeURIComponent(await sealTicket(payload,secret));}

export async function rewritePlaylist(text,base,payload,secret){
 if(!text.trimStart().startsWith('#EXTM3U'))throw new Error('Playlist HLS invalide.');
 const lines=text.split(/\r?\n/),out=[];
 const rewrite=async uri=>{
  if(uri.startsWith('data:'))return uri;
  const target=publicHttps(new URL(uri,base)).href;
  // Playback URLs are encrypted capabilities, never a caller-supplied proxy target.
  return await mediaLink({...payload,url:target},secret);
 };
 for(const line of lines){
  if(!line.trim()){out.push(line);continue;}
  if(!line.startsWith('#')){out.push(await rewrite(line.trim()));continue;}
  const matches=[...line.matchAll(/URI="([^"]+)"/g)];let changed=line;
  for(const match of matches)changed=changed.replace(match[0],`URI="${await rewrite(match[1])}"`);
  out.push(changed);
 }
 return out.join('\n');
}

async function resolve(request,env,fetcher){
 if(request.method!=='POST')return error('Méthode non autorisée.',405);
 if(!sameOrigin(request,env))return error('Origine non autorisée.',403);
 if(Number(request.headers.get('Content-Length'))>20000)return error('Requête trop volumineuse.',413);
 let body;try{const text=await boundedText(request,20000);if(text.length>20000)return error('Requête trop volumineuse.',413);body=JSON.parse(text);}catch{return error('Requête invalide.',400);}
 if(typeof body.token!=='string'||!body.token||body.token.length>12000)return error('Jeton de source invalide.',400);
 if(!env.STREAM_SIGNING_KEY)return error('Le relais vidéo n’est pas encore configuré.',503);
 const base=upstreamBase(env),headers=authHeaders(request);
 // Authorization is attached only to the configured API, never to a media host.
 const [sourceRes,recipeRes]=await Promise.all([fetcher(`${base}/v1/streams/${encodeURIComponent(body.token)}`,{headers,redirect:'error',signal:AbortSignal.timeout(12000)}),fetcher(`${base}/v1/sources/recipe`,{headers,redirect:'error',signal:AbortSignal.timeout(12000)})]);
 if(!sourceRes.ok){const messages={401:'Connectez-vous pour lancer la lecture.',403:'Ce compte ou ce site n’est pas autorisé à accéder à la source.',410:'Lien expiré : rechargez les épisodes.',429:'Trop de demandes de lecture. Patientez un instant.'};return error(messages[sourceRes.status]||'La source vidéo est indisponible.',sourceRes.status);}
 const source=(await sourceRes.json()).data;
 if(!source?.url)return error('Source vidéo introuvable.',404);
 let media=publicHttps(source.url).href,referer=null,transport=null;
 if(!/\.(m3u8|mp4|webm)(?:[?#]|$)/i.test(media)){
  if(!recipeRes.ok)return error('La configuration des sources est indisponible.',503);
  const recipe=(await recipeRes.json()).data;if(!recipe?.sources||typeof recipe.sources!=='object')return error('La configuration des sources est invalide.',503);
  const entry=recipe.sources[source.provider]||Object.values(recipe.sources).find(s=>inDomains(new URL(media).hostname,s.domains));
  if(!entry||!inDomains(new URL(media).hostname,entry.domains))return error('Hébergeur non autorisé.',403);
  const embed=new URL(media);
  if(entry.canonicalHost&&entry.hostMatch&&embed.hostname.includes(entry.hostMatch)&&!embed.hostname.endsWith(entry.canonicalHost)){embed.hostname=entry.canonicalHost;if(!inDomains(embed.hostname,entry.domains))return error('Hôte canonique non autorisé.',403);}
  if(entry.embedQuery){const q=new URLSearchParams(entry.embedQuery);for(const [key,value] of q)if(!embed.searchParams.has(key))embed.searchParams.set(key,value);}
  referer=embed.href;
  const recipeHeaders=new Headers(entry.headers||{});
  transport={userAgent:recipeHeaders.get('User-Agent')||'',language:recipeHeaders.get('Accept-Language')||'',dropRefererOffHost:!!entry.dropRefererOffHost,hostMatch:entry.hostMatch||'',mp4Referer:entry.mp4Referer||null};
  const embedHeaders={...(entry.headers||{})};delete embedHeaders.Authorization;delete embedHeaders.authorization;delete embedHeaders.Cookie;delete embedHeaders.cookie;
  if(entry.refererFromEmbed){embedHeaders.Referer=embed.href;embedHeaders.Origin=embed.origin;}
  const loaded=await checkedFetch(embed.href,{headers:embedHeaders},fetcher);if(!loaded.response.ok)return error('L’hébergeur ne répond pas. Essayez une autre source.',502);
  const html=await boundedText(loaded.response);setRecipe(recipe);
  const extracted=extractFromHtml(html,referer,source.provider);
  if(!extracted.success||!extracted.videoUrl||!isExtractedVideoUrlConsistentWithEmbed(referer,extracted.videoUrl))return error('Aucun flux compatible trouvé pour cette source.',422);
  media=publicHttps(extracted.videoUrl).href;
 }
 const url=await mediaLink({url:media,referer,transport,exp:Date.now()+2*3600000},env.STREAM_SIGNING_KEY);
 return json({success:true,url:url+(/\.m3u8(?:[?#]|$)/i.test(media)?'&kind=hls':'')});
}

async function media(request,env,fetcher){
 if(!['GET','HEAD'].includes(request.method))return error('Méthode non autorisée.',405);
 let payload;try{payload=await openTicket(new URL(request.url).searchParams.get('t'),env.STREAM_SIGNING_KEY);}catch{return error('Lien de lecture invalide ou expiré. Rechargez cet épisode.',403);}
 const headers=mediaHeaders(payload,request.headers.get('Range'));
 const loaded=await checkedFetch(payload.url,{method:request.method,headers},fetcher),response=loaded.response;
 if(!response.ok&&response.status!==416){await response.body?.cancel();return error('Le flux vidéo est indisponible.',response.status>=400&&response.status<600?response.status:502);}
 const type=response.headers.get('Content-Type')||'';
 if(request.method==='GET'&&response.ok&&(/\.m3u8(?:[?#]|$)/i.test(loaded.url)||/mpegurl/i.test(type))){
  const playlist=await rewritePlaylist(await boundedText(response),loaded.url,payload,env.STREAM_SIGNING_KEY);
  return new Response(playlist,{headers:{'Content-Type':'application/vnd.apple.mpegurl','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
 }
 const out=new Headers({'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'});
 for(const name of ['Content-Type','Content-Length','Content-Range','Accept-Ranges','Content-Encoding'])if(response.headers.has(name))out.set(name,response.headers.get(name));
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:out});
}

async function routeApi(request,env={},fetcher=fetch){
 const url=new URL(request.url);
 try{
  if(url.pathname.startsWith('/api/animesama/'))return await handleAnimeSama(request,env,fetcher);
  if(url.pathname==='/api/web/health')return json({ok:true,app:'Animer',relayConfigured:!!env.STREAM_SIGNING_KEY});
  if(url.pathname==='/api/web/resolve')return await resolve(request,env,fetcher);
  if(url.pathname==='/api/media')return await media(request,env,fetcher);
  if(!url.pathname.startsWith('/api/'))return error('Route introuvable.',404);
  if(!['GET','POST','PATCH','DELETE'].includes(request.method))return error('Méthode non autorisée.',405);
  if(!sameOrigin(request,env)&&request.method!=='GET')return error('Origine non autorisée.',403);
  const route=url.pathname.slice(4);
  if(!route.startsWith('/v1/')&&route!=='/version-policy')return error('Route API introuvable.',404);
  if(route.includes('..')||route.includes('\\'))return error('Route invalide.',400);
  const base=upstreamBase(env),headers={...authHeaders(request),Accept:'application/json'};
  let body;
  if(request.method!=='GET'){body=await boundedText(request,1000000);if(body.length>1000000)return error('Requête trop volumineuse.',413);headers['Content-Type']='application/json';}
  const response=await fetcher(base+route+url.search,{method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(25000)});
  const output=new Headers({'Content-Type':response.headers.get('Content-Type')||'application/json','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'});
  if(response.headers.has('Retry-After'))output.set('Retry-After',response.headers.get('Retry-After'));
  return new Response(response.body,{status:response.status,headers:output});
 }catch{return error('Le service ne répond pas actuellement. Réessayez dans un instant.',502);}
}
export async function handleApi(request,env={},fetcher=fetch){
 const origin=request.headers.get('Origin');
 if(origin&&!sameOrigin(request,env))return error('Origine non autorisée.',403);
 if(request.method==='OPTIONS'){
  if(!origin)return error('Origine manquante.',400);
  const requested=(request.headers.get('Access-Control-Request-Headers')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(requested.some(x=>!['authorization','content-type','range'].includes(x)))return error('En-têtes non autorisés.',403);
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,HEAD,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type,Range','Access-Control-Max-Age':'600','Vary':'Origin'}});
 }
 const result=await routeApi(request,env,fetcher);
 if(origin){result.headers.set('Access-Control-Allow-Origin',origin);result.headers.set('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges,Retry-After');result.headers.append('Vary','Origin');}
 return result;
}
