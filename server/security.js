const encoder=new TextEncoder(),decoder=new TextDecoder();
export function publicHttps(value){
 const url=new URL(value);const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!host.includes('.')||host.includes(':')||/^[\d.]+$/.test(host)||host.endsWith('.')||/(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(host))throw new Error('Adresse de source non autorisée.');
 return url;
}
export function inDomains(host,domains=[]){return domains.some(domain=>typeof domain==='string'&&(host===domain.toLowerCase()||host.endsWith('.'+domain.toLowerCase())));}
export function base64url(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
function fromBase64(value){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function cryptoKey(secret){if(!secret||typeof secret!=='string')throw new Error('Le relais vidéo doit être configuré.');const bytes=fromBase64(secret);if(bytes.length!==32)throw new Error('Configuration du relais vidéo invalide.');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}
export async function sealTicket(payload,secret){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('animer-media-v1')},await cryptoKey(secret),encoder.encode(JSON.stringify(payload)));const all=new Uint8Array(12+cipher.byteLength);all.set(iv);all.set(new Uint8Array(cipher),12);return base64url(all);}
export async function openTicket(ticket,secret,now=Date.now()){
 if(typeof ticket!=='string'||ticket.length>16000)throw new Error('Lien invalide.');
 const all=fromBase64(ticket);if(all.length<30)throw new Error('Lien invalide.');
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12),additionalData:encoder.encode('animer-media-v1')},await cryptoKey(secret),all.slice(12));
 const result=JSON.parse(decoder.decode(bytes));if(!Number.isFinite(result.exp)||result.exp<now||result.exp>now+4*3600000)throw new Error('Lien expiré. Rechargez cet épisode.');publicHttps(result.url);return result;
}
export async function checkedFetch(url,options={},fetcher=fetch){
 let next=publicHttps(url).href;
 for(let i=0;i<5;i++){
  const response=await fetcher(next,{...options,redirect:'manual',signal:options.signal||AbortSignal.timeout(20000)});
  if(![301,302,303,307,308].includes(response.status))return {response,url:next};
  const location=response.headers.get('Location');await response.body?.cancel();if(!location)throw new Error('Redirection de source invalide.');
  next=publicHttps(new URL(location,next)).href;
 }
 throw new Error('Trop de redirections de source.');
}
export async function boundedText(response,max=2000000){
 if(Number(response.headers.get('Content-Length'))>max)throw new Error('Réponse de source trop volumineuse.');
 const reader=response.body?.getReader();if(!reader)return '';const chunks=[];let count=0;
 while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>max){await reader.cancel();throw new Error('Réponse de source trop volumineuse.');}chunks.push(value);}
 const data=new Uint8Array(count);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return decoder.decode(data);
}
