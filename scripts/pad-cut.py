#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow", "numpy", "scipy"]
# ///
"""Re-cut the three per-app pads from the manufacturer renders.

Vision's foreground mask (scratch/trace/subject.swift) at the source's native
resolution, its soft ramp tightened to ~2px so the edge is crisp, and the
background un-mixed from the edge pixels (the renders sit on near-white, which
otherwise haloes on the night stage). Nothing inside the pad is touched.
Written at min(native, 2x the displayed size): never upscaled. PNG masters;
the build's image transform emits the AVIF and WebP and keeps the PNG as the
fallback. Usage: scripts/pad-cut.py
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes

G = os.environ.get("PAD_SRC", "scratch/given/")  # the deskewed renders (pad-art-brief.md §1)
V = os.environ.get("PAD_MASKS", "scratch/cut/")  # swift scratch/trace/subject.swift <src> <V><fam>-vmask.png
OUT = "src/assets/pads/"
# fam: source, 2x the width it is drawn at in the 601x401 stage slot
PADS = {
    "ps": ("dualsense-src.png", 1202),
    "xb": ("xbox elite wireless controller series 2-src.png", 1142),
    "sw": ("swpro-src.png", 1126),
}
THUMB = 224  # 2x a 112px picker thumbnail

for fam, (src, want) in PADS.items():
    rgb = np.asarray(Image.open(G + src).convert("RGB")).astype(np.float64) / 255
    a = np.asarray(Image.open(V + fam + "-vmask.png").convert("L")).astype(np.float64) / 255
    # Vision drops a grey part on a grey backdrop (the Elite's metal d-pad dish
    # came out as a hole); anything fully enclosed by the pad is the pad.
    a = np.maximum(a, binary_fill_holes(a > 0.5).astype(np.float64))
    # Vision's matte sits a pixel or so outside the true edge, so un-mixing
    # there brightens the rim; erode by one source pixel before tightening.
    a = np.minimum.reduce([a, np.roll(a, 1, 0), np.roll(a, -1, 0), np.roll(a, 1, 1), np.roll(a, -1, 1)])
    a = np.clip((a - 0.55) / 0.4 + 0.5, 0, 1)
    bg = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), axis=0)
    safe = np.maximum(a, 1e-3)[..., None]
    fg = np.where(a[..., None] > 0.02, (rgb - (1 - a[..., None]) * bg) / safe, rgb)
    fg = np.where(a[..., None] >= 0.98, rgb, np.clip(fg, 0, 1))
    ys, xs = np.where(a > 0.02)
    p = 4
    y0, y1 = max(ys.min() - p, 0), min(ys.max() + p + 1, a.shape[0])
    x0, x1 = max(xs.min() - p, 0), min(xs.max() + p + 1, a.shape[1])
    rgba = np.dstack([fg, a])[y0:y1, x0:x1]
    im = Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA")
    w = min(im.width, want)
    if w < im.width:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(OUT + f"cut-{fam}.png", optimize=True)
    t = im.resize((THUMB, round(im.height * THUMB / im.width)), Image.LANCZOS)
    t.save(OUT + f"thumb-{fam}.png", optimize=True)
    print(fam, "native", x1 - x0, "x", y1 - y0, "->", im.size, "thumb", t.size, "bg", bg.round(3), file=sys.stderr)
