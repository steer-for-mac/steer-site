#!/bin/sh
# Negative control: the diff must flag a part we deliberately got wrong.
#   bin/negcontrol.sh PAD PART DX_MM SCALE
# Renders a copy of the params with PART moved DX_MM right and scaled by SCALE,
# diffs it, and exits 1 unless PART fails position (if moved) and size (if scaled).
set -eu
cd "$(dirname "$0")/.."
pad=$1; part=$2; dx=$3; k=$4; t=out/negcontrol/$pad; mkdir -p "$t"
python3 - "$pad" "$part" "$dx" "$k" "$t" <<'PY'
import json, sys
pad, part, dx, k, t = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
P = json.load(open(f"params/{pad}.json"))
for q in P["parts"] + P.get("flatten", []):
    if q.get("name") == part:
        q["x"] += dx
        for key in ("r", "cap_r", "rim_r", "collar_r", "w", "hh"):
            if key in q and q in P["parts"]: q[key] *= k
# a params file elsewhere must still find its meshes and masks
import os
def fix(v): return os.path.relpath(os.path.join("params", v), t) if isinstance(v, str) and v.startswith("../") else v
for s in P["shell"]: s["file"] = fix(s["file"])
for m in P.get("mask_regions", []):
    for key in ("image", "soft", "side"):
        if key in m: m[key] = fix(m[key])
json.dump(P, open(f"{t}/{pad}.json", "w"), indent=1)
PY
cw=$(python3 -c "import json;print(json.load(open('params/$pad.json'))['default_colourway'])")
cam=$(python3 -c "import json;c=json.load(open('labels/$pad.json')).get('camera');c and c.pop('note',None);print(json.dumps({'rig':c}) if c else '{}')")
blender -b --factory-startup --python scene.py -- "$t/$pad.json" "$t" --width 2400 --samples 16 --views front \
  --colourway "$cw" --ids --set "$cam" >"$t/blender.log" 2>&1
uv run -q bin/featdiff.py "labels/$pad.json" "$t" "$t/diff" >/dev/null
python3 - "$t/diff/$pad-summary.json" "$part" "$dx" "$k" <<'PY'
import json, sys
S = json.load(open(sys.argv[1])); part, dx, k = sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
r = next(r for r in S["refs"][0]["rows"] if r["feature"] == part)
want = ([f"{part}:pos"] if dx else []) + ([f"{part}:size"] if k != 1 else [])
got = [f for f in S["refs"][0]["fails"] if f.startswith(part + ":")]
ok = all(w in got for w in want)
print(f"{'CAUGHT' if ok else 'MISSED'}: {part} moved {dx:+.1f} mm, scaled x{k}: measured pos {r['pos']:.2f}% W, size {r['size']:+.1f}%; flagged {got}")
sys.exit(0 if ok else 1)
PY
