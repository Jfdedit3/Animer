/**
 * Host for the upstream MIT Anime4K CNN S/M shader classes.
 * Input is RGBA8; CNN intermediates are RGBA16F with NEAREST sampling.
 * Final blit is 1:1 to an RGBA8 drawing buffer; floating-point linear filtering is never used.
 * No OffscreenCanvas or global WebGL monkey-patching is required.
 */
export function createHalfFloatUpscaler(gl,constructors,video,canvas) {
 const width=video.videoWidth,height=video.videoHeight;const outputWidth=width*2,outputHeight=height*2;
 if(!width||!height||outputWidth>gl.getParameter(gl.MAX_TEXTURE_SIZE)||outputHeight>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error("La résolution dépasse les capacités de texture de ce GPU.");
 if(!gl.getExtension("OES_texture_half_float")||!gl.getExtension("EXT_color_buffer_half_float"))throw new Error("Les surfaces 16 bits ne sont pas disponibles.");
 const texture=gl.createTexture(),framebuffer=gl.createFramebuffer();let disposed=false;const programs=[];
 const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(`Compilation du rendu Anime4K impossible : ${message}`);}return shader;};
 const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 position; attribute vec2 texcoord; varying vec2 uv; void main(){gl_Position=vec4(position,0.0,1.0);uv=texcoord;}');
 const fragment=compile(gl.FRAGMENT_SHADER,'precision highp float; precision mediump sampler2D; uniform sampler2D image; varying vec2 uv; void main(){gl_FragColor=texture2D(image,uv);}');
 const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Liaison du rendu Anime4K impossible.");
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,1,0,0, 1,1,1,0, -1,-1,0,1, -1,-1,0,1, 1,1,1,0, 1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,"position"),texcoord=gl.getAttribLocation(program,"texcoord"),sampler=gl.getUniformLocation(program,"image");
 gl.bindTexture(gl.TEXTURE_2D,texture);for(const [param,value] of [[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR]])gl.texParameteri(gl.TEXTURE_2D,param,value);
 gl.disable(gl.DEPTH_TEST);gl.disable(gl.STENCIL_TEST);canvas.width=outputWidth;canvas.height=outputHeight;
 for(const Constructor of constructors)programs.push(new Constructor(gl));
 const textures=new Map();
 return {
  upscale(){
   if(disposed)return;
   gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.bindTexture(gl.TEXTURE_2D,null);
   textures.set("NATIVE",{texture,width,height});textures.set("OUTPUT",{texture,width:outputWidth,height:outputHeight});textures.set("MAIN",{texture,width,height});
   for(const stage of programs)stage.hook_MAIN(textures,framebuffer);
   if(textures.has("MAIN")){textures.set("PREKERNEL",textures.get("MAIN"));textures.delete("MAIN");for(const stage of programs)stage.hook_PREKERNEL(textures,framebuffer);}
   const output=textures.get("PREKERNEL");if(!output||output.width!==outputWidth||output.height!==outputHeight)throw new Error("Le shader Anime4K n’a pas produit les dimensions attendues.");
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,outputWidth,outputHeight);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(texcoord);gl.vertexAttribPointer(texcoord,2,gl.FLOAT,false,16,8);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,output.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.uniform1i(sampler,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.flush();
  },
  detachSource(){if(disposed)return;disposed=true;for(const stage of programs)stage.destroy();gl.deleteFramebuffer(framebuffer);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);textures.clear();}
 };
}
