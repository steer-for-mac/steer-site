# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Zoomed crop with a pixel grid in the image's own coordinates, for labelling.
    crop.py IMG OUT x0 y0 x1 y1 [zoom] [step]  -- optional circles: --c x,y,r ..."""
import sys, cv2, numpy as np
a = sys.argv; im = cv2.imread(a[1], cv2.IMREAD_UNCHANGED)
if im.dtype == np.uint16: im = (im / 257).astype(np.uint8)
if im.shape[2] == 4:
    al = im[:, :, 3:4] / 255.0; im = (im[:, :, :3] * al + np.array([255, 0, 255]) * (1 - al)).astype(np.uint8)
x0, y0, x1, y1 = map(int, a[3:7]); z = float(a[7]) if len(a) > 7 and not a[7].startswith("--") else 3
st = int(a[8]) if len(a) > 8 and not a[8].startswith("--") else 10
c = cv2.resize(im[y0:y1, x0:x1], None, fx=z, fy=z, interpolation=cv2.INTER_NEAREST)
for x in range((x0 // st + 1) * st, x1, st):
    X = int((x - x0) * z); big = x % (st * 5) == 0
    cv2.line(c, (X, 0), (X, c.shape[0]), (0, 200, 255) if big else (0, 120, 0), 1)
    if big: cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // st + 1) * st, y1, st):
    Y = int((y - y0) * z); big = y % (st * 5) == 0
    cv2.line(c, (0, Y), (c.shape[1], Y), (0, 200, 255) if big else (0, 120, 0), 1)
    if big: cv2.putText(c, str(y), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
if "--c" in a:
    for t in a[a.index("--c") + 1:]:
        x, y, r = map(float, t.split(",")); cv2.circle(c, (int((x - x0) * z), int((y - y0) * z)), int(r * z), (0, 0, 255), 1)
cv2.imwrite(a[2], c)
