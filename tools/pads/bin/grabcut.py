# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Silhouette of a photo by GrabCut from a rect: grabcut.py IN OUT_RGBA x0 y0 x1 y1"""
import sys, cv2, numpy as np
im = cv2.imread(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[3:7])
m = np.zeros(im.shape[:2], np.uint8); bg = np.zeros((1, 65), np.float64); fg = np.zeros((1, 65), np.float64)
cv2.grabCut(im, m, (x0, y0, x1 - x0, y1 - y0), bg, fg, 8, cv2.GC_INIT_WITH_RECT)
mask = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(mask)
big = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); mask = np.where(lab == big, 255, 0).astype(np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
out = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA); out[:, :, 3] = mask
cv2.imwrite(sys.argv[2], out)
