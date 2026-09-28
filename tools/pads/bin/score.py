#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Score a render against the reference, bbox-registered (the colourways
register by bbox, per pad-art-brief §5).

    score.py RENDER.png REF_IMAGE REF_MASK OUT_OVERLAY.png [--shift N]

silhouette IoU: render alpha vs reference mask.
edge chamfer:   interior Canny edges, symmetric mean distance, in % of shell width.
--shift N moves the render N px right after registration: the negative control.
"""
import sys, json, cv2, numpy as np
render_p, ref_p, mask_p, out_p = sys.argv[1:5]
shift = int(sys.argv[sys.argv.index("--shift") + 1]) if "--shift" in sys.argv else 0

def bbox(m):
    ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

ref = cv2.imread(ref_p, cv2.IMREAD_COLOR)
rm = cv2.imread(mask_p, cv2.IMREAD_GRAYSCALE) > 127
x0, y0, x1, y1 = bbox(rm); W, H = x1 - x0, y1 - y0
ref_c = ref[y0:y1, x0:x1]; rm_c = rm[y0:y1, x0:x1]

r = cv2.imread(render_p, cv2.IMREAD_UNCHANGED)
if r.shape[2] == 4:
    alpha = r[:, :, 3] > 127; rgb = r[:, :, :3].astype(float) * (r[:, :, 3:4] / 255.0)
else:  # no alpha: treat non-white as subject (the negative-control path)
    alpha = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY) < 245; rgb = r.astype(float)
a0, b0, a1, b1 = bbox(alpha)
rg = cv2.resize(rgb[b0:b1, a0:a1].astype(np.uint8), (W, H), interpolation=cv2.INTER_AREA)
ra = cv2.resize(alpha[b0:b1, a0:a1].astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST) > 0
if shift:
    M = np.float32([[1, 0, shift], [0, 1, 0]])
    rg = cv2.warpAffine(rg, M, (W, H)); ra = cv2.warpAffine(ra.astype(np.uint8), M, (W, H)) > 0

iou = (ra & rm_c).sum() / (ra | rm_c).sum()

def edges(img, shellmask):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.createCLAHE(clipLimit=6.0, tileGridSize=(8, 8)).apply(g)
    e = cv2.Canny(cv2.GaussianBlur(g, (5, 5), 0), 45, 120) > 0
    inner = cv2.erode(shellmask.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    return e & inner

er, eg = edges(ref_c, rm_c), edges(rg, rm_c)
dt_ref = cv2.distanceTransform((~er).astype(np.uint8), cv2.DIST_L2, 5)
dt_gen = cv2.distanceTransform((~eg).astype(np.uint8), cv2.DIST_L2, 5)
cham = 0.5 * (dt_ref[eg].mean() + dt_gen[er].mean()) if eg.any() and er.any() else float("nan")
# share of reference edges with a generated edge within 1% of width
recall = (dt_gen[er] < 0.01 * W).mean() if er.any() else float("nan")

ov = ref_c.copy() // 3
ov[er] = (0, 0, 255); ov[eg] = (0, 255, 0); ov[er & (dt_gen < 0.01 * W)] = (0, 255, 255)
cv2.imwrite(out_p, ov)
res = dict(render=render_p.split("/")[-1], shift=shift, iou=round(float(iou), 4),
           chamfer_pct_w=round(float(cham) / W * 100, 3), edge_recall_1pct=round(float(recall), 3),
           ref_edges=int(er.sum()), gen_edges=int(eg.sum()), W=int(W), H=int(H))
print(json.dumps(res))
