#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow", "numpy", "scipy"]
# ///
"""Re-cut the per-app pads from the generated sources (PHOTO-SOURCES.md).

Vision's foreground mask (scripts/subject.swift) at the source's native
resolution, its soft ramp tightened to ~2px so the edge is crisp, and the
background un-mixed from the edge pixels (the renders sit on near-white, which
otherwise haloes on the night stage). Nothing inside the pad is touched.
Written at min(native, 2x the displayed size): never upscaled. PNG masters;
the build's image transform emits the AVIF and WebP and keeps the PNG as the
fallback. Usage: scripts/pad-cut.py [ps xb sw xs ds4]
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes, gaussian_filter

G = os.environ.get("PAD_SRC", "tools/pads/given/")  # tools/pads/PHOTO-SOURCES.md
V = os.environ.get("PAD_MASKS", "scratch/cut/")  # remade by subject.swift when missing or stale
OUT = "src/assets/pads/"
CROP = "tools/pads/crop.json"  # each cutout's box in its source, for scripts/pad-controls.py
# fam: source, 2x the width it is drawn at in the 601x401 stage slot
PADS = {
    "ps": ("dualsense-src.png", 1202),
    "xb": ("xbox elite wireless controller series 2-src.png", 1142),
    "sw": ("swpro-src.png", 1126),
    "xs": ("xbox series-src.png", 1142),
    "ds4": ("dualshock4-src.png", 1202),
}
THUMB = 224  # 2x a 112px picker thumbnail



def unlit(rgb):
    """The DualSense with its light bar off, so a page can light it any colour.
    Only blue pixels near the bar's two strips change: they fade to the milky
    grey of unlit plastic, and the rest of the photo is untouched."""
    with open("tools/pads/controls/ps.json") as f:
        parts = json.load(f)["lightbar"]["parts"]
    near = np.zeros(rgb.shape[:2])
    for part in parts:
        x0, y0, x1, y1 = part["box"]
        near[max(y0 - 30, 0):y1 + 30, max(x0 - 30, 0):x1 + 30] = 1
    hsv = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8)).convert("HSV")).astype(np.float64) / 255
    hue, sat = hsv[..., 0] * 360, hsv[..., 1]
    blue = gaussian_filter(((hue > 200) & (hue < 260)) * np.clip((sat - 0.04) / 0.2, 0, 1) * near, 1.2)
    lum = rgb @ [0.2126, 0.7152, 0.0722]
    grey = np.clip(lum * 1.9 + 0.12, 0, 0.86)
    return rgb * (1 - blue[..., None]) + grey[..., None] * blue[..., None]


def cutout(rgb, a, bg, box, want):
    safe = np.maximum(a, 1e-3)[..., None]
    fg = np.where(a[..., None] > 0.02, (rgb - (1 - a[..., None]) * bg) / safe, rgb)
    fg = np.where(a[..., None] >= 0.98, rgb, np.clip(fg, 0, 1))
    x0, y0, x1, y1 = box
    im = Image.fromarray((np.dstack([fg, a])[y0:y1, x0:x1] * 255 + 0.5).astype(np.uint8), "RGBA")
    w = min(im.width, want)
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) if w < im.width else im


# Named families only (default all), so cutting a new pad leaves the others' bytes alone.
with open(CROP) as f:
    crops = json.load(f)
for fam in sys.argv[1:] or PADS:
    src, want = PADS[fam]
    m = V + fam + "-vmask.png"
    if not os.path.exists(m) or os.path.getmtime(m) < os.path.getmtime(G + src):
        os.makedirs(V, exist_ok=True)
        subprocess.run(["swift", "scripts/subject.swift", G + src, m], check=True)
    rgb = np.asarray(Image.open(G + src).convert("RGB")).astype(np.float64) / 255
    a = np.asarray(Image.open(m).convert("L")).astype(np.float64) / 255
    # Vision drops a grey part on a grey backdrop (the Elite's metal d-pad dish
    # came out as a hole); anything fully enclosed by the pad is the pad.
    a = np.maximum(a, binary_fill_holes(a > 0.5).astype(np.float64))
    # Vision's matte sits a pixel or so outside the true edge, so un-mixing
    # there brightens the rim; erode by one source pixel before tightening.
    a = np.minimum.reduce([a, np.roll(a, 1, 0), np.roll(a, -1, 0), np.roll(a, 1, 1), np.roll(a, -1, 1)])
    a = np.clip((a - 0.55) / 0.4 + 0.5, 0, 1)
    bg = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), axis=0)
    ys, xs = np.where(a > 0.02)
    p = 4
    y0, y1 = max(ys.min() - p, 0), min(ys.max() + p + 1, a.shape[0])
    x0, x1 = max(xs.min() - p, 0), min(xs.max() + p + 1, a.shape[1])
    crops[fam] = [int(x0), int(y0), int(x1), int(y1)]
    im = cutout(rgb, a, bg, crops[fam], want)
    im.save(OUT + f"cut-{fam}.png", optimize=True)
    if fam == "ps":
        cutout(unlit(rgb), a, bg, crops[fam], want).save(OUT + "cut-ps-unlit.png", optimize=True)
    t = im.resize((THUMB, round(im.height * THUMB / im.width)), Image.LANCZOS)
    t.save(OUT + f"thumb-{fam}.png", optimize=True)
    print(fam, "native", x1 - x0, "x", y1 - y0, "->", im.size, "thumb", t.size, "bg", bg.round(3), file=sys.stderr)
with open(CROP, "w") as f:
    json.dump(crops, f)
    f.write("\n")
