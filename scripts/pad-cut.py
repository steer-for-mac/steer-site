#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow", "numpy", "scipy"]
# ///
"""Re-cut the per-app pads from the generated sources (PHOTO-SOURCES.md).

Vision's foreground mask (scripts/subject.swift) at the source's native
resolution, refitted to the render's own outline as a 1px ramp, and the
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
from scipy.ndimage import (
    binary_dilation,
    binary_fill_holes,
    gaussian_filter,
    grey_closing,
    grey_opening,
    label,
    uniform_filter,
)

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
    # The same pad in Robot White, for light pages: a colour-only edit of xs's source.
    "xs-white": ("xbox series robot white-src.png", 1142),
    "ds4": ("dualshock4-src.png", 1202),
    # Generic pads, for MFi and unknown controllers: original designs, no real product.
    "graphite": ("generic-graphite-src.png", 1202),
    "white": ("generic-white-src.png", 1202),
    "navy": ("generic-navy-src.png", 1202),
    # Midnight Black, for dark pages: a Codex edit of cut-ps-unlit.png in the same
    # pose and frame, so its box is the whole image and ps's outlines fit it.
    "ps-unlit-dark": ("dualsense midnight-src.png", 1202),
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


CROSS = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)


def edge(a, rgb, r=5, eps=1e-3):
    """A one-pixel antialiased edge on the photo's own outline, not the mask's.
    Vision's mask is 512x512 whatever the source (3x by 2x cells on a 1536x1024
    render), so its outline steps every few pixels and sits up to two off the
    real edge; tightening it as it came drew those steps as a sawtooth. A guided
    filter (He et al.) refits the mask to the render's luminance over r pixels,
    which moves the outline onto the drawn edge, smooth because the render is.
    Dividing by the slope turns the refit value into a distance from its 0.5
    line, so the ramp is one pixel wide."""
    lum = rgb @ [0.2126, 0.7152, 0.0722]
    mean = lambda x: uniform_filter(x, 2 * r + 1)
    mi, ma = mean(lum), mean(a)
    k = (mean(lum * a) - mi * ma) / (mean(lum * lum) - mi * mi + eps)
    q = mean(k) * lum + mean(ma - k * mi)
    gy, gx = np.gradient(q)
    return np.clip((q - 0.5) / np.maximum(np.hypot(gx, gy), 1e-4) + 0.5, 0, 1)


def rim(a, depth):
    """Pixels within depth of the backdrop, counting beyond the frame as backdrop:
    the Midnight pad is cut off by its frame at both grips."""
    out = ~binary_fill_holes(np.pad(a >= 0.5, 1))
    return binary_dilation(out, CROSS, iterations=depth)[1:-1, 1:-1]


def coverage(rgb, a, bg):
    """Each edge pixel's own coverage, where the pad is far enough from the backdrop
    to read it. A one-pixel ramp is right on average but not pixel by pixel, and
    a pixel it calls solid that is a quarter backdrop shows as a light dot on a
    dark page: the Midnight DualSense, on white, drew a dotted rim. Projecting
    the pixel onto the line from the backdrop to the pad's colour just inside
    gives its coverage. On a grey backdrop the pad's own shading is as far from
    its colour as the backdrop is, so there the ramp stands."""
    # From two pixels outside the outline to three in. Where the Midnight pad's
    # grips meet the frame, a strip of white backdrop two pixels wide read as
    # solid and drew a bright bar on dark pages. Deeper in, a highlight the
    # backdrop's colour is the pad (the Elite's top rim), not a mixed pixel.
    near = rim(a, 3) & binary_dilation(binary_fill_holes(a >= 0.5), CROSS, iterations=2)
    solid = ((a >= 0.98) & ~near).astype(np.float64)
    inside = gaussian_filter(rgb * solid[..., None], (3, 3, 0)) / np.maximum(gaussian_filter(solid, 3), 1e-6)[..., None]
    v = inside - bg
    far = np.sqrt((v ** 2).mean(-1))
    seen = np.clip(((rgb - bg) * v).sum(-1) / np.maximum((v ** 2).sum(-1), 1e-6), 0, 1)
    w = np.clip((far - 0.5) / 0.2, 0, 1) * near * (gaussian_filter(solid, 3) > 0.02)
    return a + w * (seen - a)


def tidy(a):
    """Close one-pixel notches and open one-pixel spurs. Where the render has a
    seam or rim line just inside the outline, the refit can carve along it."""
    return grey_opening(grey_closing(a, footprint=CROSS), footprint=CROSS)


def whole(a):
    """Only the outermost three pixels may be see-through, and the pad is one piece.
    A highlight the colour of the backdrop (the Elite's top rim) otherwise
    refits as a translucent band inside the edge, and stray backdrop specks
    come out solid."""
    a = np.where(rim(a, 3), a, 1.0)
    parts, _ = label(a > 0, np.ones((3, 3)))
    return a * (parts == np.bincount(parts.ravel())[1:].argmax() + 1)


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
    # there brightens the rim; erode by one source pixel before refitting.
    a = np.minimum.reduce([a, np.roll(a, 1, 0), np.roll(a, -1, 0), np.roll(a, 1, 1), np.roll(a, -1, 1)])
    bg = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), axis=0)
    a = whole(coverage(rgb, whole(tidy(edge(a, rgb))), bg))
    ys, xs = np.where(a > 0.02)
    p = 4
    y0, y1 = max(ys.min() - p, 0), min(ys.max() + p + 1, a.shape[0])
    x0, x1 = max(xs.min() - p, 0), min(xs.max() + p + 1, a.shape[1])
    # A box already in crop.json stays put: the control outlines and the pages'
    # image sizes are measured against it. It only has to still hold the pad.
    if fam in crops:
        x0, y0, x1, y1 = crops[fam]
        if xs.min() < x0 or ys.min() < y0 or xs.max() >= x1 or ys.max() >= y1:
            sys.exit(f"{fam}: the pad no longer fits its box in {CROP}")
    crops[fam] = [int(x0), int(y0), int(x1), int(y1)]
    im = cutout(rgb, a, bg, crops[fam], want)
    im.save(OUT + f"cut-{fam}.png", optimize=True)
    if fam == "ps":
        cutout(unlit(rgb), a, bg, crops[fam], want).save(OUT + "cut-ps-unlit.png", optimize=True)
    if fam != "ps-unlit-dark":  # the picker shows the light DualSense
        t = im.resize((THUMB, round(im.height * THUMB / im.width)), Image.LANCZOS)
        t.save(OUT + f"thumb-{fam}.png", optimize=True)
    print(fam, "native", x1 - x0, "x", y1 - y0, "->", im.size, "bg", bg.round(3), file=sys.stderr)
with open(CROP, "w") as f:
    json.dump(crops, f)
    f.write("\n")
