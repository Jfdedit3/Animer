import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {basePath,applicationBase,callbackUrl,loginPath,isExpectedAuthCallback,permitsSession,normalizeRelay} from '../src/web/urls.js';
import {resolveStaticPlayback} from '../src/web/staticPlayback.js';
import {handleApi} from '../server/router.js';
test('project Pages uses its case-sensitive repository prefix for assets and the OAuth callback',()=>{
 assert.equal(applicationBase('https://jfdedit3.github.io','/Animer/'),'https://jfdedit3.github.io/Animer/');
 assert.equal(callbackUrl('https://jfdedit3.github.io','/Animer/'),'https://jfdedit3.github.io/Animer/auth/callback/');
 assert.equal(loginPath('/Animer/'),'/Animer/#/login');
 assert.equal(callbackUrl('https://example.com','/'),'https://example.com/auth/callback/');
 for(const path of ['//evil.example','/Animer/../Other/','/Animer/?key=x'])assert.throws(()=>basePath(path));
});
test('callback accepts only the expected origin and path and a recently initiated operation',()=>{
 const expected='https://jfdedit3.github.io/Animer/auth/callback/',now=10000000;
 assert.equal(isExpectedAuthCallback(expected+'?code=pkce',expected,now-1000,now),true);
 for(const url of ['https://jfdedit3.github.io/Other/auth/callback/?code=x','https://evil.example/Animer/auth/callback/?code=x',expected,expected+'#access_token=secret'])assert.equal(isExpectedAuthCallback(url,expected,now-1000,now),false);
 assert.equal(isExpectedAuthCallback(expected+'?code=x',expected,now-1000000,now),false);
 assert.equal(isExpectedAuthCallback(expected+'?code=x',expected,now+10000,now),false);
 assert.equal(isExpectedAuthCallback(expected+'?code=x',expected,{kind:'email',at:now-3600000},now),true);
});
test('account credentials may reach only Nartya or the explicitly configured relay API',()=>{
 const config={relay:'https://relay.example.com',providerId:'nartya'};
 assert.equal(permitsSession('https://relay.example.com/api',config),true);
 assert.equal(permitsSession('https://anime.nartya.app',config),true);
 for(const url of ['https://relay.example.com.evil.test/api','https://evil.test/api','https://relay.example.com/other','https://relay.example.com/api?exfil=x'])assert.equal(permitsSession(url,config),false);
 assert.equal(permitsSession('https://relay.example.com/api',{...config,providerId:'compatible'}),false);
 assert.throws(()=>normalizeRelay('https://token:secret@relay.example.com'));assert.throws(()=>normalizeRelay('http://relay.example.com'));
});
test('service worker respects the Pages scope and never intercepts another project or callback',async()=>{
 const handlers={};let intercepted=0;
 const self={location:{origin:'https://jfdedit3.github.io'},registration:{scope:'https://jfdedit3.github.io/Animer/'},addEventListener:(key,fn)=>handlers[key]=fn};
 const text=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');new Function('self',text)(self);
 for(const url of ['https://jfdedit3.github.io/Other/assets/test.js','https://jfdedit3.github.io/Animer/auth/callback/','https://jfdedit3.github.io/Animer/auth/callback/?code=x','https://relay.example.com/api/media?t=secret'])handlers.fetch({request:new Request(url),respondWith:()=>intercepted++});
 assert.equal(intercepted,0);
});
test('static Pages can use only an API-authorized embedded player and never send credentials there',async()=>{
 const calls=[];
 const result=await resolveStaticPlayback({token:'opaque',apiBaseUrl:'https://anime.nartya.app',accessToken:'fixture.jwt',appOrigin:'https://jfdedit3.github.io'},async(url,options)=>{
  calls.push({url,headers:options.headers});
  return Response.json({data:url.includes('/streams/')?{url:'https://embed.example.com/watch/123'}:{sources:{s1:{domains:['embed.example.com']}}}});
 });
 assert.equal(result.kind,'embed');assert.equal(result.url,'https://embed.example.com/watch/123');assert.equal(calls.length,2);assert.ok(calls.every(x=>new URL(x.url).origin==='https://anime.nartya.app'));assert.equal(calls[0].headers.Authorization,'Bearer fixture.jwt');
 const bad=await resolveStaticPlayback({token:'x',apiBaseUrl:'https://evil.example.com'},()=>{throw new Error('Must not fetch');});assert.equal(bad.success,false);
 const forged=await resolveStaticPlayback({token:'x',apiBaseUrl:'https://anime.nartya.app'},async url=>Response.json({data:url.includes('/streams/')?{url:'https://unlisted.example.com/watch'}:{sources:{s1:{domains:['embed.example.com']}}}}));assert.equal(forged.success,false);
});
test('a separate relay accepts preflight only for its configured Pages origin',async()=>{
 const origin='https://jfdedit3.github.io',env={ALLOWED_WEB_ORIGINS:origin};
 const request=new Request('https://relay.example.com/api/web/resolve',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
 const allowed=await handleApi(request,env);assert.equal(allowed.status,204);assert.equal(allowed.headers.get('Access-Control-Allow-Origin'),origin);
 const denied=await handleApi(new Request(request.url,{method:'OPTIONS',headers:{Origin:'https://evil.example.com'}}),env);assert.equal(denied.status,403);assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
});
