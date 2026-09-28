# /// script
# dependencies = ["pillow"]
# ///
"""Composite a transparent render on the site's dark stage for looking at. stage.py IN OUT [maxw]"""
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
if len(sys.argv) > 3:
    w = int(sys.argv[3]); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
pad = im.width // 20
bg = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0x22, 0x23, 0x25, 255))
bg.alpha_composite(im, (pad, pad)); bg.convert("RGB").save(sys.argv[2])
