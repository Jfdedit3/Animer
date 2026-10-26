/** Read the GPU name independently from processing capabilities; never guess a device model. */
export function inspectMobileGraphics({createCanvas=()=>document.createElement("canvas")}={}) {
 const report={supported:false,engine:"WebGL",gpu:"Nom du GPU non communiqué par la WebView",gpuIdentified:false,checks:[],reason:"",renderPath:"rgba16f-nearest"};
 const contexts=new Set();let gl,texture,framebuffer;
 const check=(id,label,ok,reason)=>{report.checks.push({id,label,supported:!!ok});if(!ok)report.reason=reason;return !!ok;};
 try {
  gl=createCanvas()?.getContext("webgl",{depth:false,stencil:false});if(gl)contexts.add(gl);
  if(!check("webgl","Contexte WebGL",gl,"La WebView ne permet pas de créer un contexte WebGL. Mettez Android System WebView à jour puis relancez Yoru."))return report;
  try {
   const debug=gl.getExtension("WEBGL_debug_renderer_info");const renderer=String((debug&&gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))||gl.getParameter(gl.RENDERER)||"").trim();
   if(renderer&&!/^(?:webkit webgl|webgl|angle|unknown|unknown renderer)$/i.test(renderer)){report.gpu=renderer;report.gpuIdentified=true;}
  }catch{/* Privacy settings may mask only the name; capability checks still run. */}
  const requirements=[
   ["OES_texture_half_float","Textures demi-précision"],
   ["EXT_color_buffer_half_float","Rendu en demi-précision"],
  ];
  for(const [id,label] of requirements)if(!check(id,label,gl.getExtension(id),`${label} indisponible (${id}). Ce profil Anime4K ne peut pas fonctionner dans cette WebView ; la lecture normale reste disponible.`))return report;
  texture=gl.createTexture();framebuffer=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,4,4,0,gl.RGBA,gl.getExtension("OES_texture_half_float").HALF_FLOAT_OES,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  if(!check("framebuffer","Rendu 16 bits sans interpolation",gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE&&gl.getError()===gl.NO_ERROR,"Le test de surface de rendu a échoué malgré les extensions annoncées par le pilote."))return report;
  report.supported=true;report.reason="";return report;
 } catch(error){report.reason=`Le diagnostic graphique n’a pas pu se terminer : ${error.message||"erreur de la WebView"}`;return report;}
 finally{if(gl){if(framebuffer)gl.deleteFramebuffer(framebuffer);if(texture)gl.deleteTexture(texture);}for(const context of contexts){try{context.getExtension("WEBGL_lose_context")?.loseContext();}catch{/* Best effort release even on a broken driver. */}}}
}
