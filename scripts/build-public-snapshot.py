"""Derive the public fallback from a downloaded anime-offline-database JSON release.
Usage: python scripts/build-public-snapshot.py source.json
The derived dataset remains under ODbL 1.0 / Database Contents License 1.0.
"""
import sys,json,re
from pathlib import Path
source=json.loads(Path(sys.argv[1]).read_text())
rows=[]
for a in source['data']:
 mal=next((u for u in a['sources'] if u.startswith('https://myanimelist.net/anime/')),None)
 tags=set(a.get('tags',[]))
 if not mal or a['type'] not in ['TV','MOVIE'] or tags.intersection({'hentai','ecchi','erotica','nudity','sexual violence','explicit sex','pornography'}):continue
 score=a.get('score',{}).get('arithmeticMean',0)
 if score<8:continue
 rows.append({'slug':'mal-'+mal.rsplit('/',1)[1],'title':a['title'],'cover':a['picture'],'year':a.get('animeSeason',{}).get('year'),'score':round(score,1),'episodes':a.get('episodes',0),'synonyms':a.get('synonyms',[]),'url':mal})
rows.sort(key=lambda a:a['score'],reverse=True)
Path('public/data/catalog.json').write_text(json.dumps({'source':source['repository'],'lastUpdate':source['lastUpdate'],'license':'ODbL-1.0 / DbCL-1.0','items':rows[:500]},ensure_ascii=False,separators=(',',':')))
print(len(rows[:500]),'fallback entries')
