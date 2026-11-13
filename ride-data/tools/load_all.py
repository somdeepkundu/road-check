"""Load every ride's 20 m stretches into one table.
In Python:   from tools.load_all import load_segments; df = load_segments()
From shell:  python tools/load_all.py   (writes data/all_segments.csv.gz)
Adds columns: ride (name), mount (bar|pocket), lat, lon (stretch midpoint). Skips rides with no stretches."""
import glob, io, json, os, zipfile
import pandas as pd
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load_segments(rides_dir=None):
    parts = []
    for path in sorted(glob.glob(os.path.join(rides_dir or os.path.join(root, 'rides'), '*.zip'))):
        z = zipfile.ZipFile(path)
        j = json.loads(z.read('ride.json'))
        name = next((n for n in z.namelist() if n.endswith('_segments.csv')), None)
        if not name: continue
        s = pd.read_csv(io.BytesIO(z.read(name)))
        if s.empty: continue
        s['ride'] = j['name']
        s['mount'] = 'bar' if 'handle' in str(j.get('mount', '')).lower() else 'pocket'
        s['lat'] = (s.lat_start + s.lat_end) / 2
        s['lon'] = (s.lon_start + s.lon_end) / 2
        parts.append(s)
    return pd.concat(parts, ignore_index=True)
if __name__ == '__main__':
    df = load_segments()
    os.makedirs(os.path.join(root, 'data'), exist_ok=True)
    df.to_csv(os.path.join(root, 'data', 'all_segments.csv.gz'), index=False)
    print(len(df), 'stretches,', df.ride.nunique(), 'rides,', round(df.length_m.sum() / 1000, 1), 'km')
    print(df.groupby('ride').agg(km=('length_m', lambda x: round(x.sum() / 1000, 2)), rms_v=('rms_v', 'median'), mount=('mount', 'first')).round(2).to_string())
