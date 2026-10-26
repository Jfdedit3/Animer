import {spawn} from 'node:child_process';
import http from 'node:http';
import {handleApi} from '../server/router.js';
const server=http.createServer(async(req,res)=>{try{const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(req.method!=='GET'&&req.method!=='HEAD'?{body:ReadableStream.from(req),duplex:'half'}:{})});const response=await handleApi(request,process.env);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)for await(const part of response.body)res.write(Buffer.from(part));res.end();}catch{res.writeHead(502);res.end('Service indisponible');}});
server.listen(8788,'127.0.0.1');
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{vite.kill(signal);server.close(()=>process.exit(0));});vite.on('exit',code=>server.close(()=>process.exit(code||0)));
