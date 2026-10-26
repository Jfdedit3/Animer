import {readFile,readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const root=path.resolve('dist/client'),assets={};
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){if(item.name!=='profile-art')await walk(file);}else{const name='/'+path.relative(root,file).split(path.sep).join('/');if(!/\.(?:icns|map)$/.test(name))assets[name]=(await readFile(file)).toString('base64');}}}
await walk(root);await mkdir('dist/server',{recursive:true});
await build({entryPoints:['worker/index.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,define:{__ANIMER_ASSETS__:JSON.stringify(assets)}});
await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await writeFile('dist/build-info.json',JSON.stringify({app:'Animer',version:JSON.parse(await readFile('package.json','utf8')).version,files:Object.keys(assets).length,worker:'server/index.js',static:'client'},null,2));
console.log(`Animer: ${Object.keys(assets).length} assets bundled with the web relay.`);
