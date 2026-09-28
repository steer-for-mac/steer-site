#!/bin/sh
# Measure the session's starting params (diff/before/pads, rebuilt from the values
# found at the start) with today's labels and cameras: the "before" column.
set -eu
cd "$(dirname "$0")/.."
for pad in ${*:-ps xb sw}; do
  cw=$(python3 -c "import json;print(json.load(open('diff/before/pads/$pad.json'))['default_colourway'])")
  cam=$(python3 -c "import json;c=json.load(open('labels/$pad.json')).get('camera');c and c.pop('note',None);print(json.dumps({'rig':c}) if c else '{}')")
  blender -b --factory-startup --python scene.py -- "diff/before/pads/$pad.json" out/before --width 2400 --samples 64 \
    --views front --colourway "$cw" --ids --set "$cam" >"out/before-$pad.log" 2>&1
  uv run -q bin/featdiff.py "labels/$pad.json" out/before diff/before
done
