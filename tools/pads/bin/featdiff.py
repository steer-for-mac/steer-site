# /// script
# dependencies = ["opencv-python-headless", "numpy", "scipy", "scikit-image", "pillow"]
# ///
"""Feature diff: a front render against labelled references, measured, not eyeballed.

    featdiff.py LABELS.json RENDER_DIR OUT_DIR [--move FEATURE,dx_px,dy_px]

LABELS names each reference and, per feature, how to find it in the reference
(a label, refined from the pixels where it can be) and in the render (the object-ID
pass from scene.py --ids, so the render side is measured from pixels, never from
params). The render is registered to each reference by a similarity transform fitted
on the silhouette plus anchor features; every error is in the reference's frame.

--move shifts one feature's ID pixels in the render before measuring: the negative
control that proves a misplaced part is flagged.
"""
import sys, json, os, math
import cv2, numpy as np
from scipy.optimize import minimize
from skimage.color import rgb2lab, deltaE_ciede2000
from PIL import Image

a = sys.argv
labels_p, rdir, odir = a[1], a[2], a[3]
MOVE = a[a.index("--move") + 1].split(",") if "--move" in a else None
L = json.load(open(labels_p)); here = os.path.dirname(os.path.abspath(labels_p))
os.makedirs(odir, exist_ok=True)
pad = L["pad"]; cw = L.get("colourway", "black")
TOL_POS, TOL_SIZE, TOL_DE = 1.0, 5.0, 8.0
STAGE = np.array([0x22, 0x23, 0x25], float) / 255

# ---------------------------------------------------------------- render
def load_rgba(p):
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    im = im.astype(np.float64) / (65535.0 if im.dtype == np.uint16 else 255.0)
    if im.shape[2] == 3: im = np.dstack([im, np.ones(im.shape[:2])])
    return np.dstack([im[:, :, 2], im[:, :, 1], im[:, :, 0], im[:, :, 3]])  # RGBA float

R = load_rgba(os.path.join(rdir, f"{pad}-{cw}-front.png"))
ids_im = np.asarray(Image.open(os.path.join(rdir, f"{pad}-{cw}-front-ids.png")))
IDS = ids_im[:, :, 0].astype(int) * 256 + ids_im[:, :, 1]; IDS[ids_im[:, :, 3] == 0] = 0
LEG = json.load(open(os.path.join(rdir, f"{pad}-{cw}-front-ids.json")))
_mp = json.load(open(os.path.join(rdir, f"{pad}-{cw}-report.json")))["maps"]["front"]
MM_PER_PX = (_mp[2] - _mp[0]) / R.shape[1]  # render px -> mm, ortho front
if R.shape[:2] != IDS.shape: raise SystemExit("render and ID pass differ in size")
if MOVE:
    n, dx, dy = MOVE[0], int(MOVE[1]), int(MOVE[2]); i = LEG[n]
    m = IDS == i; IDS[m] = LEG.get("shell", 0)
    IDS[np.roll(np.roll(m, dy, 0), dx, 1)] = i

def idmask(names):
    names = [names] if isinstance(names, str) else names
    missing = [n for n in names if n not in LEG]
    if missing: raise SystemExit(f"render has no feature {missing}; legend: {sorted(LEG)}")
    return np.isin(IDS, [LEG[n] for n in names])

def bbox(m):
    ys, xs = np.nonzero(m)
    if len(xs) == 0: return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def measure_mask(m, kind):
    """centre (x, y) and size from a binary mask; kind decides what size means."""
    b = bbox(m)
    if b is None: return None
    x0, y0, x1, y1 = b; ys, xs = np.nonzero(m)
    if kind == "circle":
        return dict(xy=(xs.mean(), ys.mean()), size=((x1 - x0) + (y1 - y0)) / 2, wh=(x1 - x0, y1 - y0))
    if kind == "cross":
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        return dict(xy=(cx, cy), size=((x1 - x0) + (y1 - y0)) / 4, wh=(x1 - x0, y1 - y0))
    return dict(xy=((x0 + x1) / 2, (y0 + y1) / 2), size=max(x1 - x0, y1 - y0), wh=(x1 - x0, y1 - y0))

# ---------------------------------------------------------------- reference
def refine_circle(g, x, y, r, mode):
    """Rays from the label; on each, the darkest pixel (a ring/hole edge) or the
    strongest radial gradient; a least-squares circle through the hits, trimmed."""
    hits = []
    for t in np.linspace(0, 2 * np.pi, 180, endpoint=False):
        rr = np.linspace(r * 0.8, r * 1.2, 60)
        px = x + rr * np.cos(t); py = y + rr * np.sin(t)
        ok = (px >= 0) & (py >= 0) & (px < g.shape[1] - 1) & (py < g.shape[0] - 1)
        if ok.sum() < 20: continue
        v = cv2.remap(g, px[ok].astype(np.float32)[None], py[ok].astype(np.float32)[None], cv2.INTER_LINEAR)[0]
        if mode == "dark": k = np.argmin(v)
        else:
            d = np.abs(np.gradient(cv2.GaussianBlur(v.reshape(-1, 1), (1, 5), 1).ravel())); k = np.argmax(d)
        hits.append((px[ok][k], py[ok][k]))
    P = np.array(hits)
    for _ in range(3):
        A = np.c_[2 * P, np.ones(len(P))]; bb = (P ** 2).sum(1)
        cx, cy, c = np.linalg.lstsq(A, bb, rcond=None)[0]; rad = math.sqrt(c + cx * cx + cy * cy)
        res = np.abs(np.hypot(P[:, 0] - cx, P[:, 1] - cy) - rad)
        P = P[res < max(2.0, np.percentile(res, 75))]
    return cx, cy, rad

def ref_feature(f, g):
    k = f["kind"]
    if k == "circle":
        x, y = f["xy"]; r = f["r"]
        if f.get("refine"): x, y, r = refine_circle(g, x, y, r, f["refine"])
        return dict(xy=(x, y), size=2 * r, wh=(2 * r, 2 * r))
    if k == "cross":
        return dict(xy=tuple(f["xy"]), size=f["arm"], wh=(2 * f["arm"], 2 * f["arm"]))
    if k == "box":
        x0, y0, x1, y1 = f["box"]
        return dict(xy=((x0 + x1) / 2, (y0 + y1) / 2), size=max(x1 - x0, y1 - y0), wh=(x1 - x0, y1 - y0))
    raise ValueError(k)

# image-side detectors: the same code runs on the reference and on the registered render
def detect(f, rgb, alpha, W):
    k = f["kind"]; x0, y0, x1, y1 = [int(v) for v in f["win"]]; x0, y0 = max(0, x0), max(0, y0)
    sub = rgb[y0:y1, x0:x1]; al = alpha[y0:y1, x0:x1] > 0.5
    lab = rgb2lab(np.clip(sub, 0, 1))
    if k == "hue":  # a lit strip: saturated and in a hue band
        hsv = cv2.cvtColor((np.clip(sub, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2HSV)
        h0, h1 = f["hue"]; m = al & (hsv[:, :, 0] >= h0) & (hsv[:, :, 0] <= h1) & (hsv[:, :, 1] > f.get("sat", 100)) & (hsv[:, :, 2] > 60)
    elif k == "dark":  # a dark part against a light shell
        m = al & (lab[:, :, 0] < f.get("L", 40))
    elif k == "hump":  # the silhouette above the shoulder line: a bumper seen front-on
        cols = np.where(al.any(0))[0]
        if len(cols) == 0: return None, None
        top = np.array([np.argmax(al[:, c]) if al[:, c].any() else 10 ** 6 for c in range(al.shape[1])])
        ytop = top.min(); band = f.get("band", 0.035) * W
        m = al.copy(); m[int(ytop + band):, :] = False
    elif k == "extreme":  # the outline's furthest point in a direction: a grip tip, a flank
        ys_, xs_ = np.nonzero(al)
        if len(xs_) == 0: return None, None
        v = {"down": ys_, "up": -ys_, "left": -xs_, "right": xs_}[f["dir"]]
        sel = v >= v.max() - 0.004 * W
        m = np.zeros_like(al); m[ys_[sel], xs_[sel]] = True
        full = np.zeros(rgb.shape[:2], bool); full[y0:y1, x0:x1] = m
        return dict(xy=(xs_[sel].mean() + x0, ys_[sel].mean() + y0), size=None, wh=(1, 1)), full
    elif k == "edge_y":  # where a light surface ends going down a column band
        Lc = np.median(lab[:, :, 0], axis=1); below = np.where(Lc < f.get("L", 50))[0]
        if len(below) == 0: return None, None
        y = below[0]; m = np.zeros_like(al); m[max(0, y - 1):y + 1, :] = True
    else:
        raise ValueError(k)
    if f.get("largest", True) and m.any():
        n, lb, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
        if n > 1: m = lb == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    if not m.any(): return None, None
    full = np.zeros(rgb.shape[:2], bool); full[y0:y1, x0:x1] = m
    meas = measure_mask(full, "box")
    if k == "edge_y": meas["size"] = None
    return meas, full

# ---------------------------------------------------------------- registration
def similarity(p):
    ls, th, tx, ty = p; s = math.exp(ls)
    return np.array([[s * math.cos(th), -s * math.sin(th), tx], [s * math.sin(th), s * math.cos(th), ty]])

def apply(M, xy): return (M[:, :2] @ np.asarray(xy, float).T).T + M[:, 2]

def umeyama(src, dst):
    ms, md = src.mean(0), dst.mean(0); S, D = src - ms, dst - md
    U, sv, Vt = np.linalg.svd(D.T @ S / len(src)); Rm = U @ Vt
    if np.linalg.det(Rm) < 0: Rm = U @ np.diag([1, -1]) @ Vt
    s = sv.sum() / (S ** 2).sum(1).mean(); t = md - s * Rm @ ms
    return math.log(s), math.atan2(Rm[1, 0], Rm[0, 0]), t[0], t[1]

def to_lab(rgb): return rgb2lab(np.clip(rgb, 0, 1))

def run_ref(E):
    ref = load_rgba(os.path.join(here, E["image"]))
    if "mask" in E:
        mk = cv2.imread(os.path.join(here, E["mask"]), cv2.IMREAD_GRAYSCALE) > 127; ref[:, :, 3] = mk
    rgb, ra = ref[:, :, :3], ref[:, :, 3] > 0.5
    H, Wimg = ra.shape; rb = bbox(ra); W = rb[2] - rb[0]
    g = cv2.cvtColor((rgb * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    feats = E["features"]
    reff = {n: ref_feature(f, g) for n, f in feats.items() if f["kind"] in ("circle", "cross", "box")}
    renf = {n: measure_mask(idmask(f["id"]), f["kind"] if f["kind"] in ("circle", "cross") else "box")
            for n, f in feats.items() if "id" in f}
    if E.get("register", True) is False:
        return run_colour_only(E, rgb, ra, reff, feats, W)
    # anchors: a group's centre is the mean of its members' centres
    src, dst = [], []
    for an in E["anchors"]:
        ms = an if isinstance(an, list) else [an]
        src.append(np.mean([renf[m]["xy"] for m in ms], 0)); dst.append(np.mean([reff[m]["xy"] for m in ms], 0))
    src, dst = np.array(src), np.array(dst)
    p0 = np.array(umeyama(src, dst))
    # silhouette term at low resolution
    k = 400 / Wimg; small = (int(Wimg * k), int(H * k))
    ra_s = cv2.resize(ra.astype(np.uint8), small, interpolation=cv2.INTER_AREA) > 0
    Ra = (R[:, :, 3] > 0.5).astype(np.uint8)
    def iou(M):
        Ms = M.copy(); Ms *= k
        w = cv2.warpAffine(Ra, Ms, small, flags=cv2.INTER_NEAREST) > 0
        return (w & ra_s).sum() / (w | ra_s).sum()
    lam = E.get("sil_weight", 1.0)
    def cost(p):
        M = similarity(p); e = ((apply(M, src) - dst) ** 2).sum(1).mean() / W ** 2
        return e / 1e-4 + lam * (1 - iou(M)) / 0.01
    p = minimize(cost, p0, method="Nelder-Mead", options=dict(xatol=1e-5, fatol=1e-6, maxiter=4000)).x
    M = similarity(p); s = math.exp(p[0]); sil_iou = iou(M)
    # the render in the reference's frame
    Rw = cv2.warpAffine(R.astype(np.float32), M, (Wimg, H), flags=cv2.INTER_AREA)
    Rw_rgb = Rw[:, :, :3] / np.maximum(Rw[:, :, 3:4], 1e-6); Rw_a = Rw[:, :, 3]
    IDw = cv2.warpAffine(IDS.astype(np.float32), M, (Wimg, H), flags=cv2.INTER_NEAREST).astype(int)

    rows = []; outlines = []; det_ref = {}
    for n, f in feats.items():
        kind = f["kind"]
        if kind in ("hue", "dark", "hump", "edge_y", "extreme"):
            mr, rm_ = detect(f, rgb, ra.astype(float), W); det_ref[n] = rm_
            mg, gm = detect(f, np.clip(Rw_rgb, 0, 1), Rw_a, W)
            if gm is not None: outlines.append((n, gm))
            rf, gf = mr, mg; gscale = 1.0
        else:
            rf = reff.get(n); gf = renf.get(n); gscale = s
            if gf is not None:
                gf = dict(gf, xy=tuple(apply(M, [gf["xy"]])[0]))
                outlines.append((n, np.isin(IDw, [LEG[i] for i in ([f["id"]] if isinstance(f["id"], str) else f["id"])])))
        row = dict(feature=n, kind=kind, note=f.get("note", ""))
        if rf is None or gf is None:
            row.update(pos=None, size=None, missing="ref" if rf is None else "render"); rows.append(row); continue
        dx, dy = gf["xy"][0] - rf["xy"][0], gf["xy"][1] - rf["xy"][1]
        row["pos"] = (abs(dx) if f.get("axis") == "x" else math.hypot(dx, dy)) / W * 100; row["dx"] = dx / W * 100; row["dy"] = dy / W * 100
        row["ref_xy"] = rf["xy"]; row["ren_xy"] = gf["xy"]; row["ref_wh"] = rf["wh"]
        k_mm = MM_PER_PX / s  # ref px -> mm on the pad
        row["fix_mm"] = (-dx * k_mm, dy * k_mm)  # move the part by this (mm, +y up) to land on the reference
        if f.get("size", True) and rf.get("size") and gf.get("size"):
            if kind == "box" or kind in ("hue", "dark", "hump"):
                ew = (gf["wh"][0] * gscale - rf["wh"][0]) / rf["wh"][0] * 100
                eh = (gf["wh"][1] * gscale - rf["wh"][1]) / rf["wh"][1] * 100
                row["size"] = ew if abs(ew) >= abs(eh) else eh; row["size_wh"] = (ew, eh)
            else:
                row["size"] = (gf["size"] * gscale - rf["size"]) / rf["size"] * 100
        else:
            row["size"] = None
        rows.append(row)

    # colour: medians in Lab over regions defined in the reference frame
    crow = []
    if E.get("colour"):
        allfeat = np.zeros(ra.shape, bool)
        for n, f in feats.items():
            if n in reff:
                x, y = reff[n]["xy"]; ww, hh = reff[n]["wh"]
                cv2.ellipse(allfeat.view(np.uint8), (int(x), int(y)), (int(ww * 0.65), int(hh * 0.65)), 0, 0, 360, 1, -1)
        inner = cv2.erode(ra.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
        Lref = to_lab(rgb); Lren = to_lab(np.clip(Rw_rgb, 0, 1)); ren_ok = Rw_a > 0.99
        for c in E["colour"]:
            m = np.zeros(ra.shape, bool)
            if c["kind"] == "discs":
                for n in c["of"]:
                    x, y = reff[n]["xy"]; rr = reff[n]["size"] / 2 * c.get("frac", 0.55)
                    if feats[n]["kind"] == "box":
                        ww, hh = reff[n]["wh"]; cv2.ellipse(m.view(np.uint8), (int(x), int(y)), (int(ww * 0.3), int(hh * 0.3)), 0, 0, 360, 1, -1)
                    else:
                        cv2.circle(m.view(np.uint8), (int(x), int(y)), int(rr), 1, -1)
            elif c["kind"] == "shell":  # inside the silhouette, off every control, in a luminance band of the ref
                m = inner & ~allfeat
                if "L" in c: m &= (Lref[:, :, 0] >= c["L"][0]) & (Lref[:, :, 0] <= c["L"][1])
            elif c["kind"] == "detected":  # the reference's own detection of those features
                for n in c["of"]:
                    if det_ref.get(n) is not None: m |= cv2.erode(det_ref[n].astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
            elif c["kind"] == "window":
                x0, y0, x1, y1 = c["win"]; m[y0:y1, x0:x1] = True; m &= inner if c.get("inner", True) else ra
                if "L" in c: m &= (Lref[:, :, 0] >= c["L"][0]) & (Lref[:, :, 0] <= c["L"][1])
                m &= ~allfeat if c.get("off_controls", True) else True
            for bx in c.get("exclude", []):
                x0, y0, x1, y1 = bx; m[y0:y1, x0:x1] = False
            mg = m & ren_ok
            if c["kind"] == "discs":
                # the render's own parts, where its ID pass puts them: a loose registration
                # must not sample a button's colour off the shell beside it
                mg = np.zeros(ra.shape, bool)
                for n in c["of"]:
                    fid = feats[n]["id"]; im_ = np.isin(IDw, [LEG[i] for i in ([fid] if isinstance(fid, str) else fid)])
                    if not im_.any(): continue
                    ys_, xs_ = np.nonzero(im_); rr = (np.ptp(xs_) + np.ptp(ys_)) / 4 * c.get("frac", 0.55)
                    if feats[n]["kind"] == "box": rr = min(np.ptp(xs_), np.ptp(ys_)) / 2 * 0.6
                    cv2.circle(mg.view(np.uint8), (int(xs_.mean()), int(ys_.mean())), int(rr), 1, -1)
                mg &= ren_ok
            if m.sum() < 30 or mg.sum() < 30: crow.append(dict(region=c["name"], n=int(m.sum()))); continue
            lr = np.median(Lref[m], 0); lg = np.median(Lren[mg], 0)
            de = float(deltaE_ciede2000(lr[None], lg[None])[0])
            crow.append(dict(region=c["name"], ref=lr.tolist(), ren=lg.tolist(), dE=de, n=int(m.sum()), mask=m))
    return dict(E=E, rgb=rgb, ra=ra, W=W, M=M, s=s, iou=sil_iou, rows=rows, crow=crow, outlines=outlines,
                Rw_rgb=np.clip(Rw_rgb, 0, 1), Rw_a=Rw_a, reff=reff)

def run_colour_only(E, rgb, ra, reff, feats, W):
    """A reference shot from another angle (a studio photo): no registration. Region
    medians only: the reference's labelled discs/polygons against the render's own
    parts, found by the ID pass."""
    Lref = to_lab(rgb); Rrgb = np.clip(R[:, :, :3], 0, 1); Lren = to_lab(Rrgb); ren_ok = R[:, :, 3] > 0.99
    def idm(names): return np.isin(IDS, [LEG[i] for i in names if i in LEG])
    crow = []
    for c in E["colour"]:
        m = np.zeros(ra.shape, bool); mg = np.zeros(IDS.shape, bool)
        if c["kind"] == "discs":
            for n in c["of"]:
                x, y = reff[n]["xy"]; cv2.circle(m.view(np.uint8), (int(x), int(y)), int(reff[n]["size"] / 2 * c.get("frac", 0.55)), 1, -1)
                fid = feats[n]["id"]; im_ = idm([fid] if isinstance(fid, str) else fid)
                ys_, xs_ = np.nonzero(im_); rr = (np.ptp(xs_) + np.ptp(ys_)) / 4 * c.get("frac", 0.55)
                cv2.circle(mg.view(np.uint8), (int(xs_.mean()), int(ys_.mean())), int(rr), 1, -1)
        elif c["kind"] == "poly":
            for poly in c["polys"]: cv2.fillPoly(m.view(np.uint8), [np.array(poly, np.int32)], 1)
            mg = cv2.erode(idm(c["ren_id"]).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
            others = [n for n in LEG if n not in c["ren_id"]]
            mg &= ~(cv2.dilate(idm(others).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0)
        m &= ra; mg &= ren_ok
        if m.sum() < 30 or mg.sum() < 30: crow.append(dict(region=c["name"], n=int(m.sum()))); continue
        lr = np.median(Lref[m], 0); lg = np.median(Lren[mg], 0)
        de = float(deltaE_ciede2000(lr[None], lg[None])[0])
        crow.append(dict(region=c["name"], ref=lr.tolist(), ren=lg.tolist(), dE=de, n=int(m.sum()), mask=m))
    # a picture of where each region was sampled, on both images
    vis = (np.where(ra[..., None], rgb, 1.0) * 255).astype(np.uint8).copy()
    for c in crow:
        if "mask" in c:
            cs, _ = cv2.findContours(c["mask"].astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            cv2.drawContours(vis, cs, -1, (255, 60, 60), 3)
    return dict(E=E, rgb=rgb, ra=ra, W=W, M=None, s=1.0, iou=float("nan"), rows=[], crow=crow, outlines=[],
                Rw_rgb=None, Rw_a=None, reff=reff, samples=vis)

# ---------------------------------------------------------------- outputs
def write_outputs(res, tag):
    E, rgb, ra = res["E"], res["rgb"], res["ra"]
    if res["M"] is None:
        p = Image.fromarray(res["samples"]); p.thumbnail((1200, 1200)); p.save(os.path.join(odir, f"{pad}-samples{tag}.png")); return
    H, Wimg = ra.shape; x0, y0, x1, y1 = bbox(ra | (res["Rw_a"] > 0.5)); pad_ = int(0.03 * res["W"])
    x0, y0 = max(0, x0 - pad_), max(0, y0 - pad_); x1, y1 = min(Wimg, x1 + pad_), min(H, y1 + pad_)
    white = np.ones_like(rgb)
    ov = (0.5 * np.where(ra[..., None], rgb, white) + 0.5 * white)
    ov = (ov * 255).astype(np.uint8).copy()
    # the render's silhouette in green, each feature outline in red; the reference label in blue
    cs, _ = cv2.findContours((res["Rw_a"] > 0.5).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(ov, cs, -1, (0, 160, 0), 2)
    for n, m in res["outlines"]:
        cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(ov, cs, -1, (220, 0, 0), 2)
    for n, f in res["reff"].items():
        x, y = f["xy"]; ww, hh = f["wh"]
        if E["features"][n]["kind"] == "box":
            cv2.rectangle(ov, (int(x - ww / 2), int(y - hh / 2)), (int(x + ww / 2), int(y + hh / 2)), (0, 90, 255), 1)
        elif E["features"][n]["kind"] == "cross":
            a_ = E["features"][n]["arm"]; cv2.line(ov, (int(x - a_), int(y)), (int(x + a_), int(y)), (0, 90, 255), 1); cv2.line(ov, (int(x), int(y - a_)), (int(x), int(y + a_)), (0, 90, 255), 1)
        else:
            cv2.circle(ov, (int(x), int(y)), int(ww / 2), (0, 90, 255), 1)
        cv2.drawMarker(ov, (int(x), int(y)), (0, 90, 255), cv2.MARKER_CROSS, 8, 1)
    for r in res["rows"]:
        if r.get("pos") is None: continue
        gx, gy = r["ren_xy"]; cv2.drawMarker(ov, (int(gx), int(gy)), (220, 0, 0), cv2.MARKER_TILTED_CROSS, 8, 1)
        bad = r["pos"] > TOL_POS or (r["size"] is not None and abs(r["size"]) > TOL_SIZE)
        if bad and "geometry" in E["use"]:
            cv2.putText(ov, f"{r['feature']} {r['pos']:.1f}%/{(r['size'] or 0):+.0f}%", (int(gx) + 6, int(gy) - 6), 0, 0.45 * Wimg / 1200 + 0.1, (200, 0, 120), 1, cv2.LINE_AA)
    ov = ov[y0:y1, x0:x1]
    Image.fromarray(ov).save(os.path.join(odir, f"{pad}-overlay{tag}.png"))
    # blink: reference, render, split, on the site's stage
    def on_stage(c, al): return (np.where(al[..., None] > 0, c * np.clip(al[..., None], 0, 1) + STAGE * (1 - np.clip(al[..., None], 0, 1)), STAGE) * 255).astype(np.uint8)
    fr = on_stage(rgb, ra.astype(float))[y0:y1, x0:x1]; fg = on_stage(res["Rw_rgb"], res["Rw_a"])[y0:y1, x0:x1]
    sp = fr.copy(); h2 = sp.shape[1] // 2; sp[:, h2:] = fg[:, h2:]; sp[:, h2 - 1:h2 + 1] = (255, 60, 60)
    frames = []
    for im_, lab_ in ((fr, "reference"), (fg, "render"), (sp, "split: ref | render")):
        p = Image.fromarray(im_); p.thumbnail((900, 900))
        q = np.asarray(p).copy(); cv2.putText(q, lab_, (10, 24), 0, 0.7, (255, 255, 255), 2, cv2.LINE_AA); frames.append(Image.fromarray(q))
    frames[0].save(os.path.join(odir, f"{pad}-blink{tag}.gif"), save_all=True, append_images=frames[1:] + [frames[0], frames[1]], duration=[700, 700, 1400, 700, 700], loop=0)

def fmt(v, t=None, sign=False):
    if v is None: return "–"
    s = f"{v:+.1f}" if sign else f"{v:.2f}"
    return s + (" **✗**" if t is not None and abs(v) > t else "")

results = [run_ref(E) for E in L["refs"]]
md = [f"# {pad}: feature diff\n", f"Render `{pad}-{cw}-front.png` registered to each reference by a similarity fitted on the silhouette plus anchors. "
      f"Position error is % of the reference's pad width; size error is %; colour is CIEDE2000 on Lab medians. "
      f"Gates: position ≤ {TOL_POS}%, size ≤ {TOL_SIZE}%, ΔE ≤ {TOL_DE}.\n"]
summary = dict(pad=pad, refs=[])
for i, res in enumerate(results):
    E = res["E"]; tag = "" if i == 0 else f"-{E['name']}"
    write_outputs(res, tag)
    md.append(f"\n## {E['name']} — {E['source']}\n")
    if res["M"] is None:
        md.append(f"Not registered (another view angle): region medians only, the reference's labelled regions against the render's own parts from its ID pass. Samples: `{pad}-samples{tag}.png`. Used for: {', '.join(E['use'])}.\n")
    else:
        md.append(f"Registration: scale {res['s']:.4f}, rotation {math.degrees(math.atan2(res['M'][1,0], res['M'][0,0])):+.2f}°, silhouette IoU {res['iou']:.3f}, pad width {res['W']} px. Used for: {', '.join(E['use'])}.\n")
    worst = dict(pos=("", 0.0), size=("", 0.0), dE=("", 0.0)); fails = []
    if "geometry" in E["use"]:
        md.append("\n| feature | position err (% W) | dx, dy (% W) | size err (%) | note |\n|---|---|---|---|---|")
        for r in res["rows"]:
            if r.get("pos") is None:
                md.append(f"| {r['feature']} | not found in {r.get('missing')} | | | {r['note']} |"); fails.append(r["feature"] + ":missing"); continue
            md.append(f"| {r['feature']} | {fmt(r['pos'], TOL_POS)} | {r['dx']:+.2f}, {r['dy']:+.2f} | {fmt(r['size'], TOL_SIZE, True)} | {r['note']} |")
            if r["pos"] > worst["pos"][1] and E["features"][r["feature"]].get("gate", True): worst["pos"] = (r["feature"], r["pos"])
            if r["size"] is not None and abs(r["size"]) > abs(worst["size"][1]): worst["size"] = (r["feature"], r["size"])
            gated = E["features"][r["feature"]].get("gate", True)
            if r["pos"] > TOL_POS and gated: fails.append(f"{r['feature']}:pos")
            if r["size"] is not None and abs(r["size"]) > TOL_SIZE: fails.append(f"{r['feature']}:size")
    if "colour" in E["use"]:
        md.append("\n| region | ref Lab | render Lab | ΔE2000 | px |\n|---|---|---|---|---|")
        for c in res["crow"]:
            if "dE" not in c: md.append(f"| {c['region']} | too few pixels | | | {c['n']} |"); fails.append(c["region"] + ":colour-missing"); continue
            md.append(f"| {c['region']} | {c['ref'][0]:.1f}, {c['ref'][1]:+.1f}, {c['ref'][2]:+.1f} | {c['ren'][0]:.1f}, {c['ren'][1]:+.1f}, {c['ren'][2]:+.1f} | {fmt(c['dE'], TOL_DE)} | {c['n']} |")
            if c["dE"] > worst["dE"][1]: worst["dE"] = (c["region"], c["dE"])
            if c["dE"] > TOL_DE: fails.append(f"{c['region']}:dE")
    md.append(f"\nWorst: position {worst['pos'][0]} {worst['pos'][1]:.2f}%, size {worst['size'][0]} {worst['size'][1]:+.1f}%, colour {worst['dE'][0]} ΔE {worst['dE'][1]:.1f}. "
              + ("**PASS**" if not fails else f"**FAIL**: {', '.join(fails)}") + "\n")
    summary["refs"].append(dict(name=E["name"], iou=round(res["iou"], 4), worst=worst, fails=fails,
                                M=None if res["M"] is None else res["M"].tolist(),
                                rows=[{k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items() if k in ("feature", "pos", "size", "dx", "dy", "fix_mm", "size_wh")} for r in res["rows"]],
                                colour=[dict(region=c["region"], dE=round(c.get("dE", -1), 2), ref=c.get("ref"), ren=c.get("ren"),
                                             materials=next((x.get("materials", []) for x in E.get("colour", []) if x["name"] == c["region"]), [])) for c in res["crow"]]))
md.append("\nOverlay: the reference at 50%; green is the render's silhouette, red the render's feature outlines from its object-ID pass, "
          "blue the reference labels. Blink: reference, render, split.\n")
open(os.path.join(odir, f"{pad}-table.md"), "w").write("\n".join(md))
json.dump(summary, open(os.path.join(odir, f"{pad}-summary.json"), "w"), indent=1, default=float)
for r in summary["refs"]:
    print(pad, r["name"], "IoU", r["iou"], "worst", r["worst"], "FAIL" if r["fails"] else "PASS", r["fails"][:12])
