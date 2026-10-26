const SHELL='animer-shell-v1';
const CORE=['/','/manifest.webmanifest','/icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('animer-shell-')&&key!==SHELL).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/')||req.headers.has('range')||req.destination==='video'||req.destination==='audio'||url.search)return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(SHELL).then(c=>c.put('/',copy)));}return response;}).catch(async()=>await caches.match('/')||new Response('Animer est hors ligne. Reconnectez-vous pour charger le catalogue.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})));return;
 }
 if(!['script','style','font'].includes(req.destination))return;
 event.respondWith(caches.open(SHELL).then(async cache=>{const cached=await cache.match(req);if(cached)return cached;const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}));
});
