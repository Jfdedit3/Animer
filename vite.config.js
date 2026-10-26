import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {basePath} from './src/web/urls.js';
function pagesFiles(base){
 return {name:'github-pages-files',apply:'build',async closeBundle(){
  const root='dist/pages';
  await writeFile(path.join(root,'.nojekyll'),'');
  const manifest=JSON.parse(await readFile(path.join(root,'manifest.webmanifest'),'utf8'));
  manifest.id=base;manifest.start_url=base+'#/';manifest.scope=base;
  manifest.icons=manifest.icons.map(icon=>({...icon,src:base+icon.src.replace(/^\//,'')}));
  await writeFile(path.join(root,'manifest.webmanifest'),JSON.stringify(manifest));
 }};
}
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_'),pages=mode==='pages',base=pages?basePath(env.VITE_BASE_PATH||'/Animer/'):'/';
 return {
 plugins:[react(),...(pages?[pagesFiles(base)]:[])],base,resolve:{alias:{'@':path.resolve('src')}},
 build:{outDir:pages?'dist/pages':'dist/client',emptyOutDir:true,chunkSizeWarningLimit:800,rollupOptions:{output:{manualChunks:{'vendor-react':['react','react-dom','react-router-dom'],'vendor-player':['artplayer','hls.js'],}}}},
 server:{host:'127.0.0.1',port:5175,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:8788'},'/auth/callback':{target:'http://127.0.0.1:5175',rewrite:()=>'/index.html'}}},
 define:{__ANIMER_BUILD__:JSON.stringify(env.VITE_APP_VERSION||process.env.npm_package_version||'1.2.0')},
};});
