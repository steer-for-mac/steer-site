"""Apply a feature diff's measured corrections to a pad's params.

    python3 autofix.py PARAMS.json SUMMARY.json [--gain 1.0] [--only a,b] [--skip a,b]
        [--colour MIN_DE] [--relative] [--dry]

--colour also scales each out-of-band region's materials (linear RGB, ref/render).

Only features whose label names a part move; params' "links" carry others along
(the Xbox d-pad cross rides on its disc). A part's scanned twin (the flatten
entry of the same name) moves with it, so the pressed-flat spot stays under the
part. Sizes scale by ref/render; box-like parts scale width and height apart.
"""
import json, sys

a = sys.argv; P_p, S_p = a[1], a[2]
gain = float(a[a.index("--gain") + 1]) if "--gain" in a else 1.0
only = a[a.index("--only") + 1].split(",") if "--only" in a else None
skip = a[a.index("--skip") + 1].split(",") if "--skip" in a else []
P = json.load(open(P_p)); S = json.load(open(S_p))
rows = {r["feature"]: r for r in S["refs"][0]["rows"]}
parts = {p["name"]: p for p in P.get("parts", [])}
flat = {f.get("name"): f for f in P.get("flatten", [])}
SCALE = {"button": ["r", "glyph_size", "bevel"], "stick": ["cap_r", "rim_r", "collar_r", "neck_r"],
         "dirs": ["tip", "len", "width", "arrows"], "cross": ["arm", "width", "arrows"], "torus": ["R"]}
log = []
if "--relative" in a:
    # a shift every part shares is the camera's or the registration's, not the parts':
    # moving them all would walk them off the scan's own openings
    fx_ = [r["fix_mm"] for n, r in rows.items() if n in parts and r.get("fix_mm") and parts[n]["type"] != "box"]
    mx, my = sum(f[0] for f in fx_) / len(fx_), sum(f[1] for f in fx_) / len(fx_)
    for r in rows.values():
        if r.get("fix_mm"): r["fix_mm"] = (r["fix_mm"][0] - mx, r["fix_mm"][1] - my)
    log.append(f"common-mode {mx:+.2f},{my:+.2f}mm left out")
for n, r in rows.items():
    if n not in parts or (only and n not in only) or n in skip or r.get("fix_mm") is None: continue
    p = parts[n]; fx, fy = r["fix_mm"]; moved = []
    if abs(fx) > 0.05 or abs(fy) > 0.05:
        linked = [parts[m] for m in P.get("links", {}).get(n, [])] + ([parts[n + "-ring"]] if n + "-ring" in parts else [])
        for q in [p] + linked + [flat[m] for m in [n] + P.get("links", {}).get(n, []) if m in flat]:
            q["x"] = round(q["x"] + gain * fx, 3); q["y"] = round(q["y"] + gain * fy, 3)
        moved.append(f"move {fx:+.2f},{fy:+.2f}mm")
    t = p["type"]
    if t in ("rrect", "box") and r.get("size_wh"):
        ew, eh = r["size_wh"]
        if abs(ew) > 1: p["w"] = round(p["w"] / (1 + gain * ew / 100), 3)
        if abs(eh) > 1: p["hh"] = round(p["hh"] / (1 + gain * eh / 100), 3)
        if n in flat and "w" in flat[n]:
            flat[n]["w"] = round(max(flat[n]["w"], p["w"] + 1.0), 3); flat[n]["h"] = round(max(flat[n]["h"], p["hh"] + 1.0), 3)
        moved.append(f"w,h {ew:+.1f}%,{eh:+.1f}%")
    elif r.get("size") is not None and abs(r["size"]) > 1 and t in SCALE:
        k = 1 / (1 + gain * r["size"] / 100)
        for q in [p] + [parts[m] for m in P.get("links", {}).get(n, [])]:
            for key in SCALE[q["type"]] if q["type"] in SCALE else []:
                if key in q: q[key] = round(q[key] * k, 3)
        if n in flat and "r" in flat[n]: flat[n]["r"] = round(flat[n]["r"] * k, 3)
        moved.append(f"scale x{k:.3f}")
    if moved: log.append(f"{n}: " + "; ".join(moved))
def lab2lin(L, a_, b_):
    fy = (L + 16) / 116; fx = fy + a_ / 500; fz = fy - b_ / 200
    f = lambda t: t ** 3 if t ** 3 > 0.008856 else (t - 16 / 116) / 7.787
    X, Y, Z = 0.95047 * f(fx), f(fy), 1.08883 * f(fz)
    return (3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z)
if "--colour" in a:
    cw = P["colourways"][P.get("default_colourway")]
    for c in [c for r in S["refs"] for c in r["colour"]]:
        if not c.get("materials") or c.get("ref") is None or c["dE"] < float(a[a.index("--colour") + 1]): continue
        lr, lg = lab2lin(*c["ref"]), lab2lin(*c["ren"])
        k = [min(2.0, max(0.5, (max(x, 1e-4) / max(y, 1e-4)))) ** gain for x, y in zip(lr, lg)]
        for m in c["materials"]:
            for key in ("rgb", "emit"):
                if key in cw[m]: cw[m][key] = [round(min(0.95, v * kk), 4) for v, kk in zip(cw[m][key], k)]
        log.append(f"{c['region']} dE {c['dE']:.1f}: {','.join(c['materials'])} x{k[0]:.2f},{k[1]:.2f},{k[2]:.2f}")
print("\n".join(log) or "nothing to fix")
if "--dry" not in a:
    json.dump(P, open(P_p, "w"), indent=1)
