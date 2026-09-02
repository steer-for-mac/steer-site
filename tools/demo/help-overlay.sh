#!/bin/zsh
# Capture the Help Overlay from the dev build, light and dark, into src/assets
# as help-overlay.png and help-overlay-dark.png (2x, window-only, no shadow).
#
# The card is shown with L1 held through steer://debug/inject, so the lit
# column and the "Active now · L1" status are the app's live state. Only the
# dev build's own panel is addressed (by window id, found by pid and layer);
# no other app's window is touched. Dark: the sandboxed dev build ignores a
# per-app AppleInterfaceStyle default in both the outer and the container
# domain (measured 2026-09-02), so the system appearance is flipped for the
# four seconds the card is up and put back to what it was.
#
#   tools/demo/help-overlay.sh          # both appearances
set -euo pipefail
HERE=${0:a:h}; OUT="$HERE/../../src/assets"
DEV="/Users/sean/Developer/steer/Steer Dev.app"; BID=dev.seanfloyd.steer.dev
C=~/Library/Containers/$BID/Data/tmp
[ -x "$HERE/winid" ] || swiftc -O "$HERE/winid.swift" -o "$HERE/winid"
u() { open -g -b $BID "$1"; }
python3 "$HERE/scene.py" '[["hold",0.5],["press","l1",5.0]]' "$C/help-l1.json" >/dev/null
capture() {
  u "steer://debug/connect?type=dualsense"; sleep 0.8
  u "steer://help/show"; sleep 1.2
  u "steer://debug/inject?file=$C/help-l1.json"; sleep 1.6
  local pid; pid=$(pgrep -f "$DEV/Contents/MacOS" | head -1)
  read -r id rect <<< "$("$HERE/winid" "$pid" panel)"
  screencapture -l "$id" -o -x "$1"
  u "steer://help/hide"; u "steer://debug/disconnect"; sleep 0.4
}
pgrep -f "$DEV/Contents/MacOS" >/dev/null || { open -g -a "$DEV"; sleep 3; }
capture "$OUT/help-overlay.png"
WAS=$(defaults read -g AppleInterfaceStyle 2>/dev/null || echo Light)
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to true'; sleep 1.2
capture "$OUT/help-overlay-dark.png"
[ "$WAS" = Dark ] || osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to false'
sips -g pixelWidth -g pixelHeight "$OUT/help-overlay.png" "$OUT/help-overlay-dark.png" | rg -v '^/' 
