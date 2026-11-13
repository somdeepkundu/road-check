"""Write index.csv: one row per ride zip in rides/, read from the ride.json inside each zip.
Usage: python tools/build_index.py"""
import csv, glob, json, os, zipfile
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = []
for path in sorted(glob.glob(os.path.join(root, 'rides', '*.zip'))):
    z = zipfile.ZipFile(path)
    j = json.loads(z.read('ride.json'))
    s = j.get('summary', {})
    km = round(s.get('distance_m', 0) / 1000, 2)
    note = []
    if km == 0: note.append('no GPS / no stretches')
    if 'Nov_11_07_36' in path: note.append('bench test, not a ride')
    rows.append(dict(file=os.path.basename(path), name=j.get('name'), started_utc=j.get('started'), vehicle=j.get('vehicle'),
                     mount=j.get('mount'), app=j.get('app'), km=km, bumps=s.get('bumps'), notes='; '.join(note)))
out = os.path.join(root, 'index.csv')
with open(out, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(f'{len(rows)} rides, {sum(r["km"] for r in rows):.1f} km -> {out}')
