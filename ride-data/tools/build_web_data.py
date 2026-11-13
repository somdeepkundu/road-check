import sys,re,io,json,glob,zipfile,numpy as np,pandas as pd
d=pd.read_pickle('/home/claude/out/all2.pkl')
ZIPS=glob.glob('/home/claude/road-check/ride-data/rides/*.zip')
M=np.cos(np.radians(23.52))*111320;K=110574
ROADS=['highway W','north link','east outer','interior','rgp stub']
d['rs']=d.groupby('ride').rms_v.transform(lambda s:s.rolling(5,center=True,min_periods=1).median())
rides=sorted(d.ride.unique());ridx={r:i for i,r in enumerate(rides)}
info=[]
for r in rides:
    g=d[d.ride==r];info.append(dict(id=r,mount=g['mount'].iloc[0],km=round(g.length_m.sum()/1000,1)))
seg=[[round(x.lat_start,5),round(x.lon_start,5),round(x.lat_end,5),round(x.lon_end,5),round(x.rs,2),ROADS.index(x.road),round(x.speed_kmh) if x.speed_kmh==x.speed_kmh else 0,ridx[x.ride]] for x in d.itertuples()]
# bumps
hits=[]
for z in ZIPS:
    m=re.search(r'(\d+)_Nov_(\d\d)_(\d\d)',z)
    if not m: continue
    key=f'{m[1]} {m[2]}:{m[3]}'
    if key not in ridx: continue
    zf=zipfile.ZipFile(z);n=[x for x in zf.namelist() if x.endswith('_bumps.geojson')]
    if not n: continue
    for f in json.load(zf.open(n[0]))['features']:
        p=f['properties']
        if p.get('peak_v',0)>=8: hits.append((f['geometry']['coordinates'][1],f['geometry']['coordinates'][0],p['peak_v'],ridx[key]))
hits.sort(key=lambda h:(h[0],h[1]))
cl=[]
for h in hits:
    for c in cl:
        if np.hypot((c['la']-h[0])*K,(c['lo']-h[1])*M)<40: c['h'].append(h);c['la']=np.mean([x[0] for x in c['h']]);c['lo']=np.mean([x[1] for x in c['h']]);break
    else: cl.append(dict(la=h[0],lo=h[1],h=[h]))
la=d.lat.values;lo=d.lon.values;rr=d.ride.map(ridx).values
spots=[]
for c in cl:
    rh=sorted({h[3] for h in c['h']})
    if len(rh)<2: continue
    near=np.hypot((la-c['la'])*K,(lo-c['lo'])*M)<25
    passed=len(set(rr[near]));j=np.argmin(np.hypot((la-c['la'])*K,(lo-c['lo'])*M))
    spots.append(dict(la=round(c['la'],5),lo=round(c['lo'],5),hit=len(rh),passed=max(passed,len(rh)),peak=round(max(h[2] for h in c['h'])),road=ROADS.index(d.road.values[j])))
spots.sort(key=lambda s:(-s['hit']/s['passed'],-s['peak']))
for i,s in enumerate(spots):s['n']=i+1
# roughest windows
rough=[]
for r in rides:
    g=d[(d.ride==r)].reset_index(drop=True)
    w=g.rms_v.rolling(5).mean()
    for i in w.index[w.notna()]:
        sl=g.iloc[i-4:i+1]
        if sl.speed_kmh.min()<8:continue
        rough.append((w[i],sl.lat.mean(),sl.lon.mean(),r,sl.speed_kmh.mean(),g.road[i]))
rough.sort(reverse=True);keep=[]
for v,a,b,r,s,rd in rough:
    if all(np.hypot((a-k['la'])*K,(b-k['lo'])*M)>200 for k in keep):
        keep.append(dict(la=round(a,5),lo=round(b,5),rms=round(v,1),ride=ridx[r],kmh=round(s),road=ROADS.index(rd)))
    if len(keep)==6:break
# stats
st=[]
for i,rn in enumerate(ROADS):
    g=d[d.road==rn];st.append(dict(road=i,km=round(g.length_m.sum()/1000,1),rides=int(g.ride.nunique()),med=round(g.rms_v.median(),2),rough=round(100*(g.rs>2).mean()),hits=int((g.peak_v>=8).sum()),per_km=round((g.peak_v>=8).sum()/max(g.length_m.sum()/1000,.01),1)))
print(json.dumps(st,indent=1));print(spots);print(keep);print(len(seg))
out=dict(rides=info,roads=ROADS,seg=seg,spots=spots,rough=keep,stats=st,built='2026-11-13')
open('/home/claude/web/data.js','w').write('window.RC_DATA='+json.dumps(out,separators=(',',':'))+';')
