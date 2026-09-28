#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow"]
# ///
"""Cut the play demo's app-ring icons out of our own capture of the app.

The icons are Apple's, so the demo shows them only as they appear in a
screenshot of Steer's own Radial Menu (assets/desk-radial.jpg), never from
Apple's artwork. The capture is 2x; the ring's centre and item radius come from
RadialMenu.swift for nine items: radius 172pt, items at 0.62 of it, so 213.3px
from (764, 574). Music is the aimed item in the capture and drawn larger, and
Mail leans toward it, hence their own sizes.

Usage:  scripts/ring-icons.py   (from the repo root; needs cwebp on PATH)
Output: src/assets/ring-icons.webp, nine 88px cells in RadialMenuDefaults order.
"""

import math
import subprocess
import tempfile

from PIL import Image, ImageDraw

SRC = "src/assets/desk-radial.jpg"
OUT = "src/assets/ring-icons.webp"
NAMES = ["safari", "finder", "music", "mail", "calendar", "notes", "messages", "settings", "maps"]
SIZE = {"music": 110, "mail": 88}  # everything else is 85px in the capture
CX, CY, R = 764, 574, 172 * 0.62 * 2
CELL, SS = 88, 8


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    # The capture's own squircle corners carry the blurred Launchpad behind the
    # ring, so each tile is re-masked 1px inside its edge.
    mask = Image.new("L", (CELL * SS, CELL * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (SS, SS, (CELL - 1) * SS - 1, (CELL - 1) * SS - 1), radius=int(0.225 * (CELL - 2) * SS), fill=255
    )
    mask = mask.resize((CELL, CELL), Image.LANCZOS)
    sheet = Image.new("RGBA", (CELL * len(NAMES), CELL), (0, 0, 0, 0))
    for i, name in enumerate(NAMES):
        a = i * 2 * math.pi / len(NAMES)
        x, y = CX + math.sin(a) * R, CY - math.cos(a) * R
        s = SIZE.get(name, 85)
        tile = im.crop((x - s / 2, y - s / 2, x + s / 2, y + s / 2)).resize((CELL, CELL), Image.LANCZOS).convert("RGBA")
        tile.putalpha(mask)
        sheet.paste(tile, (CELL * i, 0))
    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        sheet.save(tmp.name)
        subprocess.run(["cwebp", "-quiet", "-q", "88", "-alpha_q", "100", tmp.name, "-o", OUT], check=True)


if __name__ == "__main__":
    main()
