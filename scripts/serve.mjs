import http from 'node:http';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
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
server.listen(port,'127.0.0.1',()=>console.log(`Animer: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
