# Road Check ride data

Phone-sensor road-roughness rides around Adra, Purulia (Nov 2026), exported from the Road Check app.

- `rides/` one zip per ride, exactly as exported by the app (segments, bumps, raw readings, ride.json). These contain GPS tracks, so this folder is public.
- `index.csv` one row per ride (time, vehicle, phone mount, km, sharp hits, notes).
- `tools/build_index.py` rebuilds `index.csv` from the zips.
- `tools/load_all.py` loads every ride's 20 m stretches into one pandas table (`from tools.load_all import load_segments`).
- `notebooks/RoadCheck_spots_explained.ipynb` Colab notebook: finds spots hit on 2+ rides and looks up speed breakers and road names on OpenStreetMap.
- `posters/` Facebook posters made from these rides.

To add a ride: drop its zip into `rides/`, run `python tools/build_index.py`, commit.

Notes for analysis: shake (`rms_v`) did not rise with speed in these rides, so the app's speed-scaled index is not used for comparing roads; compare `rms_v` at similar speeds. Pocket and handlebar rides read within about 9% of each other on the same stretches. Two files are not usable rides: `Nov_11_07_36` (bench test) and `Nov_13_22_08` (no GPS).
