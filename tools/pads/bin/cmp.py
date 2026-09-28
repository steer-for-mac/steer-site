# /// script
# dependencies = ["pillow"]
# ///
"""Side-by-side 200% zoom on the stage: current cutout vs render, both shown at the
site's display width (DISP device px). cmp.py REF RENDER OUT fx fy [DISP]
fx, fy: crop centre as fractions of the pad."""
import sys
from PIL import Image, ImageDraw
ref, ren, out = sys.argv[1:4]; fx, fy = float(sys.argv[4]), float(sys.argv[5])
D = int(sys.argv[6]) if len(sys.argv) > 6 else 1400
STAGE = (0x22, 0x23, 0x25, 255)
def at_display(p):
    im = Image.open(p).convert("RGBA"); im = im.crop(im.getbbox())
    im = im.resize((D, round(im.height * D / im.width)), Image.LANCZOS)  # what the browser does
    bg = Image.new("RGBA", im.size, STAGE); bg.alpha_composite(im); return bg
cw, ch = 360, 260
tiles = []
for p, label in ((ref, "current cutout"), (ren, "render")):
    im = at_display(p); cx, cy = int(fx * im.width), int(fy * im.height)
    c = im.crop((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2)).resize((cw * 2, ch * 2), Image.NEAREST)
    d = ImageDraw.Draw(c); d.rectangle((0, 0, 250, 22), fill=(0, 0, 0, 200)); d.text((6, 5), f"{label} @ {D}px, 200%", fill=(255, 255, 255))
    tiles.append(c)
s = Image.new("RGBA", (cw * 4 + 12, ch * 2), STAGE); s.alpha_composite(tiles[0], (0, 0)); s.alpha_composite(tiles[1], (cw * 2 + 12, 0))
s.convert("RGB").save(out)
