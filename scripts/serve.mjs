import http from 'node:http';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
// Render generates this persistent server-side seed. Never expose it in the client build.
if(!process.env.STREAM_SIGNING_KEY&&process.env.STREAM_SIGNING_SEED){
 if(process.env.STREAM_SIGNING_SEED.length<32)throw new Error('STREAM_SIGNING_SEED doit contenir au moins 32 caractères.');
 process.env.STREAM_SIGNING_KEY=createHash('sha256').update(process.env.STREAM_SIGNING_SEED).digest('base64');
}
const {default:worker}=await import(pathToFileURL(path.resolve('dist/server/index.js')));
const port=Number(process.env.PORT||8788);
const server=http.createServer(async(req,res)=>{
 try{
  const url=`http://${req.headers.host}${req.url}`;
  const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:ReadableStream.from(req),duplex:'half'}:{})});
  const response=await worker.fetch(request,process.env,{waitUntil:p=>p.catch(()=>{})});
  res.writeHead(response.status,Object.fromEntries(response.headers));
  if(response.body)for await(const chunk of response.body)if(!res.write(Buffer.from(chunk)))await new Promise(resolve=>res.once('drain',resolve));
  res.end();
 }catch{res.writeHead(500,{'Content-Type':'text/plain'});res.end('Erreur du serveur.');}
});
const host=process.env.HOST||'127.0.0.1';
server.listen(port,host,()=>console.log(`Animer: http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
