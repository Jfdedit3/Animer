const DB="yoru-artwork-v1", STORE="images", LIMIT=40*1024*1024, MAX=120;
let connection;
function db() {
  if(typeof indexedDB === "undefined") return Promise.reject(new Error("Cache indisponible"));
  if(!connection) connection=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"url"});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{connection=null;reject(r.error);};});
  return connection;
}
async function transaction(mode,work) {
 const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,mode);const req=work(t.objectStore(STORE));t.oncomplete=()=>resolve(req?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
}
export async function getCachedArtwork(url) {try{return (await transaction("readonly",s=>s.get(url)))?.blob || null;}catch{return null;}}
const pending=new Map();
export function cacheArtwork(url) {
 if(!url || !/^https?:/.test(url)) return Promise.resolve();
 if(pending.has(url))return pending.get(url);
 const promise=(async()=>{
  if(await getCachedArtwork(url))return;
  try{
   const response=await fetch(url,{cache:"force-cache",credentials:"omit",signal:AbortSignal.timeout(12000)});
   if(!response.ok)return;
   const blob=await response.blob();if(!blob.type.startsWith("image/")||blob.size>4*1024*1024)return;
   await transaction("readwrite",s=>s.put({url,blob,size:blob.size,at:Date.now()}));
   const rows=await transaction("readonly",s=>s.getAll());let size=rows.reduce((n,r)=>n+r.size,0),count=rows.length;
   for(const row of rows.sort((a,b)=>a.at-b.at)){if(size<=LIMIT&&count<=MAX)break;await transaction("readwrite",s=>s.delete(row.url));size-=row.size;count--;}
  }catch{/* Images without CORS remain readable via the normal img element. */}
 })().finally(()=>pending.delete(url));pending.set(url,promise);return promise;
}
export async function clearArtworkCache(){await Promise.allSettled([...pending.values()]);await transaction("readwrite",s=>s.clear());}
export async function artworkCacheStats(){try{const rows=await transaction("readonly",s=>s.getAll());return {count:rows.length,bytes:rows.reduce((n,r)=>n+r.size,0)};}catch{return {count:0,bytes:0};}}
