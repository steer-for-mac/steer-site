# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Silhouette diff, bbox-registered: grey both, red ref only, green render only. silcmp.py RENDER REFMASK OUT"""
import sys, cv2, numpy as np
def bbox(m):
    ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
r = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED)[:, :, 3] > 127; ref = cv2.imread(sys.argv[2], 0) > 127
x0, y0, x1, y1 = bbox(ref); rc = ref[y0:y1, x0:x1]; a0, b0, a1, b1 = bbox(r)
rr = cv2.resize(r[b0:b1, a0:a1].astype(np.uint8), (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA) > 0
ov = np.zeros((*rc.shape, 3), np.uint8); ov[rc & rr] = 128; ov[rc & ~rr] = (0, 0, 255); ov[rr & ~rc] = (0, 255, 0)
cv2.imwrite(sys.argv[3], ov); print("iou", round((rc & rr).sum() / (rc | rr).sum(), 4))
