#!/usr/bin/env -S uv run --script --python 3.12
# /// script
# dependencies = ["sam2", "huggingface_hub", "torch", "numpy", "opencv-python-headless", "pillow"]
# ///
"""Outline every control on the three pads as named SVG paths, for lighting a press.

SAM 2 cuts the part under each prompt in tools/pads/controls/<fam>.json from the
same source pad-cut.py cuts, and the paths are framed to that cutout's box
(tools/pads/crop.json), so an <svg> laid over the <img> at the same size lines up.
A prompt is a point, or {"points", "box"}: the box says how big the part is, so a
point on a letter (A, B, the Xbox logo) does not return the letter, and several
points hold a part in pieces (the PS logo). "split" cuts a one-piece d-pad into
four wedges and "grid" cuts one on its facet lines. "circle" is a measured
stick, everything that tilts. "parts" joins pieces segmented apart (the light
bar's two strips). Names are the site's positional button names (pad-family.js),
so the demo's own state lights them directly; a stick is ls/rs, lit by tilt or click.
Writes src/_includes/art/controls-<fam>.svg and, for judging, an overlay per pad
to scratch/controls/. Usage: scripts/pad-controls.py [ps xb sw xs ds4]
"""
import json
import os
import sys

import cv2
import numpy as np
import torch
from PIL import Image
from sam2.sam2_image_predictor import SAM2ImagePredictor

G = "tools/pads/given/"
SRC = {"ps": "dualsense-src.png", "xb": "xbox elite wireless controller series 2-src.png", "sw": "swpro-src.png",
       "xs": "xbox series-src.png", "ds4": "dualshock4-src.png"}
with open("tools/pads/crop.json") as f:
    CROP = json.load(f)
OUT, CHECK = "src/_includes/art/", "scratch/controls/"


def split(m):
    ys, xs = np.nonzero(m)
    cy, cx = ys.mean(), xs.mean()
    yy, xx = np.mgrid[: m.shape[0], : m.shape[1]]
    dy, dx = yy - cy, xx - cx
    vert = np.abs(dy) >= np.abs(dx)
    return {"up": m & vert & (dy < 0), "down": m & vert & (dy >= 0),
            "left": m & ~vert & (dx < 0), "right": m & ~vert & (dx >= 0)}


def solid(m):
    """Fill holes and drop specks. A textured rim (the Elite's sticks) leaves both;
    pieces at least 5% of the largest stay, since the PS logo is three."""
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
    if n <= 1:
        return m
    big = st[1:, cv2.CC_STAT_AREA].max()
    keep = np.isin(lab, [j for j in range(1, n) if st[j, cv2.CC_STAT_AREA] >= 0.05 * big])
    cs, _ = cv2.findContours(keep.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros(m.shape, np.uint8)
    cv2.drawContours(out, cs, -1, 1, cv2.FILLED)
    return out.astype(bool)


def grid(m, g):
    """The Elite's faceted disc: eight zones and the pivot, cut on its facet lines."""
    (x1, x2), (y1, y2) = g["x"], g["y"]
    yy, xx = np.mgrid[: m.shape[0], : m.shape[1]]
    col = (xx >= x1).astype(int) + (xx >= x2)
    row = (yy >= y1).astype(int) + (yy >= y2)
    names = [["up-left", "up", "up-right"], ["left", "dpad", "right"],
             ["down-left", "down", "down-right"]]
    return {names[r][c]: m & (row == r) & (col == c) for r in range(3) for c in range(3)}


def segment(p, img, prompts):
    H, W = img.shape[:2]
    masks = {}
    for k, v in prompts.items():
        v = v if isinstance(v, dict) else {"points": [v]}
        if "parts" in v:  # one control in separate pieces with something between (the light bar)
            sub_ = segment(p, img, {f"{k}.{j}": q for j, q in enumerate(v["parts"])})
            masks[k] = np.logical_or.reduce(list(sub_.values()))
            continue
        # measured, where SAM misjudges the cap: it stops at the Switch's flat top,
        # and takes the black collar around the Elite's textured cap, which stays put
        if "circle" in v:
            out = np.zeros((H, W), np.uint8)
            cv2.circle(out, v["circle"][:2], v["circle"][2], 1, cv2.FILLED)
            masks[k] = out.astype(bool)
            continue
        pc = np.array(v["points"])
        box = np.array(v["box"]) if "box" in v else None
        multi = box is None and len(pc) == 1
        m, s, _ = p.predict(point_coords=pc, point_labels=np.ones(len(pc)), box=box, multimask_output=multi)
        # the best mask that is a part, not the whole pad (the whole pad is over 15% of the frame)
        _, i = max((sc, j) for j, sc in enumerate(s) if m[j].sum() < 0.15 * H * W)
        # SAM predicts at 256 px and upsamples; a blur before the threshold removes the stair steps
        mk = cv2.GaussianBlur(m[i].astype(np.float32), (0, 0), 1.6) > 0.5
        mk = solid(mk)
        masks.update(grid(mk, v["grid"]) if "grid" in v else split(mk) if v.get("split") else {k: mk})
        print(f"  {k:9s} score {s[i]:.2f}", file=sys.stderr)
    return masks


def svg(fam, masks):
    x0, y0, x1, y1 = CROP[fam]
    paths = []
    for k, m in masks.items():
        cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        d = "".join("M" + " ".join(f"{x - x0},{y - y0}" for x, y in cv2.approxPolyDP(c, 0.8, True)[:, 0]) + "Z"
                    for c in cs if len(c) >= 3)
        paths.append(f'<path data-c="{k}" d="{d}"/>')
    return (f'<svg class="pad-controls" viewBox="0 0 {x1 - x0} {y1 - y0}" aria-hidden="true">'
            + "".join(paths) + "</svg>\n")


def overlay(img, masks):
    ov = img.astype(float)
    rng = np.random.default_rng(3)
    for m in masks.values():
        ov[m] = ov[m] * 0.45 + rng.integers(40, 255, 3) * 0.55
    ov = np.ascontiguousarray(ov.astype(np.uint8))
    for m in masks.values():
        cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(ov, cs, -1, (255, 0, 0), 2)
    return Image.fromarray(ov)


dev = "mps" if torch.backends.mps.is_available() else "cpu"
p = SAM2ImagePredictor.from_pretrained("facebook/sam2.1-hiera-large", device=dev)
os.makedirs(CHECK, exist_ok=True)
for fam in sys.argv[1:] or SRC:
    print(fam, file=sys.stderr)
    img = np.asarray(Image.open(G + SRC[fam]).convert("RGB"))
    with torch.inference_mode():
        p.set_image(img)
        with open(f"tools/pads/controls/{fam}.json") as f:
            masks = segment(p, img, json.load(f))
    out = svg(fam, masks)
    with open(f"{OUT}controls-{fam}.svg", "w") as f:
        f.write(out)
    overlay(img, masks).save(f"{CHECK}{fam}.png")
    print(f"  {len(masks)} paths, {len(out) / 1024:.1f} KB", file=sys.stderr)
