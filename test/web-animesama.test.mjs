import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalogue,parseAnime,parseEpisodes,extractPublicVideo,handleAnimeSama,resetAnimeSamaCache,animeSamaStream} from '../server/animesama.js';
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
