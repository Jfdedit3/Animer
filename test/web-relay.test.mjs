import test from 'node:test';
import assert from 'node:assert/strict';
import {publicHttps,sealTicket,openTicket,checkedFetch} from '../server/security.js';
import {handleApi,rewritePlaylist,mediaHeaders} from '../server/router.js';
const secret=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const env={STREAM_SIGNING_KEY:secret};
test('media tickets conceal destinations, reject edits, expiry and a different signing key',async()=>{
 const payload={url:'https://media.example.com/stream.m3u8?private=secret',exp:Date.now()+60000};
 const ticket=await sealTicket(payload,secret);assert.ok(!ticket.includes('media.example.com'));assert.deepEqual(await openTicket(ticket,secret),payload);
 await assert.rejects(openTicket(ticket.slice(0,-3)+'xxx',secret));await assert.rejects(openTicket(ticket,btoa('x'.repeat(32))));await assert.rejects(openTicket(ticket,secret,Date.now()+120000));
});
test('source addresses reject local networks, credentials, unsafe schemes and redirects to them',async()=>{
 for(const value of ['http://media.example.com','https://127.0.0.1/a','https://[::1]/a','https://localhost/a','https://metadata.internal/a','https://10.0.0.1/a','https://user:secret@media.example.com/a','https://0x7f000001/a'])assert.throws(()=>publicHttps(value));
 await assert.rejects(checkedFetch('https://media.example.com',{},async()=>new Response(null,{status:302,headers:{Location:'http://169.254.169.254/latest/meta-data'}})));
});
test('HLS rewriting covers variants, AES keys, initialization maps and relative media segments',async()=>{
 const payload={url:'https://cdn.example.com/a/master.m3u8',referer:'https://embed.example.com/e/one',exp:Date.now()+60000};
 const text='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXT-X-MAP:URI="init.mp4"\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nsub/playlist.m3u8\n#EXTINF:5,\nhttps://cdn.example.com/media/one.ts';
 const rewritten=await rewritePlaylist(text,payload.url,payload,secret);assert.ok(!rewritten.includes('cdn.example.com'));const urls=[...rewritten.matchAll(/\/api\/media\?t=([^"\s]+)/g)];assert.equal(urls.length,4);
 const decoded=await Promise.all(urls.map(m=>openTicket(decodeURIComponent(m[1]),secret)));assert.deepEqual(decoded.map(x=>x.url),['https://cdn.example.com/a/key.bin','https://cdn.example.com/a/init.mp4','https://cdn.example.com/a/sub/playlist.m3u8','https://cdn.example.com/media/one.ts']);
});
test('range streaming passes 206 and 416 without forwarding the Nartya bearer to the CDN',async()=>{
 const ticket=await sealTicket({url:'https://cdn.example.com/movie.mp4',referer:'https://embed.example.com/a',exp:Date.now()+60000},secret);
 const request=new Request('https://animer.example.com/api/media?t='+ticket,{headers:{Range:'bytes=3-5',Authorization:'Bearer PRIVATE'}});let headers;
 const response=await handleApi(request,env,async(_url,options)=>{headers=options.headers;return new Response(new Uint8Array([3,4,5]),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 3-5/10','Content-Length':'3','Accept-Ranges':'bytes'}});});
 assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 3-5/10');assert.equal(headers.Authorization,undefined);assert.equal(headers.Range,'bytes=3-5');assert.equal((await response.arrayBuffer()).byteLength,3);
 const invalid=await handleApi(request,env,async()=>new Response(null,{status:416,headers:{'Content-Range':'bytes */10'}}));assert.equal(invalid.status,416);assert.equal(invalid.headers.get('Content-Range'),'bytes */10');
});
test('catalogue proxy pins the upstream, propagates authorization and server errors',async()=>{
 let requested,headers;
 const response=await handleApi(new Request('https://animer.example.com/api/v1/anime/search?q=test',{headers:{Authorization:'Bearer fixture.token'}}),env,async(url,options)=>{requested=url;headers=options.headers;return new Response('{"error":"account required"}',{status:401,headers:{'Content-Type':'application/json'}});});
 assert.equal(requested,'https://anime.nartya.app/v1/anime/search?q=test');assert.equal(headers.Authorization,'Bearer fixture.token');assert.equal(response.status,401);
 assert.equal((await handleApi(new Request('https://animer.example.com/api/web/resolve',{method:'POST',headers:{Origin:'https://other.example.com'},body:'{}'}),env)).status,403);
 assert.equal((await handleApi(new Request('https://animer.example.com/api/media?url=https://example.com'),env)).status,403);
});
test('a stream is issued only after a successful upstream exchange; keys never enter responses',async()=>{
 const request=new Request('https://animer.example.com/api/web/resolve',{method:'POST',headers:{Authorization:'Bearer fixture.token','Content-Type':'application/json',Origin:'https://animer.example.com'},body:JSON.stringify({token:'opaque'})});
 const response=await handleApi(request,env,async url=>new Response(JSON.stringify({data:url.includes('/streams/')?{url:'https://cdn.example.com/master.m3u8'}:{sources:{}}}),{headers:{'Content-Type':'application/json'}}));
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.success,true);assert.match(data.url,/^\/api\/media\?t=.*&kind=hls$/);assert.ok(!JSON.stringify(data).includes(secret));
 const missing=await handleApi(new Request(request.url,{method:'POST',body:JSON.stringify({token:'opaque'})}),{});assert.equal(missing.status,503);
});
test('embed resolution uses recipe domains and does not send account credentials to the provider',async()=>{
 const requests=[];
 const fake=async(url,options)=>{
  requests.push({url,headers:options.headers});
  if(url.includes('/streams/'))return Response.json({data:{url:'https://embed.example.com/e/one',provider:'s1'}});
  if(url.includes('/recipe'))return Response.json({data:{sources:{s1:{domains:['embed.example.com'],strategy:'jw-sources',headers:{'User-Agent':'Fixture'}}}}});
  if(url==='https://embed.example.com/e/one')return new Response('player.setup({sources:[{file:"https://cdn.example.com/master.m3u8"}]})');
  throw new Error('Unexpected request');
 };
 const response=await handleApi(new Request('https://animer.example.com/api/web/resolve',{method:'POST',headers:{Authorization:'Bearer fixture.token'},body:JSON.stringify({token:'opaque'})}),env,fake);
 assert.equal(response.status,200);const result=await response.json(),payload=await openTicket(new URL(result.url,'https://animer.example.com').searchParams.get('t'),secret);
 assert.equal(payload.url,'https://cdn.example.com/master.m3u8');assert.equal(requests.at(-1).headers.Authorization,undefined);
 assert.equal(requests[0].headers.Authorization,'Bearer fixture.token');
});

test('provider transport keeps its user agent and drops embed referers when the recipe requires it',()=>{
 const headers=mediaHeaders({url:'https://cdn.example.com/video.mp4',referer:'https://embed.example.com/e',transport:{userAgent:'Fixture player',dropRefererOffHost:true,hostMatch:'embed.example.com'}},'bytes=0-10');
 assert.equal(headers['User-Agent'],'Fixture player');assert.equal(headers.Referer,undefined);assert.equal(headers.Origin,undefined);assert.equal(headers.Range,'bytes=0-10');
});
