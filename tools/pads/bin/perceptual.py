# /// script
# dependencies = ["opencv-python-headless", "numpy", "scipy", "scikit-image", "pillow", "lpips", "torch", "torchvision"]
# ///
"""Perceptual gate: a front render against the photo it replaces, at the size it is drawn.

    perceptual.py PAD RENDER_DIR OUT_DIR [--ref IMG] [--tag T] [--control]

The render is registered to the reference by a similarity transform fitted to the two
silhouettes, both are composited on the band's #222325 stage, and the pair is resampled
so the pad is 1200 px wide: the 600 CSS px slot at 2x. There it measures
  ssim   structural similarity inside the pad (1 = identical)
  lpips  AlexNet LPIPS over the crop (0 = identical; lower is better)
  acut   edge acutance, render / photo: the median of gradient over local contrast on
         the photo's own edges and the render's (1 = as crisp; below 1 is softer)
and writes the side-by-side sheet (photo | render, and 200% crops of a stick, the face
buttons and an edge) to OUT_DIR/PAD{tag}-sheet.png, numbers to OUT_DIR/PAD{tag}.json.

Two anchors put the numbers on a scale. `jnd` is the photo against itself sent through
half resolution and back (a mild softening a viewer barely notices at this size): a render
at or under it is as close as the photo is to a softened copy of itself. --control also
scores the render blurred (sigma 2 px at 1200) and must see LPIPS and acutance get worse, or
the harness is not measuring what it claims and the script exits 1.
"""
import sys, os, json, math, warnings
warnings.filterwarnings("ignore")
import cv2, numpy as np
from scipy.optimize import minimize
from skimage.metrics import structural_similarity
from PIL import Image

a = sys.argv
pad, rdir, odir = a[1], a[2], a[3]
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = a[a.index("--ref") + 1] if "--ref" in a else os.path.join(HERE, "ref", f"cut-{pad}.png")
TAG = a[a.index("--tag") + 1] if "--tag" in a else ""
CW = {"ps": "white", "xb": "black", "sw": "black"}[pad]
STAGE = np.array([0x22, 0x23, 0x25], np.float32) / 255
DRAWN = 1200
os.makedirs(odir, exist_ok=True)

def load(p):
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    im = im.astype(np.float32) / (65535.0 if im.dtype == np.uint16 else 255.0)
    if im.ndim == 2: im = np.dstack([im] * 3)
    if im.shape[2] == 3: im = np.dstack([im, np.ones(im.shape[:2], np.float32)])
    return np.dstack([im[:, :, 2], im[:, :, 1], im[:, :, 0], im[:, :, 3]])

ref = load(REF); ren = load(os.path.join(rdir, f"{pad}-{CW}-front.png"))
idp = os.path.join(rdir, f"{pad}-{CW}-front-ids.png")
IDS = LEG = None
if os.path.exists(idp):
    ii = np.asarray(Image.open(idp)); IDS = ii[:, :, 0].astype(int) * 256 + ii[:, :, 1]; IDS[ii[:, :, 3] == 0] = 0
    LEG = json.load(open(idp[:-4] + ".json"))

def bbox(m):
    ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

# ---- registration: render -> reference frame, silhouette IoU, coarse then fine
H, W = ref.shape[:2]; ra = ref[:, :, 3] > 0.5; Ra = (ren[:, :, 3] > 0.5).astype(np.uint8)
rb, gb = bbox(ra), bbox(Ra)
s0 = (rb[2] - rb[0]) / (gb[2] - gb[0])
p0 = np.array([math.log(s0), 0.0, rb[0] - s0 * gb[0], rb[1] - s0 * gb[1]])
def sim(p):
    s = math.exp(p[0]); c, n = math.cos(p[1]), math.sin(p[1])
    return np.array([[s * c, -s * n, p[2]], [s * n, s * c, p[3]]], np.float64)
def fit(p, k):
    small = (int(W * k), int(H * k))
    rs = cv2.resize(ra.astype(np.uint8), small, interpolation=cv2.INTER_AREA) > 0
    def cost(p):
        M = sim(p) * k; w = cv2.warpAffine(Ra, M, small, flags=cv2.INTER_NEAREST) > 0
        return 1 - (w & rs).sum() / (w | rs).sum()
    r = minimize(cost, p, method="Nelder-Mead", options=dict(xatol=1e-4, fatol=1e-7, maxiter=3000,
                 initial_simplex=[p, p + [0.01, 0, 0, 0], p + [0, 0.01, 0, 0], p + [0, 0, 4, 0], p + [0, 0, 0, 4]]))
    return r.x, 1 - r.fun
p, _ = fit(p0, 400 / W)
p, iou = fit(p, min(1.0, 1200 / W))
M = sim(p)

# ---- both on the stage at the drawn size
f = DRAWN / (rb[2] - rb[0])
mg = int(0.03 * (rb[2] - rb[0]))
x0, y0, x1, y1 = max(0, rb[0] - mg), max(0, rb[1] - mg), min(W, rb[2] + mg), min(H, rb[3] + mg)
S = np.array([[f, 0, -x0 * f], [0, f, -y0 * f]])
out_wh = (int(round((x1 - x0) * f)), int(round((y1 - y0) * f)))
def compose(M2x3, im, src_is_ref):
    A = np.vstack([M2x3, [0, 0, 1]]); T = (np.vstack([S, [0, 0, 1]]) @ A)[:2]
    pm = im.copy(); pm[:, :, :3] *= pm[:, :, 3:4]  # premultiplied, so the edge resamples cleanly
    w = cv2.warpAffine(pm, T, out_wh, flags=cv2.INTER_AREA if f < 1 and src_is_ref else cv2.INTER_CUBIC,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    if not src_is_ref and T[0, 0] < 1:
        # downscaling a 2400 render: area-average, not cubic, or edges alias
        k = 1 / T[0, 0]; big = cv2.warpAffine(pm, T * k, (int(out_wh[0] * k), int(out_wh[1] * k)), flags=cv2.INTER_CUBIC)
        w = cv2.resize(big, out_wh, interpolation=cv2.INTER_AREA)
    al = np.clip(w[:, :, 3:4], 0, 1)
    return np.clip(w[:, :, :3] + STAGE * (1 - al), 0, 1), al[:, :, 0]
I_ref, A_ref = compose(np.array([[1, 0, 0], [0, 1, 0]], float), ref, True)
I_ren, A_ren = compose(M, ren, False)

import torch, lpips
torch.set_grad_enabled(False)
NET = lpips.LPIPS(net="alex", verbose=False)
def to_t(x): return torch.from_numpy(x.transpose(2, 0, 1)[None].astype(np.float32) * 2 - 1)
mask = cv2.dilate(((A_ref > 0.5) | (A_ren > 0.5)).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0

def acut(img, al):
    g = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    inner = cv2.erode((al > 0.5).astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
    e = cv2.Canny(g, 40, 100) > 0; e &= inner
    gf = g.astype(np.float32); gx = cv2.Sobel(gf, cv2.CV_32F, 1, 0, ksize=3) / 8; gy = cv2.Sobel(gf, cv2.CV_32F, 0, 1, ksize=3) / 8
    G = np.hypot(gx, gy)
    mx = cv2.dilate(gf, np.ones((9, 9), np.uint8)); mn = cv2.erode(gf, np.ones((9, 9), np.uint8))
    C = mx - mn
    ok = e & (C > 12)
    return float(np.median(G[ok] / C[ok])) if ok.sum() > 50 else float("nan"), int(ok.sum())

def score(I, A):
    ss = structural_similarity(I_ref, I, channel_axis=2, data_range=1.0, full=True)[1].mean(2)
    lp = float(NET(to_t(I_ref), to_t(I)).item())
    ac, n = acut(I, A)
    return dict(ssim=float(ss[mask].mean()), lpips=lp, acut_abs=ac, edges=n)

ac_ref, n_ref = acut(I_ref, A_ref)
res = dict(pad=pad, ref=os.path.relpath(REF, HERE), render=rdir, iou=float(iou), scale_px=DRAWN,
           acut_ref=ac_ref, **score(I_ren, A_ren))
res["acut"] = res["acut_abs"] / ac_ref
# jnd anchor: the photo halved and restored
h2 = cv2.resize(cv2.resize(I_ref, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA), out_wh, interpolation=cv2.INTER_CUBIC)
j = score(h2, A_ref); res["jnd"] = dict(ssim=j["ssim"], lpips=j["lpips"], acut=j["acut_abs"] / ac_ref)
ok = True
if "--control" in a:
    Ib = cv2.GaussianBlur(I_ren, (0, 0), 2.0)
    b = score(Ib, A_ren); b["acut"] = b["acut_abs"] / ac_ref
    worse = dict(ssim=b["ssim"] < res["ssim"], lpips=b["lpips"] > res["lpips"], acut=b["acut"] < res["acut"])
    res["control_blur"] = dict(ssim=b["ssim"], lpips=b["lpips"], acut=b["acut"], worse=worse)
    # SSIM is reported, not gated: on a pair this far apart it rises under blur (blurring
    # removes structure the two do not share), which the first control run showed (ps 0.738 -> 0.740)
    ok = worse["lpips"] and worse["acut"]

# ---- sheet: photo | render, then 200% crops
def u8(x): return (np.clip(x, 0, 1) * 255).astype(np.uint8)
def centre_of(names):
    if IDS is None: return None
    ids = [LEG[n] for n in names if n in LEG]
    if not ids: return None
    ys, xs = np.nonzero(np.isin(IDS, ids))
    if not len(xs): return None
    q = M @ np.array([xs.mean(), ys.mean(), 1.0])
    return (q[0] - x0) * f, (q[1] - y0) * f
face = [n for n in ("face-up", "face-down", "face-left", "face-right") if LEG and n in LEG]
spots = [("stick", centre_of(["stick-l"])), ("face", centre_of(face))]
ys_, xs_ = np.nonzero(A_ref > 0.5); yy = int(np.percentile(ys_, 30)); row = np.nonzero(A_ref[yy] > 0.5)[0]
spots.append(("edge", (float(row.min()), float(yy))))
CROP = 150
crops = []
for name, c in spots:
    if c is None: continue
    cx, cy = int(c[0]), int(c[1])
    xa, ya = max(0, cx - CROP // 2), max(0, cy - CROP // 2)
    for I in (I_ref, I_ren):
        cr = I[ya:ya + CROP, xa:xa + CROP]
        crops.append(cv2.resize(u8(cr), (CROP * 2, CROP * 2), interpolation=cv2.INTER_NEAREST))
top = np.hstack([u8(I_ref), np.full((I_ref.shape[0], 16, 3), 255, np.uint8), u8(I_ren)])
if crops:
    pairs = [np.hstack([crops[i], np.full((CROP * 2, 4, 3), 255, np.uint8), crops[i + 1]]) for i in range(0, len(crops), 2)]
    strip = np.hstack([np.hstack([p_, np.full((CROP * 2, 24, 3), 34, np.uint8)]) for p_ in pairs])
    wmax = max(top.shape[1], strip.shape[1])
    padw = lambda im: np.hstack([im, np.full((im.shape[0], wmax - im.shape[1], 3), 34, np.uint8)])
    sheet = np.vstack([padw(top), np.full((16, wmax, 3), 255, np.uint8), padw(strip)])
else:
    sheet = top
lab = f"{pad}{TAG}  ssim {res['ssim']:.3f}  lpips {res['lpips']:.3f}  acut {res['acut']:.2f}  (jnd: ssim {res['jnd']['ssim']:.3f} lpips {res['jnd']['lpips']:.3f})"
sheet = np.vstack([np.full((40, sheet.shape[1], 3), 34, np.uint8), sheet])
cv2.putText(sheet, lab, (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (230, 230, 230), 2)
Image.fromarray(sheet).save(os.path.join(odir, f"{pad}{TAG}-sheet.png"))
Image.fromarray(u8(I_ren)).save(os.path.join(odir, f"{pad}{TAG}-render-1200.png"))
Image.fromarray(u8(I_ref)).save(os.path.join(odir, f"{pad}-photo-1200.png"))
json.dump(res, open(os.path.join(odir, f"{pad}{TAG}.json"), "w"), indent=1)
print(f"{pad}{TAG}: iou {iou:.3f}  ssim {res['ssim']:.3f}  lpips {res['lpips']:.3f}  acut {res['acut']:.2f}  | jnd ssim {res['jnd']['ssim']:.3f} lpips {res['jnd']['lpips']:.3f}"
      + (f"  | blur ssim {res['control_blur']['ssim']:.3f} lpips {res['control_blur']['lpips']:.3f} acut {res['control_blur']['acut']:.2f} {'CAUGHT' if ok else 'MISSED'}" if "--control" in a else ""))
sys.exit(0 if ok else 1)
