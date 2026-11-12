import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalogue,parseAnime,parseEpisodes,parseInlineEpisodes,animeSamaEpisodes,extractPublicVideo,handleAnimeSama,resetAnimeSamaCache,animeSamaStream} from '../server/animesama.js';
import {openTicket} from '../server/security.js';
const detail=`<h1 id="titreOeuvre">L’elfe &amp; le voyage</h1><meta property="og:image" content="https://images.example.com/cover.jpg"><p id="synopsisText">Synopsis français.</p><script>/* panneauAnime('nom','saison1/vostfr'); */ panneauAnime('Saison 1','saison1/vostfr'); panneauAnime('Saison 1','saison1/vf'); panneauAnime('Saison 2','saison2/vostfr');</script>`;
const episodes=`var eps1=['https://player.example.com/embed/first', '', 'https://player.example.com/embed/third']; var eps2=['https://other.example.com/embed/first']; globalThis.notExecuted=true;`;
const key=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
test('Anime-Sama catalogue excludes scans, decodes titles, deduplicates seasons and detects next pages',()=>{
 const html=`<div class="as-carte" data-url="/catalogue/voyage/" data-nom="Voyage &amp; magie"><span class="as-badge-anime">Anime</span><div class="as-carte-image"><img src="https://images.example.com/a.jpg"></div></div><div class="as-carte" data-url="/catalogue/scan/" data-nom="Scan"><span class="as-badge-scan">Scans</span></div><a href="?page=2">Suivant</a>`;
 const result=parseCatalogue(html);assert.equal(result.items.length,1);assert.equal(result.items[0].title,'Voyage & magie');assert.equal(result.items[0].slug,'as-voyage');assert.equal(result.hasNext,true);
});
test('Anime-Sama seasons read literal calls without executing scripts or treating comments as seasons',()=>{
 const a=parseAnime(detail,'voyage');assert.equal(a.title,'L’elfe & le voyage');assert.deepEqual(a.seasons,[{id:'saison1',name:'Saison 1',languages:['vostfr','vf']},{id:'saison2',name:'Saison 2',languages:['vostfr']}]);assert.equal(globalThis.notExecuted,undefined);
});
test('episode arrays preserve gaps and source numbers and reject non-public URLs without executing code',()=>{
 const result=parseEpisodes(episodes);assert.equal(result.count,3);assert.equal(result.sources[0].urls[1],null);assert.equal(result.sources[1].id,'eps2');assert.equal(globalThis.notExecuted,undefined);
 const bad=parseEpisodes("var eps1=['http://127.0.0.1/secret','https://user:pass@player.example.com/file'];");assert.deepEqual(bad.sources[0].urls,[null,null]);
});
test('current BDD scripts expose inline readers without executing player or injected code',()=>{
 const html=`<script>var eps9=['https://ads.example.com/unrelated'];</script><script data-source="bdd">${episodes}</script><script>eval('throw new Error("must not run")');</script>`;
 const data=parseInlineEpisodes(html);
 assert.equal(data.count,3);assert.deepEqual(data.sources.map(source=>source.id),['eps1','eps2']);
 assert.equal(data.sources[0].urls[1],null);assert.equal(globalThis.notExecuted,undefined);
 assert.equal(parseInlineEpisodes('<script data-source="bdd">var eps1 = makePrivateRequest();</script>'),null);
 assert.equal(parseInlineEpisodes('<script>/* var eps1=["https://ads.example.com/comment"] */</script>'),null);
});
test('episode and stream routes use current inline lists without requesting the removed episodes.js',async()=>{
 resetAnimeSamaCache();const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.startsWith('https://anime-sama.to/'))return new Response(`<script data-source="bdd">${episodes}</script>`);
  return new Response('<video src="https://cdn.example.com/movie.mp4"></video>');
 };
 const list=await animeSamaEpisodes('voyage','saison1','vostfr',fetcher);
 assert.equal(list.totalEpisodes,3);assert.deepEqual(list.episodes[0].readers.map(reader=>reader.id),['eps1','eps2']);assert.equal(list.episodes[1].readers.length,0);
 const stream=await animeSamaStream({slug:'voyage',season:'saison1',lang:'vostfr',episode:3,reader:'eps1'},{STREAM_SIGNING_KEY:key},fetcher);
 assert.equal(stream.kind,'video');assert.ok(calls.some(call=>call.url==='https://player.example.com/embed/third'));
 assert.equal(calls.filter(call=>call.url.startsWith('https://anime-sama.to/')).length,1);
 assert.ok(calls.every(call=>!call.url.includes('episodes.js')));
});
test('legacy episode file paths resolve only inside the requested season and source origin',async()=>{
 for(const src of ['episodes.js?filever=123','./episodes.js?v=1','/catalogue/voyage/saison1/vostfr/episodes.js?v=2']){
  resetAnimeSamaCache();const calls=[];
  const data=await animeSamaEpisodes('voyage','saison1','vostfr',async url=>{calls.push(url);return new Response(url.includes('episodes.js')?episodes:`<script src="${src}"></script>`);});
  assert.equal(data.totalEpisodes,3);assert.equal(calls.length,2);assert.match(calls[1],/^https:\/\/anime-sama\.to\/catalogue\/voyage\/saison1\/vostfr\/episodes\.js\?/);
 }
 for(const src of ['https://other.example.com/episodes.js','../episodes.js','/other/episodes.js']){
  resetAnimeSamaCache();let count=0;
  await assert.rejects(()=>animeSamaEpisodes('voyage','saison1','vostfr',async()=>{count++;return new Response(`<script src="${src}"></script>`);}));assert.equal(count,1);
 }
});
test('opaque episode references resolve only the selected source using its public page token',async()=>{
 resetAnimeSamaCache();const calls=[],token='public.page-token-fixture';
 const fetcher=async(url,options)=>{
  calls.push({url,options});const u=new URL(url);
  if(u.pathname==='/api/lien.php'){
   assert.equal(u.searchParams.get('j'),token);assert.equal(u.searchParams.get('l'),'24');
   assert.equal(options.headers.Referer,'https://anime-sama.to/catalogue/voyage/saison1/vostfr/');
   return Response.json({u:'https://player.example.com/chosen'});
  }
  if(u.hostname==='anime-sama.to')return new Response(`<script data-source="bdd">var eps1=['lien:23','lien:24'];var eps2=['lien:25'];var epsJeton='${token}';</script>`);
  assert.equal(url,'https://player.example.com/chosen');return new Response('<video src="https://cdn.example.com/video.mp4"></video>');
 };
 const list=await animeSamaEpisodes('voyage','saison1','vostfr',fetcher);assert.equal(list.episodes[0].readers.length,2);assert.equal(JSON.stringify(list).includes(token),false);
 assert.equal(calls.length,1);
 const stream=await animeSamaStream({slug:'voyage',season:'saison1',lang:'vostfr',episode:2,reader:'eps1'},{STREAM_SIGNING_KEY:key},fetcher);
 assert.equal(stream.kind,'video');assert.equal(calls.filter(call=>call.url.includes('/api/lien.php')).length,1);
 assert.ok(calls.every(call=>!call.options.headers.Cookie&&!call.options.headers.Authorization));
});
test('opaque references cannot inject requests and resolved non-public addresses are rejected',async()=>{
 assert.deepEqual(parseEpisodes("var eps1=['lien:0','lien:../../api','lien:1?j=other','lien:42'];").sources[0].urls,[null,null,null,'lien:42']);
 resetAnimeSamaCache();let calls=0;
 await assert.rejects(()=>animeSamaStream({slug:'voyage',season:'saison1',lang:'vostfr',episode:1},{STREAM_SIGNING_KEY:key},async url=>{
  calls++;return url.includes('/api/lien.php')?Response.json({u:'http://127.0.0.1/private'}):new Response('<script data-source="bdd">var eps1=["lien:42"];var epsJeton="public.token";</script>');
 }));assert.equal(calls,2);
});
test('video extraction uses public player source attributes and JW files, without accepting scripts as URLs',()=>{
 assert.equal(extractPublicVideo('<video><source src="https://cdn.example.com/a.mp4?x=1&amp;y=2"></video>','https://player.example.com/'),'https://cdn.example.com/a.mp4?x=1&y=2');
 assert.equal(extractPublicVideo("player.setup({sources:[{file:'https://cdn.example.com/a.m3u8'}]});",'https://player.example.com/'),'https://cdn.example.com/a.m3u8');
 assert.equal(extractPublicVideo('<video src="javascript:alert(1)"></video>','https://player.example.com/'),null);
});
function fetcher(calls,blocked=false){return async(url,options)=>{
 calls.push({url,headers:options.headers});
 if(url.includes('anime-sama.to'))return new Response(url.includes('episodes.js')?episodes:'<script src="episodes.js?filever=123"></script><div class="ct-langues"><a href="../vostfr">VOSTFR</a><a href="../vf">VF</a></div>');
 return blocked?new Response('Denied',{status:403}):new Response('<video src="https://cdn.example.com/episode.mp4"></video>');
};}
test('stream resolution revalidates episode coordinates, signs only API-listed public media, and never forwards credentials',async()=>{
 resetAnimeSamaCache();const calls=[];
 const value=await animeSamaStream({slug:'voyage',season:'saison1',lang:'vostfr',episode:1,reader:'eps1'},{STREAM_SIGNING_KEY:key},fetcher(calls));
 assert.equal(value.kind,'video');const payload=await openTicket(new URL(value.url,'https://relay.example.com').searchParams.get('t'),key);assert.equal(payload.url,'https://cdn.example.com/episode.mp4');
 assert.ok(calls.every(c=>!Object.keys(c.headers||{}).some(k=>['authorization','cookie'].includes(k.toLowerCase()))));
 assert.match(calls[1].url,/episodes.js\?filever=123$/);
 await assert.rejects(()=>animeSamaStream({slug:'../secret',season:'saison1',lang:'vostfr',episode:1},{},fetcher(calls)));
 await assert.rejects(()=>animeSamaStream({slug:'voyage',season:'saison1',lang:'vostfr',episode:2,reader:'eps1'},{},fetcher(calls)));
});
test('a blocked host falls back to its public sandboxed player; arbitrary URL proxy requests are rejected',async()=>{
 resetAnimeSamaCache();const value=await animeSamaStream({slug:'voyage',season:'saison1',lang:'vostfr',episode:1,reader:'eps1'},{STREAM_SIGNING_KEY:key},fetcher([],true));assert.equal(value.kind,'embed');assert.equal(value.url,'https://player.example.com/embed/first');
 const res=await handleAnimeSama(new Request('https://relay.example.com/api/animesama/proxy?url=https://evil.example.com'));assert.equal(res.status,404);
});
