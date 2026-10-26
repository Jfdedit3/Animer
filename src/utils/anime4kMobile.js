import {createHalfFloatUpscaler} from "./anime4kHalfFloat";
import {inspectMobileGraphics} from "./anime4kDiagnostics";
/** Real Anime4K 4.0.1 CNN shaders through monyone/Anime4K.js (MIT), not a CSS sharpness filter. */
import {checkMobileDimensions,mobileSubmissionTooSlow} from "./anime4kPolicy";
let modulePromise;
const load=()=>modulePromise||(modulePromise=import("anime4k.js/shaders").then(({ANIME4KJS_SIMPLE_S_2X,ANIME4KJS_SIMPLE_M_2X})=>({ANIME4KJS_SIMPLE_S_2X,ANIME4KJS_SIMPLE_M_2X})).catch(e=>{modulePromise=null;throw e;}));
let cachedProbe;
export function probeMobileAnime4k(){
 if(!cachedProbe)cachedProbe=inspectMobileGraphics();
 return cachedProbe;
}
export function startMobileAnime4k(video,host,mode,onError,onStatus){
 let stopped=false,frameHandle=null,upscaler=null,gl=null,module=null,width=0,height=0,frames=0,previousTime=-1,previousOpacity=video.style.opacity;const samples=[];const dimensionDeadline=performance.now()+12000;const useVideoFrames=typeof video.requestVideoFrameCallback==="function"&&typeof video.cancelVideoFrameCallback==="function";
 const canvas=document.createElement("canvas");canvas.className="yoru-anime4k-mobile";canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:12;pointer-events:none;visibility:hidden";host.appendChild(canvas);
 const restore=()=>{canvas.style.visibility="hidden";video.style.opacity=previousOpacity;};
 const cancel=()=>{if(frameHandle!==null){if(useVideoFrames)video.cancelVideoFrameCallback(frameHandle);else cancelAnimationFrame(frameHandle);frameHandle=null;}};
 const dispose=()=>{if(stopped)return;stopped=true;cancel();clearInterval(watchdog);clearTimeout(initTimer);pipObserver?.disconnect();for(const [el,event,handler] of listeners)el.removeEventListener(event,handler);try{upscaler?.detachSource();}catch{/* A lost context can no longer release resources. */}gl?.getExtension("WEBGL_lose_context")?.loseContext();canvas.remove();video.style.opacity=previousOpacity;};
 const fail=e=>{if(stopped)return;dispose();onError?.(e instanceof Error?e:new Error(String(e)));};
 const listeners=[];const listen=(el,event,fn)=>{el.addEventListener(event,fn);listeners.push([el,event,fn]);};
 let lastFrame=performance.now(),lastMediaTime=video.currentTime||0,pipObserver=null;
 const watchdog=setInterval(()=>{if(stopped||!frames||video.paused||video.seeking||document.hidden||host.classList.contains("nartya-pip"))return;if(video.currentTime>lastMediaTime+.75&&performance.now()-lastFrame>2500)fail(new Error("Anime4K ne suit plus la lecture. Retour à la vidéo normale."));},1000);
 const initTimer=setTimeout(()=>{if(!stopped&&!frames)fail(new Error("Initialisation Anime4K trop longue. Lecture normale conservée."));},30000);
 const render=()=>{
  if(stopped||!module||video.readyState<2||document.hidden||host.classList.contains("nartya-pip")){restore();return;}
  const size=checkMobileDimensions(video.videoWidth,video.videoHeight,mode);if(!size.ok){restore();if(!frames&&performance.now()<dimensionDeadline)return;fail(new Error(size.reason));return;}
  try{
   const start=performance.now();
   if(!upscaler||width!==video.videoWidth||height!==video.videoHeight){upscaler?.detachSource();gl=canvas.getContext("webgl",{premultipliedAlpha:false,stencil:false,depth:false});
    upscaler=createHalfFloatUpscaler(gl,mode==="mobile-m"?module.ANIME4KJS_SIMPLE_M_2X:module.ANIME4KJS_SIMPLE_S_2X,video,canvas);width=video.videoWidth;height=video.videoHeight;frames=0;samples.length=0;}
   upscaler.upscale();
   if(!gl||gl.isContextLost()||gl.getError()!==gl.NO_ERROR||canvas.width!==size.width||canvas.height!==size.height)throw new Error("Le GPU ne peut pas rendre ce profil Anime4K.");
   canvas.style.visibility="visible";video.style.opacity="0";lastFrame=performance.now();lastMediaTime=video.currentTime;frames++;
   if(frames>4){samples.push(performance.now()-start);if(samples.length>12)samples.shift();if(mobileSubmissionTooSlow(samples))throw new Error("Traitement Anime4K trop lent. Retour à la vidéo normale.");}
   onStatus?.({engine:"WebGL",profile:mode,width:canvas.width,height:canvas.height,frames});
  }catch(e){fail(e);}
 };
 const arm=()=>{if(stopped||frameHandle!==null||document.hidden)return;if(useVideoFrames)frameHandle=video.requestVideoFrameCallback(tick);else frameHandle=requestAnimationFrame(tick);};
 const tick=()=>{frameHandle=null;if(stopped)return;if(video.currentTime!==previousTime){previousTime=video.currentTime;render();}if(!video.paused)arm();};
 listen(video,"playing",()=>{lastFrame=performance.now();lastMediaTime=video.currentTime;arm();});listen(video,"seeking",()=>{cancel();restore();});listen(video,"seeked",()=>{previousTime=-1;render();arm();});listen(video,"loadeddata",()=>{render();arm();});listen(video,"pause",()=>{cancel();render();});
 listen(document,"visibilitychange",()=>{if(document.hidden){cancel();restore();}else{render();arm();}});
 listen(canvas,"webglcontextlost",e=>{e.preventDefault();fail(new Error("Contexte graphique perdu. Lecture normale rétablie."));});
 pipObserver=new MutationObserver(()=>{if(host.classList.contains("nartya-pip")){cancel();restore();}else{render();arm();}});pipObserver.observe(host,{attributes:true,attributeFilter:["class"]});
 (async()=>{try{if(!probeMobileAnime4k().supported)throw new Error("Anime4K WebGL non pris en charge par cette WebView.");module=await load();if(stopped)return;render();arm();}catch(e){fail(e);}})();
 return {stop:dispose};
}
