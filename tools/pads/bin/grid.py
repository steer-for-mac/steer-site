# /// script
# dependencies = ["pillow"]
# ///
"""Overlay a mm grid on a front render using the report's map. grid.py RENDER REPORT OUT [step]"""
import sys, json
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert("RGBA"); rep = json.load(open(sys.argv[2]))
x0, y0, x1, y1 = rep["maps"][sys.argv[5] if len(sys.argv) > 5 else "front"]; step = float(sys.argv[4]) if len(sys.argv) > 4 else 5
bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); d = ImageDraw.Draw(bg)
W, H = im.size
px = lambda x: (x - x0) / (x1 - x0) * W; py = lambda y: (y0 - y) / (y0 - y1) * H
import math
x = math.floor(x0 / step) * step
while x <= x1:
    major = abs(x) % (step * 2) < 1e-6
    d.line([(px(x), 0), (px(x), H)], fill=(255, 0, 0, 160) if major else (255, 150, 150, 90), width=1)
    if major: d.text((px(x) + 2, 2), f"{x:g}", fill=(200, 0, 0))
    x += step
y = math.floor(y1 / step) * step
while y <= y0:
    major = abs(y) % (step * 2) < 1e-6
    d.line([(0, py(y)), (W, py(y))], fill=(0, 0, 255, 160) if major else (150, 150, 255, 90), width=1)
    if major: d.text((2, py(y) + 2), f"{y:g}", fill=(0, 0, 200))
    y += step
bg.convert("RGB").save(sys.argv[3])
