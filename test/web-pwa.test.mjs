import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('PWA does not cache API requests, auth callbacks, ranged requests or video',async()=>{
 const handlers={};let calls=0;
 const self={location:{origin:'https://animer.example.com'},addEventListener:(name,fn)=>handlers[name]=fn};
 const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');new Function('self',source)(self);
 for(const request of [new Request('https://animer.example.com/api/v1/home'),new Request('https://animer.example.com/auth/callback?code=secret'),new Request('https://animer.example.com/assets/test.js',{headers:{Range:'bytes=0-1'}})])handlers.fetch({request,respondWith:()=>calls++});
 assert.equal(calls,0);
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
});
