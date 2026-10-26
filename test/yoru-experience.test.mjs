import test from "node:test";
import assert from "node:assert/strict";
import {normalizeProvider,canSendNartyaSession,saveProvider,getProvider,providerCacheNamespace} from "../src/providers/registry.js";
import {resolveInterfacePolicy} from "../src/utils/interfacePolicy.js";
import {normalizeFilters,filterCatalogBatch} from "../src/utils/catalogFilters.js";
import {apiErrorMessage,isRetryableStatus} from "../src/utils/apiErrors.js";
import {checkpointValue,chooseResumeCheckpoint,writeCheckpoint,readCheckpoint} from "../src/utils/resumeCheckpoint.js";
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
test("a Nartya session never goes to a custom provider or lookalike hostname",()=>{
 assert.equal(canSendNartyaSession("https://anime.nartya.app/v1/streams/a"),true);
 for(const u of ["https://anime.nartya.app.evil.example","https://api.example.org","http://anime.nartya.app","https://evil.example/anime.nartya.app"])assert.equal(canSendNartyaSession(u),false);
});
test("provider settings reject embedded credentials, insecure URLs and query secrets",()=>{
 for(const url of ["http://api.example.org","https://user:pass@api.example.org","https://api.example.org?token=secret","file:///tmp/source"])assert.throws(()=>normalizeProvider({id:"compatible",baseUrl:url}));
 const provider=saveProvider({id:"compatible",baseUrl:"https://api.example.org/",label:"My catalogue"});
 assert.equal(provider.baseUrl,"https://api.example.org");assert.equal(getProvider().publicCatalog,true);assert.equal(canSendNartyaSession("/api"),false);
 const a=providerCacheNamespace();saveProvider(null);assert.notEqual(providerCacheNamespace(),a);assert.equal(getProvider().publicCatalog,false);
});
test("automatic glass policy reduces GPU work and honors OS accessibility",()=>{
 assert.deepEqual(resolveInterfacePolicy({glassEffects:true,performanceMode:"auto"},{memory:3,cores:8,prefersReducedMotion:true}),{glass:true,liteGlass:true,reducedMotion:true,animations:false});
 assert.equal(resolveInterfacePolicy({performanceMode:"quality"},{memory:2}).liteGlass,false);
 assert.equal(resolveInterfacePolicy({glassEffects:false,performanceMode:"eco"},{}).glass,false);
 assert.equal(resolveInterfacePolicy({performanceMode:"auto"},{saveData:true}).liteGlass,true);
});
test("search filters exclude unknown years without claiming zero episodes means playable",()=>{
 const filters=normalizeFilters(new URLSearchParams("year=2024&lang=vf&available=1"));
 const rows=[{slug:"yes",year:2024,episodeCount:12},{slug:"empty",year:2024,episodeCount:0},{slug:"unknown",episodeCount:5},{slug:"other",year:2023,episodeCount:24}];
 assert.deepEqual(filterCatalogBatch(rows,filters).map(r=>r.slug),["yes"]);
 assert.equal(normalizeFilters(new URLSearchParams("year=invalid&lang=wrong")).year,null);
 assert.equal(normalizeFilters(new URLSearchParams("lang=wrong")).language,"");
});
test("HTTP errors provide actionable messages and 4xx are not retried",()=>{
 assert.match(apiErrorMessage(401),/session/);assert.match(apiErrorMessage(410),/expiré/);assert.match(apiErrorMessage(429,8),/8 s/);assert.equal(isRetryableStatus(401),false);assert.equal(isRetryableStatus(503),true);
});
test("local resume checkpoints preserve precise time and choose the latest account record",()=>{
 const local=checkpointValue(812.25,1400,2000);assert.equal(local.positionSeconds,812.25);assert.equal(local.completed,false);
 const remote={positionSeconds:900,updatedAt:new Date(3000).toISOString()};assert.equal(chooseResumeCheckpoint(local,remote),remote);
 assert.equal(chooseResumeCheckpoint({...local,savedAt:4000},remote).savedAt,4000);
 assert.equal(checkpointValue(NaN,100),null);assert.equal(checkpointValue(500,100).positionSeconds,100);
 writeCheckpoint("provider:user-a","anime:1:2:vf",local);assert.equal(readCheckpoint("provider:user-a","anime:1:2:vf").positionSeconds,812.25);assert.equal(readCheckpoint("provider:user-b","anime:1:2:vf"),null);
});
