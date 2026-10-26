import {normalizeRelay} from '../web/urls.js';
export const IS_GITHUB_PAGES=import.meta.env?.MODE==='pages';
export const WEB_RELAY=normalizeRelay(import.meta.env?.VITE_RELAY_URL||(IS_GITHUB_PAGES?'https://animer-web-jfdedit3.wittycharm129.chatgpt.site':''));
export function defaultApiBase(){return WEB_RELAY?WEB_RELAY+'/api':IS_GITHUB_PAGES?'https://anime.nartya.app':'/api';}
export function streamResolveEndpoint(){return WEB_RELAY?WEB_RELAY+'/api/web/resolve':IS_GITHUB_PAGES?null:'/api/web/resolve';}
