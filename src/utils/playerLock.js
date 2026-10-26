export function setupTouchLock(art) {
 const host=art?.template?.$player;if(!host)return ()=>{};
 const overlay=document.createElement("div");overlay.className="yoru-touch-lock";overlay.hidden=true;
 const unlock=document.createElement("button");unlock.type="button";unlock.textContent="Déverrouiller";unlock.setAttribute("aria-label","Déverrouiller les commandes");overlay.appendChild(unlock);host.appendChild(overlay);
 const setLocked=value=>{overlay.hidden=!value;host.classList.toggle("yoru-player-locked",value);if(value){art.controls.show=false;unlock.focus();}else art.controls.show=true;};
 const block=event=>{event.stopPropagation();};for(const type of ["touchstart","touchmove","touchend","pointerdown","click"])overlay.addEventListener(type,block);
 unlock.addEventListener("click",()=>setLocked(false));const key=e=>{if(e.key==="Escape"&&!overlay.hidden){e.stopImmediatePropagation();setLocked(false);}};document.addEventListener("keydown",key,true);
 art.controls.add({name:"yoru-touch-lock",position:"right",index:24,html:'<span aria-hidden="true">🔒</span>',tooltip:"Verrouiller les commandes",click:()=>setLocked(true)});
 const control=art.controls["yoru-touch-lock"];control?.setAttribute("aria-label","Verrouiller les commandes");if(control){control.style.minWidth="44px";control.style.minHeight="44px";}control?.setAttribute("role","button");control?.setAttribute("tabindex","0");const keyboard=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setLocked(true);}};control?.addEventListener("keydown",keyboard);
 return ()=>{document.removeEventListener("keydown",key,true);control?.removeEventListener("keydown",keyboard);overlay.remove();host.classList.remove("yoru-player-locked");};
}
