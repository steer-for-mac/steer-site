# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Colour regions measured from a reference cutout (never shipped): binary masks
cropped to the reference's alpha bbox. masks.py REF OUTPREFIX"""
import sys, cv2, numpy as np
ref = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED); out = sys.argv[2]
a = ref[:, :, 3] > 127
ys, xs = np.nonzero(a); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
ref = ref[y0:y1, x0:x1]; a = a[y0:y1, x0:x1]
hsv = cv2.cvtColor(ref[:, :, :3], cv2.COLOR_BGR2HSV)
v = hsv[:, :, 2].astype(int); s = hsv[:, :, 1].astype(int); h = hsv[:, :, 0].astype(int)
dark = a & (v < 110) & (s < 90)
blue = a & (s > 90) & (h > 95) & (h < 135) & (v > 60)
k = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
dark = cv2.morphologyEx(dark.astype(np.uint8) * 255, cv2.MORPH_CLOSE, k(9))
dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, k(5))
# keep big components only: the panel and the triggers, not specks of shadow
n, lab, st, _ = cv2.connectedComponentsWithStats(dark)
keep = np.zeros_like(dark)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] > 0.0008 * dark.size: keep[lab == i] = 255
blue = cv2.morphologyEx(blue.astype(np.uint8) * 255, cv2.MORPH_CLOSE, k(5))
n, lab, st, _ = cv2.connectedComponentsWithStats(blue)
big = sorted(range(1, n), key=lambda i: -st[i, cv2.CC_STAT_AREA])[:2]
blue = np.isin(lab, big).astype(np.uint8) * 255
# extra boxes (fractions of the bbox) where a looser threshold applies: the
# triggers are black but carry bright highlights, so the strict test drops them
import json as _j
for bx in _j.loads(sys.argv[3]) if len(sys.argv) > 3 else []:
    H_, W_ = keep.shape; x0_, y0_, x1_, y1_ = int(bx[0] * W_), int(bx[1] * H_), int(bx[2] * W_), int(bx[3] * H_)
    sub = a[y0_:y1_, x0_:x1_] & (v[y0_:y1_, x0_:x1_] < bx[4])
    sub = cv2.morphologyEx(sub.astype(np.uint8) * 255, cv2.MORPH_CLOSE, k(15))
    keep[y0_:y1_, x0_:x1_] |= sub
# fill holes: flood from the border, what is not reached and not kept is a hole
ff = cv2.copyMakeBorder(keep, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
m = np.zeros((ff.shape[0] + 2, ff.shape[1] + 2), np.uint8); cv2.floodFill(ff, m, (0, 0), 255)
keep = keep | cv2.bitwise_not(ff[1:-1, 1:-1])
cv2.imwrite(out + "-dark.png", keep); cv2.imwrite(out + "-blue.png", blue)
print("bbox", x0, y0, x1 - x0, y1 - y0, "dark", (keep > 0).mean().round(3), "blue", (blue > 0).mean().round(4))

for nm, mk in (("dark", keep), ("blue", blue)):
    cv2.imwrite(out + f"-{nm}-soft.png", cv2.GaussianBlur(mk, (0, 0), 1.2))
