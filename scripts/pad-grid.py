#!/usr/bin/env python3
"""Draw a 5% grid over each pad photo, contained in the per-app band's 3:2 slot.

perapp.json `controls` and `hold` are read off these, one family at a time, so
a picture that changes needs its grid redrawn and its positions re-read.
Usage: scripts/pad-grid.py [outdir]   (default scratch/grid; needs Pillow)
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

W, H = 1200, 800  # the slot is 3:2; object-fit: contain, centred
out = Path(sys.argv[1] if len(sys.argv) > 1 else "scratch/grid")
out.mkdir(parents=True, exist_ok=True)
for fam in ("ps", "xb", "sw"):
    pad = Image.open(f"src/assets/pads/cut-{fam}.png").convert("RGBA")
    s = min(W / pad.width, H / pad.height)
    pad = pad.resize((round(pad.width * s), round(pad.height * s)))
    img = Image.new("RGBA", (W, H), (200, 205, 215, 255))
    img.alpha_composite(pad, ((W - pad.width) // 2, (H - pad.height) // 2))
    d = ImageDraw.Draw(img)
    for i in range(0, 101, 5):
        col = (255, 0, 0, 255) if i % 10 == 0 else (255, 140, 0, 160)
        d.line([(W * i / 100, 0), (W * i / 100, H)], fill=col)
        d.line([(0, H * i / 100), (W, H * i / 100)], fill=col)
        if i % 10 == 0:
            d.text((W * i / 100 + 2, 2), str(i), fill=col)
            d.text((2, H * i / 100 + 2), str(i), fill=col)
    img.save(out / f"grid-{fam}.png")
    print(out / f"grid-{fam}.png")
