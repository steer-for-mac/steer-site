# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
import cv2, numpy as np, glob, json, sys
D = "out/gripfit"; px = 0.25
body = cv2.imread(f"{D}/body.png", cv2.IMREAD_UNCHANGED)[:, :, 3] > 127
refs = {k: cv2.imread(f"ref/{k}-mask.png", 0) > 127 for k in ("swpro-zelda-cut", "cut-sw")}
def bbox(m):
    ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
def iou(m, ref):
    x0, y0, x1, y1 = bbox(ref); rc = ref[y0:y1, x0:x1]
    a0, b0, a1, b1 = bbox(m); r = cv2.resize(m[b0:b1, a0:a1].astype(np.uint8), (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST) > 0
    return (r & rc).sum() / (r | rc).sum()
def shift(m, dx, dy):
    M = np.float32([[1, 0, dx], [0, 1, dy]]); return cv2.warpAffine(m.astype(np.uint8), M, m.shape[::-1]) > 0
print("body only", {k: round(iou(body, r), 4) for k, r in refs.items()})
best = []
for f in sorted(glob.glob(f"{D}/grip-*.png")):
    g = cv2.imread(f, cv2.IMREAD_UNCHANGED)[:, :, 3] > 127
    rz = int(f.split("-")[-1][:-4])
    for dx in np.arange(-50, -28, 1.0):
        for dy in np.arange(-30, -8, 1.0):
            gl = shift(g, dx / px, -dy / px); gr = gl[:, ::-1]
            u = body | gl | gr
            s = {k: iou(u, r) for k, r in refs.items()}
            best.append((s["swpro-zelda-cut"], s["cut-sw"], rz, dx, dy))
best.sort(reverse=True)
for b in best[:8]: print([round(v, 4) if isinstance(v, float) else v for v in b])
