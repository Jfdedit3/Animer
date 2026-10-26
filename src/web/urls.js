export function basePath(value='/'){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[?#\\]/.test(value)||value.split('/').some(x=>x==='..'||x==='.'))throw new Error('Chemin de site invalide.');
 return value.replace(/\/*$/,'/');
}
export function applicationBase(origin,base='/'){return new URL(basePath(base),origin).href;}
export function callbackUrl(origin,base='/'){return new URL('auth/callback/',applicationBase(origin,base)).href;}
export function loginPath(base='/'){return basePath(base)+'#/login';}
export function normalizeRelay(value=''){
 if(!value)return '';
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Le relais doit avoir une adresse HTTPS sans identifiants ni paramètres.');
 return url.href.replace(/\/+$/,'');
}
export function safeProviderUrl(value,{domains=null,appOrigin=''}={}){
 const url=new URL(value),host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||url.origin===appOrigin||!host.includes('.')||host.includes(':')||/^[\d.]+$/.test(host)||host.endsWith('.')||/(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(host))throw new Error('Adresse du lecteur non autorisée.');
 if(domains&&!domains.some(d=>typeof d==='string'&&(host===d.toLowerCase()||host.endsWith('.'+d.toLowerCase()))))throw new Error('Ce lecteur ne figure pas dans les sources autorisées.');
 return url.href;
}
export function isExpectedAuthCallback(value,expected,pending,now=Date.now()){
 try{
  const url=new URL(value),target=new URL(expected);
  const at=typeof pending==='number'?pending:pending?.at,ttl=pending?.kind==='email'?86400000:900000;
  return url.origin===target.origin&&url.pathname.replace(/\/$/,'')===target.pathname.replace(/\/$/,'')&&!url.username&&!url.password&&Number.isFinite(at)&&at>0&&at<=now+5000&&now-at<ttl&&(url.searchParams.has('code')||url.searchParams.has('error')||url.searchParams.has('error_code'));
 }catch{return false;}
}
export function permitsSession(apiBase,{relay='',providerId='nartya',nartya='https://anime.nartya.app'}={}){
 if(providerId!=='nartya')return false;
 try{const url=new URL(apiBase);if(url.origin===nartya)return true;const trusted=normalizeRelay(relay);return !!trusted&&url.href.replace(/\/$/,'')===trusted+'/api';}
 catch{return apiBase==='/api';}
}
