export function normalizeFilters(params) {
 const year=Number(params.get("year"));
 return {query:(params.get("q")||"").trim(),language:["vf","vostfr","va"].includes(params.get("lang"))?params.get("lang"):"",genre:params.get("genre")||"",type:["Anime","Film","Autres"].includes(params.get("type"))?params.get("type"):"",year:year>=1900&&year<=new Date().getFullYear()+1?year:null,available:params.get("available")==="1"};
}
export function filterCatalogBatch(rows,filters) {
 return rows.filter(row=>(!filters.available || Number(row.episodeCount??row.episodes??0)>0)&&(!filters.year||Number(row.year)===filters.year));
}
