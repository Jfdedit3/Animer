import {safeProviderUrl} from './urls.js';
export async function resolveStaticPlayback({token,apiBaseUrl,accessToken='',appOrigin=''},fetcher=fetch){
 const api=new URL(apiBaseUrl);
 if(api.origin!=='https://anime.nartya.app'||api.pathname!=='/')return {success:false,error:'Ce fournisseur nécessite un relais vidéo compatible.'};
 if(typeof token!=='string'||!token||token.length>12000)return {success:false,error:'Jeton de source invalide.'};
 const headers=accessToken?{Authorization:`Bearer ${accessToken}`}:{},options={headers,credentials:'omit',signal:AbortSignal.timeout(15000)};
 try{
  const res=await fetcher(`${api.origin}/v1/streams/${encodeURIComponent(token)}`,options);
  if(!res.ok)return {success:false,error:res.status===401?'Connectez-vous pour lancer la lecture.':res.status===410?'Lien expiré : rechargez les épisodes.':'La source vidéo est indisponible.'};
  const source=(await res.json()).data;
  const url=safeProviderUrl(source?.url,{appOrigin});
  if(/\.(mp4|webm|m3u8)(?:[?#]|$)/i.test(url))return {success:true,url,kind:'video'};
  const recipeRes=await fetcher(`${api.origin}/v1/sources/recipe`,options);
  if(!recipeRes.ok)return {success:false,error:'La configuration des lecteurs est indisponible.'};
  const recipe=(await recipeRes.json()).data;
  const domains=Object.values(recipe?.sources||{}).flatMap(s=>Array.isArray(s.domains)?s.domains:[]);
  return {success:true,url:safeProviderUrl(url,{domains,appOrigin}),kind:'embed'};
 }catch{return {success:false,error:'Le lecteur ne peut pas être chargé depuis ce navigateur. Essayez une autre source ou configurez un relais.'};}
}
