export function chooseResumeCheckpoint(local, remote) {
 if(!local)return remote;
 if(!remote)return local;
 const remoteTime=Date.parse(remote.updatedAt||"");
 return !Number.isFinite(remoteTime)||Number(local.savedAt)>remoteTime?local:remote;
}
export function checkpointValue(position,duration,now=Date.now()) {
 const d=Number(duration),p=Number(position);
 if(!Number.isFinite(p)||!Number.isFinite(d)||p<0||d<=0)return null;
 const time=Math.min(p,d);return {positionSeconds:time,duration:d,progressPercent:time/d*100,completed:time/d>=.9,savedAt:now};
}
export function readCheckpoint(scope,key){try{return JSON.parse(localStorage.getItem(`yoru:resume:${scope}`)||"{}")[key]||null;}catch{return null;}}
export function writeCheckpoint(scope,key,value){if(!value)return;try{const rows=JSON.parse(localStorage.getItem(`yoru:resume:${scope}`)||"{}");rows[key]=value;const bounded=Object.fromEntries(Object.entries(rows).sort((a,b)=>b[1].savedAt-a[1].savedAt).slice(0,250));localStorage.setItem(`yoru:resume:${scope}`,JSON.stringify(bounded));}catch{/* Storage failure must not interrupt playback. */}}
