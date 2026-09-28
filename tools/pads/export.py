#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow", "numpy"]
# ///
"""The front renders into the per-app band: pads, picker thumbs, chip positions.

    tools/pads/export.py [RENDER_DIR]   (default tools/pads/final; run from the repo root)

Each pad is cropped to its alpha and written at 2x the size it is drawn at in
the band's 601x401 slot (object-fit: contain), the thumb at 2x the picker's
76x54 box. PNG masters: the build's image transform serves AVIF and WebP.

The chips are placed from the render's object-ID pass, not by eye: each
control's box is measured from its own pixels, and its chip goes on the side
RULES names, a gap clear of that box, sized by the chip it prints (CHIP, read
off the built page at 1440). The shoulders are hidden behind the bumpers in a
front view, so their chips sit above the pad (y below 0), over its top corners.
The result replaces `slot` and `controls` in src/_data/perapp.json, and a
check image per pad (every box and chip drawn) goes to tools/pads/out/.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "final"
REPO = HERE.parent.parent
OUT = REPO / "src/assets/pads"
DATA = REPO / "src/_data/perapp.json"
SLOT = (601, 401)  # CSS px, the slot at its widest (1280 and up)
THUMB = (76, 54)  # CSS px, .pa-pick-l img
GAP = 5  # CSS px between a control's box and its chip

PADS = {
    "ps": ("ps-white", "DualSense"),
    "xb": ("xb-black", "Xbox Elite Series 2"),
    "sw": ("sw-black", "Switch Pro Controller"),
}
# chip size in CSS px at 1440 (the widest the control's chip prints on any tab)
CHIP = {"lstick": 85, "rstick": 92, "dpad-up": 55, "dpad-left": 55, "dpad-right": 55}
# control -> (the ID-pass parts that make its box, the side its chip goes)
FACE = {"cross": "face-down", "circle": "face-right", "triangle": "face-up", "square": "face-left"}
RULES = {
    "ps": {
        "lstick": (["stick-l", "stick-l-base"], "s"), "l3": (["stick-l", "stick-l-base"], "w"),
        "rstick": (["stick-r", "stick-r-base"], "s"), "r3": (["stick-r", "stick-r-base"], "e"),
        "cross": (["face-down"], "se"), "circle": (["face-right"], "e"),
        "triangle": (["face-up"], "n"), "square": (["face-left"], "w"),
        "dpad-up": (["dpad"], "n"), "dpad-left": (["dpad"], "w"), "dpad-right": (["dpad"], "w"),
    },
    "xb": {
        "lstick": (["stick-l", "stick-l-base"], "n"), "l3": (["stick-l", "stick-l-base"], "w"),
        "rstick": (["stick-r", "stick-r-base"], "s"), "r3": (["stick-r", "stick-r-base"], "e"),
        "cross": (["face-down"], "se"), "circle": (["face-right"], "e"),
        "triangle": (["face-up"], "n"), "square": (["face-left"], "nw"),
        "dpad-up": (["dpad", "dpad-base"], "w"), "dpad-left": (["dpad", "dpad-base"], "s"), "dpad-right": (["dpad", "dpad-base"], "s"),
    },
    "sw": {
        "lstick": (["stick-l", "stick-l-base"], "sw"), "l3": (["stick-l", "stick-l-base"], "w"),
        "rstick": (["stick-r", "stick-r-base"], "s"), "r3": (["stick-r", "stick-r-base"], "e"),
        "cross": (["face-down"], "se"), "circle": (["face-right"], "e"),
        "triangle": (["face-up"], "e"), "square": (["face-left"], "n"),
        "dpad-up": (["dpad"], "w"), "dpad-left": (["dpad"], "s"), "dpad-right": (["dpad"], "s"),
    },
}
# The shoulders, over the pad's top corners: x as a fraction of the pad's width.
SHOULDER = {"l2": 0.08, "l1": 0.2, "r1": 0.8, "r2": 0.92}
DIRS = {"n": (0, -1), "s": (0, 1), "e": (1, 0), "w": (-1, 0), "ne": (1, -1), "nw": (-1, -1), "se": (1, 1), "sw": (-1, 1)}


def chip_size(c):
    return CHIP.get(c, 28), 26


def place(box, side, w, h):
    """Centre of a w x h chip on `side` of box (x0, y0, x1, y1), GAP clear of it."""
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = DIRS[side]
    return (cx + dx * ((x1 - x0) / 2 + GAP + w / 2), cy + dy * ((y1 - y0) / 2 + GAP + h / 2))


def css(tf, x, y):
    """Source px -> CSS px in the slot."""
    ox, oy, x0, y0, s = tf
    return ox + (x - x0) * s, oy + (y - y0) * s


def part_box(ids, legend, tf, parts):
    """The CSS-px box of the named parts' visible pixels, or None if all are hidden."""
    ys, xs = np.nonzero(np.isin(ids, [legend[q] for q in parts if q in legend]))
    if not len(xs):
        return None
    return (*css(tf, xs.min(), ys.min()), *css(tf, xs.max() + 1, ys.max() + 1))


slot, controls, report, clash = {}, {}, {}, []
OUT.mkdir(parents=True, exist_ok=True)
(HERE / "out").mkdir(exist_ok=True)
for fam, (name, alt) in PADS.items():
    im = Image.open(SRC / f"{name}-front.png").convert("RGBA")
    ids = np.asarray(Image.open(SRC / f"{name}-front-ids.png").convert("RGB")).astype(np.int32)
    ids = ids[..., 0] * 256 + ids[..., 1]
    legend = json.loads((SRC / f"{name}-front-ids.json").read_text())
    x0, y0, x1, y1 = im.getbbox()
    p = 6  # source px of air, so the resample has a clean edge to work with
    x0, y0, x1, y1 = max(x0 - p, 0), max(y0 - p, 0), min(x1 + p, im.width), min(y1 + p, im.height)
    crop = im.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    # contained in the slot: the CSS px it is drawn at, and the scale from source px
    s = min(SLOT[0] / cw, SLOT[1] / ch)
    dw, dh = cw * s, ch * s
    ox, oy = (SLOT[0] - dw) / 2, (SLOT[1] - dh) / 2
    w2 = round(dw * 2)
    pad = crop.resize((w2, round(ch * w2 / cw)), Image.LANCZOS)
    pad.save(OUT / f"cut-{fam}.png", optimize=True)
    t = min(THUMB[0] / cw, THUMB[1] / ch) * 2
    th = crop.resize((round(cw * t), round(ch * t)), Image.LANCZOS)
    th.save(OUT / f"thumb-{fam}.png", optimize=True)
    slot[fam] = {"src": f"assets/pads/cut-{fam}.png", "w": pad.width, "h": pad.height, "alt": alt,
                 "thumb": f"assets/pads/thumb-{fam}.png", "tw": th.width, "th": th.height}

    tf = (ox, oy, x0, y0, s)

    at, boxes, chips = {}, {}, {}
    for c, (parts, side) in RULES[fam].items():
        box = boxes[c] = part_box(ids, legend, tf, parts)
        if box is None:
            sys.exit(f"{fam}: no pixels for {parts} in the ID pass")
        w, h = chip_size(c)
        at[c] = place(box, side, w, h)
    top = css(tf, 0, im.getbbox()[1])[1]  # the pad's top edge in CSS px
    for c, f in SHOULDER.items():
        w, h = chip_size(c)
        at[c] = (ox + dw * f, top - GAP - h / 2)
    controls[fam] = {c: {"x": round(x / SLOT[0] * 100, 1), "y": round(y / SLOT[1] * 100, 1)} for c, (x, y) in at.items()}

    # check image: the pad at 2x in the slot on the night, each control's box and chip
    k = 2
    cv = Image.new("RGBA", (SLOT[0] * k, (SLOT[1] + 40) * k), (14, 16, 22, 255))
    cv.alpha_composite(pad.resize((round(dw * k), round(dh * k))), (round(ox * k), round((oy + 40) * k)))
    dr = ImageDraw.Draw(cv)
    for c, (x, y) in at.items():
        w, h = chip_size(c)
        r = [(x - w / 2) * k, (y - h / 2 + 40) * k, (x + w / 2) * k, (y + h / 2 + 40) * k]
        dr.rounded_rectangle(r, 6 * k, outline=(80, 160, 255, 255), width=2)
        dr.text((r[0] + 4, r[1] + 4), c, fill=(80, 160, 255, 255))
        if c in boxes:
            b = boxes[c]
            dr.rectangle([b[0] * k, (b[1] + 40) * k, b[2] * k, (b[3] + 40) * k], outline=(255, 120, 60, 255))
        chips[c] = [x - w / 2, y - h / 2, x + w / 2, y + h / 2]
    cv.save(HERE / "out" / f"chips-{fam}.png")
    # A chip may not cover any control, nor another chip (the left/right pair is one mark).
    hit = lambda a, b: a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
    solid = {q: part_box(ids, legend, tf, [q]) for q in legend if not q.startswith(("shell", "grip", "speaker"))}
    solid = {q: b for q, b in solid.items() if b}  # hidden behind another part
    for c, r in chips.items():
        clash += [f"{fam} {c} covers {q}" for q, b in solid.items() if hit(r, b)]
        clash += [f"{fam} {c} meets {d}" for d, o in chips.items() if c < d and o != r and hit(r, o)]
    report[fam] = {"boxes": boxes, "chips": chips}
    print(fam, "pad", pad.size, "thumb", th.size, "drawn", round(dw), "x", round(dh), file=sys.stderr)

(HERE / "out" / "chips.json").write_text(json.dumps(report, indent=1))
if clash:
    sys.exit("\n".join(clash))


def block(obj, indent, inner):
    rows = [f'{" " * inner}"{k}": {json.dumps(v, separators=(", ", ": "), ensure_ascii=False)}' for k, v in obj.items()]
    return "{\n" + ",\n".join(rows) + "\n" + " " * indent + "}"


text = DATA.read_text()
text = re.sub(r'"slot": \{.*?\n  \},\n', lambda _: '"slot": ' + block(slot, 2, 4) + ",\n", text, count=1, flags=re.DOTALL)
ctl = "{\n" + ",\n".join(f'    "{f}": ' + block(v, 4, 6) for f, v in controls.items()) + "\n  }"
text = re.sub(r'"controls": \{.*?\n  \},\n', lambda _: '"controls": ' + ctl + ",\n", text, count=1, flags=re.DOTALL)
json.loads(text)
DATA.write_text(text)
