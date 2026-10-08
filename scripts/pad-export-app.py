#!/usr/bin/env python3
"""Hand the per-app pads to the Steer app: one cutout and its control outlines per family.

Reads the committed src/assets/pads/cut-<fam>.png and src/_includes/art/controls-<fam>.svg
(scripts/pad-cut.py, scripts/pad-controls.py) and writes, into the app's resources,
pad-<fam>.heic (sips, quality 70: alpha survives, and the first three weighed ~245 KB
against ~2.8 MB as PNG; all five, ~445 KB) and pad-<fam>.json. The JSON keys controls by the app's ControllerButton
raw values, not the site's positional names, and lists under "notDrawn" every bindable
button this front view cannot show, so the app's PadArtContractTests can fail when a
button gains neither an outline nor a place in that list.
Usage: scripts/pad-export-app.py ~/Developer/steer [ps xb sw xs ds4]
"""
import json
import os
import re
import subprocess
import sys

# site name -> ControllerButton raw value. Every site part is here or in DECOR, or the
# export fails: a part this skipped once (l1/r1, lost to a digit-less regex) was also
# listed as not drawn, which the app's contract test cannot tell from the truth.
DECOR = {"up-left", "up-right", "down-left", "down-right", "dpad", "lightbar"}
KEYS = {
    "l1": "l1", "r1": "r1",
    "cross": "cross", "circle": "circle", "triangle": "triangle", "square": "square",
    "ls": "l3", "rs": "r3",
    "up": "dpadUp", "down": "dpadDown", "left": "dpadLeft", "right": "dpadRight",
    "create": "create", "options": "options", "home": "psButton",
    "touchpad": "touchpadClick", "mute": "micMute", "capture": "share",
}
SHOULDERS = ["l2", "r2"]
# Bindable on this family's pads but not visible from the front (the triggers sit
# behind the bumpers). The Elite 2 art has
# a profile button where a Series pad has Share, so Share is not drawn on it either.
NOT_DRAWN = {
    "ps": SHOULDERS + ["backButtonLeft", "backButtonRight"],
    "xb": SHOULDERS + ["paddle1", "paddle2", "paddle3", "paddle4", "share"],
    "sw": SHOULDERS,
    # Xbox Series X|S: Share is drawn; no paddles on this pad.
    "xs": SHOULDERS,
    # DualShock 4: its Share is the app's `create`; no mic mute, no back buttons.
    "ds4": SHOULDERS,
    # Generic pads stand in for MFi and unknown controllers, which may report Share.
    "graphite": SHOULDERS + ["share"],
    "white": SHOULDERS + ["share"],
    "navy": SHOULDERS + ["share"],
}

# Families with a Midnight Black twin for dark mode, by site cut-out.
DARK = {"ps": "cut-ps-unlit-dark.png"}


def outlines(svg):
    parts = dict(re.findall(r'<path data-c="([a-z0-9-]+)" d="([^"]*)"', svg))
    if svg.count("<path ") != len(parts):
        sys.exit(f"read {len(parts)} of {svg.count('<path ')} paths; the pattern no longer fits the SVG")
    # A plain cross d-pad has no diagonal corners to cut; a button must have a shape.
    empty = {name for name, d in parts.items() if not d} - DECOR
    if empty:
        sys.exit(f"empty outline for {sorted(empty)}")
    unknown = set(parts) - set(KEYS) - DECOR
    if unknown:
        sys.exit(f"site parts neither mapped nor decoration: {sorted(unknown)}")
    controls = {}
    for site, d in parts.items():
        if site not in KEYS:
            continue
        polys = [[int(n) for n in re.findall(r"-?\d+", sub)] for sub in re.findall(r"M([^Z]+)Z", d)]
        controls[KEYS[site]] = [p for p in polys if len(p) >= 6]
    return controls


def main(app, fams):
    out = os.path.join(app, "Steer/Sources/Steer/Resources/Pads")
    os.makedirs(out, exist_ok=True)
    for fam in fams or NOT_DRAWN:
        not_drawn = NOT_DRAWN[fam]
        with open(f"src/_includes/art/controls-{fam}.svg") as f:
            svg = f.read()
        w, h = map(int, re.search(r'viewBox="0 0 (\d+) (\d+)"', svg).groups())
        controls = outlines(svg)
        clash = set(controls) & set(not_drawn)
        if clash:
            sys.exit(f"{fam}: {sorted(clash)} both drawn and listed as not drawn")
        doc = {"size": [w, h], "controls": dict(sorted(controls.items())), "notDrawn": not_drawn}
        with open(os.path.join(out, f"pad-{fam}.json"), "w") as f:
            json.dump(doc, f, separators=(",", ":"))
            f.write("\n")
        subprocess.run(["sips", "-s", "format", "heic", "-s", "formatOptions", "70",
                        f"src/assets/pads/cut-{fam}.png", "--out", os.path.join(out, f"pad-{fam}.heic")],
                       check=True, capture_output=True)
        # A dark-mode twin, where the site has one: same pose and size, so the
        # outlines and the light-bar mask read off the light photo still fit.
        dark = DARK.get(fam)
        if dark:
            subprocess.run(["sips", "-s", "format", "heic", "-s", "formatOptions", "70",
                            f"src/assets/pads/{dark}", "--out", os.path.join(out, f"pad-{fam}-dark.heic")],
                           check=True, capture_output=True)
        print(fam, len(controls), "outlines", "+ dark" if dark else "")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__.strip().splitlines()[-1])
    main(os.path.expanduser(sys.argv[1]), sys.argv[2:])
