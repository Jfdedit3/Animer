export const MOBILE_ANIME4K_MODES = [
  {value:"mobile-s",label:"Android léger · CNN S ×2"},
  {value:"mobile-m",label:"Android détaillé · CNN M ×2"},
];
export const isMobileAnime4kMode = mode => /^mobile-[sm]$/.test(mode || "");
export const allowsAnime4k = platform => !platform.isMobile || platform.os === "android";
export function mobileInputBudget(mode) { return mode === "mobile-m" ? {width:1920,height:1080} : {width:1280,height:720}; }
export function checkMobileDimensions(width,height,mode) {
 const b=mobileInputBudget(mode);
 if(!(width>0&&height>0))return {ok:false,reason:"Dimensions vidéo indisponibles."};
 const landscape=Math.max(width,height),short=Math.min(width,height);
 if(landscape>b.width||short>b.height)return {ok:false,reason:`Choisissez une source ${b.height}p ou inférieure pour ce profil Anime4K.`};
 return {ok:true,width:width*2,height:height*2};
}
export function anime4kQualityPreference(settings) {
 if(!isMobileAnime4kMode(settings.anime4kMode))return settings.anime4kQuality||"max";
 const cap=mobileInputBudget(settings.anime4kMode).height;
 return String(Math.min(Number(settings.anime4kMobileQuality)||720,cap));
}
export function mobileSubmissionTooSlow(samples) {return samples.length>=8&&samples.slice(-8).filter(ms=>ms>45).length>=6;}
