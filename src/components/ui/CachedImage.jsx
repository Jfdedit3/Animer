import { forwardRef, useEffect, useState } from "react";
import {cacheArtwork,getCachedArtwork} from "@/utils/artworkCache";
const CachedImage=forwardRef(function CachedImage({src,onLoad,onError,...props},ref){
 const [cached,setCached]=useState(null);
 useEffect(()=>{let alive=true,objectUrl;setCached(null);getCachedArtwork(src).then(blob=>{if(alive&&blob){objectUrl=URL.createObjectURL(blob);setCached({src,url:objectUrl});}});return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[src]);
 const url=cached?.src===src?cached.url:src;
 return <img {...props} ref={ref} src={url} onLoad={event=>{onLoad?.(event);if(url===src)void cacheArtwork(src);}} onError={event=>{if(url!==src)setCached(null);else onError?.(event);}}/>;
});
export default CachedImage;
