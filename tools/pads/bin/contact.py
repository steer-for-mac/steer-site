# /// script
# dependencies = ["pillow"]
# ///
"""Before/after contact sheet on the site's stage (#222325): per pad, front and hero.
    contact.py OUT"""
import sys
from PIL import Image, ImageDraw, ImageFont
STAGE = (0x22, 0x23, 0x25); T = 560; PAD = 24
pads = [("ps", "white", "DualSense"), ("xb", "black", "Xbox Series"), ("sw", "black", "Switch Pro (2017)")]
cols = [("diff/before/{p}-{c}-front.png", "before · front"), ("final/{p}-{c}-front.png", "after · front"),
        ("diff/before/{p}-{c}-hero.png", "before · hero"), ("final/{p}-{c}-hero.png", "after · hero")]
try: font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
except OSError: font = ImageFont.load_default()
sheet = Image.new("RGB", (PAD + len(cols) * (T + PAD), PAD + 40 + len(pads) * (T * 3 // 4 + 40 + PAD)), STAGE)
d = ImageDraw.Draw(sheet)
for j, (_, lab) in enumerate(cols): d.text((PAD + j * (T + PAD), PAD), lab, fill=(200, 200, 205), font=font)
for i, (p, c, name) in enumerate(pads):
    y = PAD + 40 + i * (T * 3 // 4 + 40 + PAD)
    d.text((PAD, y), name, fill=(235, 235, 240), font=font)
    for j, (pat, _) in enumerate(cols):
        im = Image.open(pat.format(p=p, c=c)).convert("RGBA"); im = im.crop(im.getbbox()); im.thumbnail((T, T * 3 // 4), Image.LANCZOS)
        sheet.paste(im, (PAD + j * (T + PAD) + (T - im.width) // 2, y + 32 + (T * 3 // 4 - im.height) // 2), im)
sheet.save(sys.argv[1])
