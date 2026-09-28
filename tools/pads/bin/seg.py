# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Silhouette of a photo: GrabCut from a rect, plus hint polygons, holes filled.
    seg.py IN OUT_RGBA x0 y0 x1 y1 [--bg 'x,y x,y ...']... [--fg 'x,y ...']..."""
import sys, cv2, numpy as np
a = sys.argv; im = cv2.imread(a[1]); x0, y0, x1, y1 = map(int, a[3:7])
m = np.zeros(im.shape[:2], np.uint8); m[y0:y1, x0:x1] = cv2.GC_PR_FGD
for i, k in enumerate(a):
    if k in ("--bg", "--fg"):
        pts = np.array([[int(float(v)) for v in p.split(",")] for p in a[i + 1].split()], np.int32)
        cv2.fillPoly(m, [pts], cv2.GC_BGD if k == "--bg" else cv2.GC_FGD)
bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
cv2.grabCut(im, m, None, bg, fg, 10, cv2.GC_INIT_WITH_MASK)
mask = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(mask)
mask = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
ff = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
fm = np.zeros((ff.shape[0] + 2, ff.shape[1] + 2), np.uint8); cv2.floodFill(ff, fm, (0, 0), 255)
mask |= cv2.bitwise_not(ff[1:-1, 1:-1])
out = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA); out[:, :, 3] = mask
cv2.imwrite(a[2], out)
