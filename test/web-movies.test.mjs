import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMovies, normalizeMovie, moviePlayerUrl } from '../server/movies.js';
import { handleApi } from '../server/router.js';
import { MOVIES_KEY, updateMovie, readMovies, markMovieEpisode, exportMovies, importMovies } from '../src/movies/library.js';

test('Movies catalog uses a fixed public upstream and forwards no session or cookie', async () => {
  const calls=[];
  const fetcher=async(url, options)=>{calls.push({url,options});return Response.json({results:[{id:550,title:'Fight Club',poster_path:'/cover.jpg',adult:false},{id:2,title:'Adult',adult:true}],total_pages:3});};
  const response=await handleApi(new Request('https://relay.example.com/api/movies/catalog?q=public-test&type=movie&page=1',{headers:{Origin:'https://jfdedit3.github.io',Authorization:'Bearer fixture.jwt',Cookie:'private=fixture'}}),{ALLOWED_WEB_ORIGINS:'https://jfdedit3.github.io'},fetcher);
  assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://jfdedit3.github.io');
  const data=(await response.json()).data;assert.equal(data.items.length,1);assert.equal(data.items[0].key,'movie-550');assert.equal(data.hasNext,true);
  assert.equal(new URL(calls[0].url).origin,'https://cinemaos.tech');assert.equal(new URL(calls[0].url).searchParams.get('language'),'fr-FR');
  assert.deepEqual(calls[0].options.headers,{Accept:'application/json'});
});
test('Movie and series episode coordinates reject arbitrary URLs and invalid identifiers', async()=>{
  for(const path of ['catalog?type=https://evil.test','title/movie/0','season/1399/0','player?type=movie&id=https://evil.test','player?type=tv&id=1&season=-1']){
    const r=await handleMovies(new Request('https://relay.test/api/movies/'+path),{},()=>{throw Error('Should not fetch');});assert.equal(r.status,400,path);
  }
  assert.equal(moviePlayerUrl({type:'movie',id:550}),'https://cinemaos.tech/watch/movie/550');
  assert.equal(moviePlayerUrl({type:'tv',id:1399,season:2,episode:3}),'https://cinemaos.tech/watch/tv/1399?season=2&episode=3');
  assert.equal(normalizeMovie({id:1,title:'Test',poster_path:'https://evil.test/a.jpg'},'movie').cover,null);
});
test('Series seasons use the episode metadata endpoint',async()=>{
  let target;
  const r=await handleMovies(new Request('https://relay.test/api/movies/season/1399/2'),{},async url=>{target=new URL(url);return Response.json({episodes:[{episode_number:3,name:'Episode',still_path:'/frame.jpg',runtime:42}]});});
  assert.equal(target.searchParams.get('requestID'),'tvEpisodes');assert.equal(target.searchParams.get('season'),'2');
  const data=(await r.json()).data;assert.equal(data.episodes[0].number,3);assert.equal(data.episodes[0].duration,42);
});
test('Movies favorites, lists, viewed episodes and import stay separate from anime data',()=>{
  const memory=new Map([['animer:library:v1','anime-data-unchanged']]);globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const item={id:550,type:'movie',key:'movie-550',title:'Film',cover:'https://image.tmdb.org/t/p/w500/test.jpg'};
  updateMovie(item,{favorite:true,status:'planned'});markMovieEpisode(item,1,1);
  assert.equal(readMovies()['movie-550'].favorite,true);assert.deepEqual(readMovies()['movie-550'].watched,['1:1']);
  const backup=exportMovies();memory.delete(MOVIES_KEY);importMovies(backup);assert.equal(readMovies()['movie-550'].status,'completed');
  assert.equal(memory.get('animer:library:v1'),'anime-data-unchanged');
  assert.throws(()=>importMovies({app:'animer-local',version:1,items:{}}));assert.throws(()=>importMovies({app:'animer-movies',version:1,items:{bad:{item:{id:1,type:'evil'}}}}));
  assert.equal(readMovies()['movie-550'].favorite,true);
  memory.set(MOVIES_KEY,'broken-json');assert.throws(()=>updateMovie(item,{favorite:false}));assert.equal(memory.get(MOVIES_KEY),'broken-json');
});
