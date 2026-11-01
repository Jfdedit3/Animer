import test from 'node:test';
import assert from 'node:assert/strict';
import { matchMovieboxTitle, movieboxSources } from '../server/movieboxStreams.js';

test('public source matching keeps type and release year, including series season labels',()=>{
  const movie={title:'Fight Club',release_date:'1999-10-15'};
  const items=[{title:'Fight Club',subjectType:1,releaseDate:'2025-01-01'},{title:'Fight Club',subjectType:1,releaseDate:'1999-10-15'}];
  assert.equal(matchMovieboxTitle(items,movie,'movie'),items[1]);
  assert.equal(matchMovieboxTitle(items,movie,'tv'),undefined);
  const office={title:'The Office S1-S9',subjectType:2,releaseDate:'2005-03-24'};
  assert.equal(matchMovieboxTitle([office],{name:'The Office',first_air_date:'2005-03-24'},'tv'),office);
});
test('public REST flow scopes the service guest token to BFF and preserves episode coordinates',async()=>{
  const calls=[],guest='public-guest-session-for-fixture-only';
  const fetcher=async(value,options)=>{
    const url=new URL(value);calls.push({url,options});
    if(url.hostname==='h5-api.aoneroom.com'){
      if(url.pathname.endsWith('/home'))return Response.json({code:0,data:{}},{headers:{'x-user':JSON.stringify({token:guest})}});
      assert.equal(options.headers.Authorization,'Bearer '+guest);
      if(url.pathname.endsWith('/subject/search'))return Response.json({code:0,data:{items:[{title:'The Office S1-S9',subjectType:2,releaseDate:'2005-03-24',subjectId:'123456789123456789',detailPath:'the-office-series'}]}});
      if(url.pathname.endsWith('/media-player/get-domain'))return Response.json({code:0,data:'https://player.example.com/'});
      if(url.pathname.endsWith('/subject/caption'))return Response.json({code:0,data:{captions:[{lanName:'French',url:'https://media.example.com/fr.srt'}]}});
    }
    assert.equal(url.origin,'https://player.example.com');assert.equal(url.pathname,'/wefeed-h5api-bff/subject/play');
    assert.equal(url.searchParams.get('se'),'2');assert.equal(url.searchParams.get('ep'),'3');assert.equal(options.headers.Authorization,undefined);
    return Response.json({code:0,data:{hasResource:true,limited:false,vipLocked:false,streams:[{id:'s1',format:'MP4',resolutions:'720',url:'https://media.example.com/video.mp4'}]}});
  };
  const result=await movieboxSources({type:'tv',id:2316,season:2,episode:3,metadata:{name:'The Office',first_air_date:'2005-03-24'}},fetcher);
  assert.equal(result.sources.length,1);assert.equal(result.sources[0].format,'video');assert.equal(result.captions[0].label,'French');
  assert.equal(JSON.stringify(result).includes(guest),false);assert.ok(calls.every(c=>!c.options.headers.Cookie));
});
