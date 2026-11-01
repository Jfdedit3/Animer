import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { contentSignature, decodeMovieEnvelope, collectMovieSources } from '../server/movieStreams.js';
import { handleApi, subtitleToVtt } from '../server/router.js';
import { openTicket } from '../server/security.js';
import { MOVIES_KEY, saveMovieProgress, getMovieProgress, exportMovies, importMovies } from '../src/movies/library.js';

const hex = value => Buffer.from(value).toString('hex');
test('public source API envelope follows its browser wire format and rejects a corrupted tag', async () => {
  const primary='a'.repeat(64), secondary='b'.repeat(64), password='c'.repeat(64);
  const fields={tmdbId:'550',imdbId:'tt0137523',seasonId:'1',episodeId:'2'};
  const first=createHmac('sha256',primary).update('tmdbId:550|imdbId:tt0137523|seasonId:1|episodeId:2').digest('hex');
  assert.equal(await contentSignature(fields,primary,secondary),createHmac('sha256',secondary).update(first).digest('hex'));
  const salt=crypto.getRandomValues(new Uint8Array(32)), iv=crypto.getRandomValues(new Uint8Array(16));
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},material,{name:'AES-GCM',length:256},false,['encrypt']);
  const body={sources:{Main:{url:'https://media.example.com/master.m3u8',type:'hls'}}};
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,tagLength:128},key,new TextEncoder().encode(JSON.stringify(body))));
  const envelope={encrypted:true,data:{version:1,salt:hex(salt),cin:hex(iv),encrypted:hex(encrypted.slice(0,-16)),mao:hex(encrypted.slice(-16))}};
  assert.deepEqual(await decodeMovieEnvelope(envelope,password),body);
  envelope.data.mao=(envelope.data.mao.startsWith('00')?'01':'00')+envelope.data.mao.slice(2);
  await assert.rejects(decodeMovieEnvelope(envelope,password));
});
test('only public HLS and MP4 sources are offered; DASH and local addresses are excluded', () => {
  const sources=collectMovieSources({sources:{HLS:{url:'https://media.example.com/master.m3u8',type:'hls'},MP4:{type:'mp4',qualities:{720:{url:'https://media.example.com/video.mp4'}}},DASH:{url:'https://media.example.com/manifest.mpd',type:'dash'},Local:{url:'https://127.0.0.1/private.mp4',type:'mp4'}}},'fixture');
  assert.equal(sources.length,2);assert.deepEqual(sources.map(s=>s.format),['hls','video']);
});
test('Movies resolution returns encrypted relay links, never an iframe, and sends no user session upstream', async () => {
  const signingKey=Buffer.alloc(32,7).toString('base64'), calls=[];
  const fetcher=async(input,options={})=>{
    const url=new URL(input);calls.push({url,options});
    if(url.pathname==='/api/tmdb')return Response.json({id:99123457,title:'Fixture',imdb_id:'tt99123457',release_date:'2020-01-01'});
    if(url.pathname.startsWith('/watch/'))return new Response('<script src="/_next/static/chunks/app/(watch)/watch/%5Btype%5D/%5Bid%5D/page-f00.js"></script><script src="/_next/static/chunks/webpack-aaa.js"></script><script>{"scrapeToken":"123456789.public-fixture-token-for-tests"}</script>');
    if(url.pathname.includes('page-f00'))return new Response(`generateContentHash let e="${'a'.repeat(64)}",t="${'b'.repeat(64)}"`);
    if(url.pathname.includes('webpack-aaa'))return new Response('1712:"cafe"');
    if(url.pathname.includes('1712.cafe'))return new Response(`ENCRYPTION_KEY||"${'c'.repeat(64)}"`);
    if(url.pathname==='/api/relay/scrape')return Response.json(url.searchParams.get('scraper')==='mb2'?{sources:{}}:{sources:{Main:{url:'https://media.example.com/master.m3u8',type:'hls'}},captions:[{url:'https://media.example.com/fr.srt',label:'French'}]});
    if(url.hostname==='media.example.com')return new Response('#EXTM3U\n#EXTINF:4,\nsegment.ts\n',{headers:{'Content-Type':'application/vnd.apple.mpegurl'}});
    throw new Error('Unexpected request');
  };
  const result=await handleApi(new Request('https://relay.example.com/api/movies/resolve?type=movie&id=99123457',{headers:{Origin:'https://jfdedit3.github.io',Authorization:'Bearer fixture.jwt',Cookie:'private=fixture'}}),{STREAM_SIGNING_KEY:signingKey,ALLOWED_WEB_ORIGINS:'https://jfdedit3.github.io'},fetcher);
  assert.equal(result.status,200);const data=(await result.json()).data;
  assert.equal(data.kind,'video');assert.equal(data.sources[0].format,'hls');assert.ok(data.sources[0].url.startsWith('/api/media?t='));
  const ticket=new URL(data.sources[0].url,'https://relay.example.com').searchParams.get('t');
  assert.equal((await openTicket(ticket,signingKey)).url,'https://media.example.com/master.m3u8');
  const caption=new URL(data.captions[0].url,'https://relay.example.com').searchParams.get('t');assert.equal((await openTicket(caption,signingKey)).subtitle,true);
  for(const {options} of calls){assert.equal(options.headers?.Authorization,undefined);assert.equal(options.headers?.Cookie,undefined);}
  assert.equal(JSON.stringify(data).includes('media.example.com'),false);
});
test('subtitles become WebVTT while invalid HTML is rejected',()=>{
  assert.equal(subtitleToVtt('1\n00:00:01,200 --> 00:00:03,400\nBonjour\n'),'WEBVTT\n\n1\n00:00:01.200 --> 00:00:03.400\nBonjour\n');
  assert.equal(subtitleToVtt('WEBVTT\n\n00:01.000 --> 00:03.000\nHello'),'WEBVTT\n\n00:01.000 --> 00:03.000\nHello');
  assert.throws(()=>subtitleToVtt('<html>not a subtitle</html>'));
});
test('real video position survives Movies backup and does not overwrite anime progress',()=>{
  const memory=new Map([['animer:library:v1','unchanged']]);globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const item={id:42,type:'movie',key:'movie-42',title:'Fixture'};
  saveMovieProgress(item,1,1,42,120);assert.equal(getMovieProgress(item,1,1).time,42);
  const backup=exportMovies();memory.delete(MOVIES_KEY);importMovies(backup);assert.equal(getMovieProgress(item,1,1).time,42);
  assert.equal(memory.get('animer:library:v1'),'unchanged');
});
