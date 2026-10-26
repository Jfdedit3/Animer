import http from 'node:http';
import path from 'node:path';
import {stat,readFile} from 'node:fs/promises';
import {basePath} from '../src/web/urls.js';
const root=path.resolve('dist/pages'),base=basePath(process.env.VITE_BASE_PATH||'/Animer/'),port=Number(process.env.PORT||4175);
const types={html:'text/html;charset=utf-8',js:'text/javascript;charset=utf-8',css:'text/css',png:'image/png',gif:'image/gif',svg:'image/svg+xml',ttf:'font/ttf',webmanifest:'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.writeHead(302,{Location:base});res.end();return;}
  if(!url.pathname.startsWith(base))throw new Error('Not found');
  let file=path.resolve(root,decodeURIComponent(url.pathname.slice(base.length)));
  if(file!==root&&!file.startsWith(root+path.sep))throw new Error('Not found');
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file).slice(1)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page introuvable');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Animer Pages: http://127.0.0.1:${port}${base}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
