import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig(({mode})=>({
 plugins:[react()],base:'/',resolve:{alias:{'@':path.resolve('src')}},
 build:{outDir:'dist/client',emptyOutDir:true,chunkSizeWarningLimit:800,rollupOptions:{output:{manualChunks:{'vendor-react':['react','react-dom','react-router-dom'],'vendor-player':['artplayer','hls.js'],'vendor-supabase':['@supabase/supabase-js']}}}},
 server:{host:'127.0.0.1',port:5175,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:8788'},'/auth/callback':{target:'http://127.0.0.1:5175',rewrite:()=>'/index.html'}}},
 define:{__ANIMER_BUILD__:JSON.stringify(loadEnv(mode,process.cwd(),'VITE_').VITE_APP_VERSION||'1.0.0')},
}));
