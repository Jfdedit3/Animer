import test from "node:test";
import assert from "node:assert/strict";
import {inspectMobileGraphics} from "../src/utils/anime4kDiagnostics.js";
function context({missing=[],masked=false,framebuffer=true}={}) {
 const gl={TEXTURE_2D:1,TEXTURE_MIN_FILTER:2,TEXTURE_MAG_FILTER:3,LINEAR:4,RGBA:5,FRAMEBUFFER:6,COLOR_ATTACHMENT0:7,FRAMEBUFFER_COMPLETE:8,NO_ERROR:0,RENDERER:9,released:0,
 getExtension(id){if(missing.includes(id))return null;if(id==="WEBGL_debug_renderer_info")return masked?null:{UNMASKED_RENDERER_WEBGL:42};if(id==="WEBGL_lose_context")return {loseContext:()=>this.released++};return {HALF_FLOAT_OES:10};},
 getParameter(id){return id===42?"Adreno test renderer":"WebKit WebGL";},createTexture:()=>({}),createFramebuffer:()=>({}),bindTexture(){},texParameteri(){},texImage2D(){},bindFramebuffer(){},framebufferTexture2D(){},checkFramebufferStatus(){return framebuffer?8:99;},getError:()=>0,deleteFramebuffer(){},deleteTexture(){}};
 return gl;
}
function probe(gl,off=context()){return inspectMobileGraphics({createCanvas:()=>({getContext:()=>gl}),createOffscreen:()=>off?{getContext:()=>off}:null});}
test("GPU name is reported even when a required extension is missing",()=>{
 const gl=context({missing:["OES_texture_half_float"]});const r=probe(gl);assert.equal(r.gpu,"Adreno test renderer");assert.equal(r.gpuIdentified,true);assert.equal(r.supported,false);assert.match(r.reason,/OES_texture_half_float/);assert.equal(gl.released,1);
});
test("a masked GPU name alone never blocks compatible graphics",()=>{
 const gl=context({masked:true}),off=context();const r=probe(gl,off);assert.equal(r.gpuIdentified,false);assert.equal(r.supported,true);assert.match(r.gpu,/non communiqué/);assert.equal(gl.released,1);assert.equal(off.released,0);
});
test("the half-float renderer does not require OffscreenCanvas",()=>{
 const r=probe(context(),null);assert.equal(r.gpuIdentified,true);assert.equal(r.supported,true);assert.equal(r.renderPath,"rgba16f-nearest");
});
test("a failed rendering surface is reported despite all declared extensions",()=>{
 const r=probe(context({framebuffer:false}));assert.equal(r.supported,false);assert.equal(r.checks.at(-1).id,"framebuffer");assert.match(r.reason,/surface de rendu/);
});
test("no WebGL context produces a WebView-specific explanation",()=>{
 const r=probe(null);assert.equal(r.supported,false);assert.match(r.reason,/contexte WebGL/);assert.equal(r.checks[0].id,"webgl");
});

test("Samsung-style missing 32-bit linear filtering does not block the 16-bit nearest path",()=>{
 const r=probe(context({missing:["OES_texture_float","OES_texture_float_linear","OES_texture_half_float_linear"]}),null);
 assert.equal(r.supported,true);assert.equal(r.renderPath,"rgba16f-nearest");assert.deepEqual(r.checks.map(c=>c.id),["webgl","OES_texture_half_float","EXT_color_buffer_half_float","framebuffer"]);
});
