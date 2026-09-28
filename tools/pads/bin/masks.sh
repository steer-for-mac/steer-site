#!/bin/sh
# Every region mask the params read, rebuilt from the references (ref/, untracked) and the
# traced low-res masks: the new traces first, then each smoothed to the -hd-soft copy the
# render samples. Run from tools/pads/.
set -eu
cd "$(dirname "$0")/.."
uv run -q bin/psmasks.py
uv run -q bin/xbgrip.py
s() { uv run -q bin/smoothmask.py "masks/$1.png" - "masks/$1-hd-soft.png" "$2" "${3:-0.5}" >/dev/null; }
s ps-dark 3; s ps-trig 3; s ps-bar 2; s ps-gap 2; s ps-lit 2; s ps-led 2 2.5
s sw-grip 3; s xb-grip 3; s xb-top 2
