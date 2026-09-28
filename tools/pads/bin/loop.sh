#!/bin/sh
# Render -> feature diff -> (optionally) apply measured corrections, N rounds.
#   bin/loop.sh PAD [ROUNDS] [--final]
# The diff render uses the camera the labels fitted to the reference (a photo's
# perspective); final/ keeps the params' own rig (an ortho product shot).
# ROUNDS=0 only measures. --final also renders final/ (2400px, 256 samples,
# front+hero) and diffs a 256-sample render, so the tables describe what ships.
set -eu
cd "$(dirname "$0")/.."
pad=$1; rounds=${2:-0}; final=${3:-}
cw=$(python3 -c "import json;print(json.load(open('params/$pad.json'))['default_colourway'])")
cam=$(python3 -c "import json;c=json.load(open('labels/$pad.json')).get('camera');c and c.pop('note',None);print(json.dumps({'rig':c}) if c else '{}')")
render() {  # out samples views set
  blender -b --factory-startup --python scene.py -- "params/$pad.json" "$1" --width 2400 --samples "$2" \
    --views "$3" --colourway "$cw" --ids --set "$4" >"out/diff/$pad-blender.log" 2>&1 || { tail -20 "out/diff/$pad-blender.log"; exit 1; }
}
mkdir -p out/diff diff
i=0
while :; do
  render out/diff 64 front "$cam"
  uv run -q bin/featdiff.py "labels/$pad.json" out/diff diff
  [ "$i" -ge "$rounds" ] && break
  python3 bin/autofix.py "params/$pad.json" "diff/$pad-summary.json" ${AUTOFIX_ARGS:-}
  i=$((i + 1))
done
if [ "$final" = "--final" ]; then
  render final 256 front,hero '{}'
  if [ "$cam" = "{}" ]; then src=final; else src=out/diff; render out/diff 256 front "$cam"; fi
  uv run -q bin/featdiff.py "labels/$pad.json" "$src" diff
fi
