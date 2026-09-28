"""Shared rig: one params file per pad in, a transparent product still out.

    blender -b --factory-startup --python scene.py -- PARAMS OUTDIR [--width 2400]
        [--samples 256] [--views front,hero] [--engine cycles|workbench] [--glb]
        [--colourway NAME] [--set '{"json": "overrides"}']

Frame: after the params' transforms, the pad faces +Z, up is +Y, units are mm.
The shell comes from a mesh; every control is authored here from params and
named after the app's ButtonDefs-style keys, so it can be lit or swapped alone.
Materials are addressed by name: params map object/region -> material key,
and the colourway maps material key -> surface.
"""
import bpy, bmesh, json, math, os, sys, time
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
params_p, out_dir = argv[0], argv[1]
def opt(k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d
WIDTH = int(opt("--width", 2400)); SAMPLES = int(opt("--samples", 256))
VIEWS = opt("--views", "front").split(","); ENGINE = opt("--engine", "cycles")
P = json.load(open(params_p))
def deep(a, b):
    for k, v in b.items():
        a[k] = deep(a.get(k, {}), v) if isinstance(v, dict) and isinstance(a.get(k), dict) else v
    return a
if opt("--set"): deep(P, json.loads(opt("--set")))
COLOURWAY = opt("--colourway", P.get("default_colourway", "black"))
NAME = P["name"]
here = os.path.dirname(os.path.abspath(params_p))
os.makedirs(out_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
T0 = time.time()

# ------------------------------------------------------------ materials
def bsdf(nt, s):
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*s["rgb"], 1)
    b.inputs["Roughness"].default_value = s.get("rough", 0.45)
    b.inputs["Metallic"].default_value = s.get("metal", 0.0)
    b.inputs["Coat Weight"].default_value = s.get("coat", 0.0)
    b.inputs["Coat Roughness"].default_value = s.get("coat_rough", 0.2)
    if "spec" in s: b.inputs["Specular IOR Level"].default_value = s["spec"]
    if "emit" in s:
        b.inputs["Emission Color"].default_value = (*s["emit"], 1)
        b.inputs["Emission Strength"].default_value = s.get("emit_strength", 3.0)
    if "transmission" in s:
        b.inputs["Transmission Weight"].default_value = s["transmission"]
    normal = None
    def mrange(src, a0, a1):
        n_ = nt.nodes.new("ShaderNodeMapRange"); n_.inputs["From Min"].default_value = a0; n_.inputs["From Max"].default_value = a1
        nt.links.new(src, n_.inputs["Value"]); return n_.outputs["Result"]
    def mul(x, y):
        n_ = nt.nodes.new("ShaderNodeMath"); n_.operation = "MULTIPLY"; nt.links.new(x, n_.inputs[0]); nt.links.new(y, n_.inputs[1]); return n_.outputs[0]
    def bump(height, strength, dist=1.0):
        nonlocal normal
        bn = nt.nodes.new("ShaderNodeBump"); bn.inputs["Strength"].default_value = strength; bn.inputs["Distance"].default_value = dist
        nt.links.new(height, bn.inputs["Height"])
        if normal is not None: nt.links.new(normal, bn.inputs["Normal"])
        normal = bn.outputs["Normal"]
    def dots(tc, scale, r0, r1, rnd=0.35):
        """1 on a dot, 0 between: a moulded stipple or knurl, not noise"""
        vo = nt.nodes.new("ShaderNodeTexVoronoi"); vo.inputs["Scale"].default_value = scale
        vo.inputs["Randomness"].default_value = rnd
        nt.links.new(tc.outputs["Object"], vo.inputs["Vector"])
        return mrange(vo.outputs["Distance"], r1, r0)
    tc = nt.nodes.new("ShaderNodeTexCoord") if any(k in s for k in ("bump", "knurl", "stipple")) else None
    if s.get("bump"):
        # fine grain: matte plastic texture, not a pattern
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = s["bump"]
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bump(nz.outputs["Fac"], s.get("bump_strength", 0.08))
    if s.get("knurl"):
        # a stick cap's grip ring: dots in the band r0..r1 (mm from the cap's axis)
        r0, r1, scale, strength = s["knurl"]
        vm = nt.nodes.new("ShaderNodeVectorMath"); vm.operation = "MULTIPLY"; vm.inputs[1].default_value = (1, 1, 0)
        nt.links.new(tc.outputs["Object"], vm.inputs[0])
        ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"; nt.links.new(vm.outputs[0], ln.inputs[0])
        band = mul(mrange(ln.outputs["Value"], r0 - 0.4, r0), mrange(ln.outputs["Value"], r1 + 0.4, r1))
        bump(mul(dots(tc, scale, 0.2, 0.6, 1.0), band), strength, 0.3)
    if s.get("stipple"):
        # a grip's moulded dot texture, only where the surface turns away from the camera
        scale, strength, nz_hi, nz_lo = s["stipple"]
        geo = nt.nodes.new("ShaderNodeNewGeometry"); sp = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Normal"], sp.inputs["Vector"])
        bump(mul(dots(tc, scale, 0.15, 0.38), mrange(sp.outputs["Z"], nz_hi, nz_lo)), strength, 0.3)
    if normal is not None: nt.links.new(normal, b.inputs["Normal"])
    return b

def principled(name, s):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    b = bsdf(nt, s)
    nt.links.new(b.outputs["BSDF"], nt.nodes["Material Output"].inputs["Surface"])
    return m

CW = P["colourways"][COLOURWAY]
MAT = {k: principled(f"{NAME}-{k}", v) for k, v in CW.items()}
if P.get("lit"):
    MAT["lit"] = principled("lit", dict(rgb=(0.04, 0.52, 1.0), rough=0.3, emit=(0.04, 0.52, 1.0), emit_strength=2.5))

def assign(o, key):
    o.data.materials.clear(); o.data.materials.append(MAT[key])

# ------------------------------------------------------------ shell meshes
shells = []
for s in P["shell"]:
    before = set(bpy.data.objects)
    f = os.path.join(here, s["file"])
    if f.endswith(".stl"):
        bpy.ops.wm.stl_import(filepath=f)
    elif f.endswith((".glb", ".gltf")):
        bpy.ops.import_scene.gltf(filepath=f)
    elif f.endswith(".ply"):
        bpy.ops.wm.ply_import(filepath=f)
    new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    o = new[0]
    if len(new) > 1:
        with bpy.context.temp_override(active_object=o, selected_editable_objects=new):
            bpy.ops.object.join()
    o.name = s["name"]
    # bake the params' transform into the mesh: rot (deg, XYZ), mirror, then centre
    R = Matrix.Rotation(math.radians(s.get("rot", [0, 0, 0])[0]), 4, "X")
    R = Matrix.Rotation(math.radians(s.get("rot", [0, 0, 0])[1]), 4, "Y") @ R
    R = Matrix.Rotation(math.radians(s.get("rot", [0, 0, 0])[2]), 4, "Z") @ R
    o.data.transform(R)
    if s.get("mirror_x"):
        o.data.transform(Matrix.Scale(-1, 4, (1, 0, 0))); o.data.flip_normals()
    co = [v.co for v in o.data.vertices]
    mn = Vector([min(c[i] for c in co) for i in range(3)]); mx = Vector([max(c[i] for c in co) for i in range(3)])
    # anchor: centre XY on the bbox, put the given face (zmax/zmin) at z=0, then offset
    ctr = (mn + mx) / 2
    z = mx.z if s.get("anchor", "zmax") == "zmax" else mn.z
    o.data.transform(Matrix.Translation(-Vector((ctr.x, ctr.y, z)) + Vector(s.get("offset", [0, 0, 0]))))
    if s.get("decimate"):
        d = o.modifiers.new("dec", "DECIMATE"); d.ratio = s["decimate"]
        with bpy.context.temp_override(object=o, active_object=o):
            bpy.ops.object.modifier_apply(modifier="dec")
    if s.get("smooth"):
        sm = o.modifiers.new("sm", "CORRECTIVE_SMOOTH"); sm.factor = 0.5; sm.iterations = s["smooth"]
        sm.use_only_smooth = True
        with bpy.context.temp_override(object=o, active_object=o):
            bpy.ops.object.modifier_apply(modifier="sm")
    for p in o.data.polygons: p.use_smooth = True
    if s.get("autosmooth"):
        with bpy.context.temp_override(object=o, active_object=o, selected_editable_objects=[o]):
            bpy.ops.object.shade_auto_smooth(angle=math.radians(s["autosmooth"]))
    assign(o, s.get("material", "shell"))
    shells.append(o)

# flatten: press a scanned control back to the surrounding surface so an
# authored part can take its place. z_ref is the median height of the top
# surface in the ring around it; everything inside r above z_ref - sink goes to it.
import numpy as np
for fl in P.get("flatten", []):
    o = bpy.data.objects[fl.get("object", shells[0].name)]
    me = o.data; co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    sgn = fl.get("dir", 1); co[:, 2] *= sgn
    if "w" in fl:  # rounded box
        dx = np.abs(co[:, 0] - fl["x"]) - fl["w"] / 2; dy = np.abs(co[:, 1] - fl["y"]) - fl["h"] / 2
        d = np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) + np.minimum(np.maximum(dx, dy), 0)
        inner = d < 0
    else:
        d = np.hypot(co[:, 0] - fl["x"], co[:, 1] - fl["y"]) - fl["r"]
        inner = d < 0
    ring = (d > fl.get("gap", 0.6)) & (d < fl.get("gap", 0.6) + fl.get("band", 2.0))
    zr = co[ring, 2]; zr = zr[zr > zr.max() - fl.get("zwin", 4.0)]
    zref = float(np.median(zr)) - fl.get("sink", 0.3)
    if fl.get("zref_at"):
        # sample the surface at a clean spot instead of the ring: the ring can catch a ridge
        qx, qy = fl["zref_at"]; near = np.hypot(co[:, 0] - qx, co[:, 1] - qy) < 1.5
        zref = float(co[near, 2].max()) - fl.get("sink", 0.3)
    if fl.get("quad") and not fl.get("zref_at"):
        # a quadric through the ring: on a curved face a plane leaves a plateau with a rim
        X, Y = co[:, 0] - fl["x"], co[:, 1] - fl["y"]
        A = np.c_[np.ones(len(co)), X, Y, X * X, X * Y, Y * Y]
        sel = ring.copy(); sel[ring] = co[ring, 2] > co[ring, 2].max() - fl.get("zwin", 4.0)
        coef, *_ = np.linalg.lstsq(A[sel], co[sel, 2], rcond=None)
        zp = A @ coef - fl.get("sink", 0.3)
    elif fl.get("plane") and not fl.get("zref_at"):
        # fit a plane to the ring so a flatten on a curved face follows it
        A = np.c_[co[ring][:, :2], np.ones(ring.sum())]; sel = co[ring, 2] > co[ring, 2].max() - fl.get("zwin", 4.0)
        coef, *_ = np.linalg.lstsq(A[sel], co[ring][sel, 2], rcond=None)
        zp = co[:, 0] * coef[0] + co[:, 1] * coef[1] + coef[2] - fl.get("sink", 0.3)
    else:
        zp = np.full(len(co), zref)
    m = inner & (co[:, 2] > zp)
    if fl.get("fill"):
        # the scan's groove round a control is a hole in the new surface: lift it too
        m = inner & (co[:, 2] > zp - fl["fill"])
    co[m, 2] = zp[m]
    # a soft shoulder outside r, so the pressed edge is a slope, not a torn rim
    bl = fl.get("blend", 0.0)
    if bl:
        sh = (d >= 0) & (d < bl) & (co[:, 2] > zp) & (co[:, 2] < zp + fl.get("zwin", 4.0))
        t = (d[sh] / bl) ** 2
        co[sh, 2] = zp[sh] + (co[sh, 2] - zp[sh]) * t
    co[:, 2] *= sgn
    me.vertices.foreach_set("co", co.ravel()); me.update()
    print("FLATTEN", fl.get("name", ""), int(m.sum()), round(zref, 2))

# clean: a scan is lumpy at the 0.2-0.5 mm scale and its triangles show in a highlight.
# Voxel-remesh it into an even, closed surface. Then either Laplacian-smooth it with
# volume kept (`passes`), or retopo it (`cage`): a light quad cage from QuadriFlow,
# subdivided, so the surface the camera sees is a subdivision limit surface and the scan
# only sets proportions; `shrink` pulls the limit surface back onto the smoothed scan.
def laplace(o, passes):
    for it, fac in passes:
        ls = o.modifiers.new("lap", "LAPLACIANSMOOTH"); ls.iterations = it; ls.lambda_factor = fac
        ls.lambda_border = 0.0; ls.use_volume_preserve = True; ls.use_normalized = True
        bpy.ops.object.modifier_apply(modifier="lap")
for s in P["shell"]:
    c = s.get("clean")
    if not c: continue
    o = bpy.data.objects[s["name"]]; n0 = len(o.data.vertices)
    with bpy.context.temp_override(object=o, active_object=o, selected_editable_objects=[o]):
        rm = o.modifiers.new("vox", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = c.get("voxel", 0.4)
        rm.adaptivity = 0.0; rm.use_smooth_shade = True
        bpy.ops.object.modifier_apply(modifier="vox")
        g = c.get("cage")
        if not g:
            laplace(o, c.get("passes", [[20, 1.0]]))
        else:
            target = None
            if g.get("shrink"):
                target = o.copy(); target.data = o.data.copy(); sc.collection.objects.link(target); target.hide_render = True
                with bpy.context.temp_override(object=target, active_object=target, selected_editable_objects=[target]):
                    laplace(target, c.get("passes", [[20, 1.0]]))
            # QuadriFlow welds coincident vertices itself, so a voxel mesh that touches itself
            # in a thin wall reads as non-manifold to it: weld, then drop what is left non-manifold
            bm_ = bmesh.new(); bm_.from_mesh(o.data)
            bmesh.ops.remove_doubles(bm_, verts=bm_.verts, dist=c.get("voxel", 0.4) * 0.05)
            for _ in range(3):
                bad = [v for v in bm_.verts if not v.is_manifold]
                if not bad: break
                bmesh.ops.delete(bm_, geom=bad, context="VERTS")
                bmesh.ops.holes_fill(bm_, edges=[e for e in bm_.edges if e.is_boundary], sides=0)
            bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces); bm_.to_mesh(o.data); bm_.free()
            r_ = bpy.ops.object.quadriflow_remesh(target_faces=g.get("faces", 4000), use_mesh_symmetry=g.get("symmetry", False),
                                                  use_preserve_sharp=False, use_preserve_boundary=False, smooth_normals=False, seed=g.get("seed", 0))
            if len(o.data.polygons) > 3 * g.get("faces", 4000): raise SystemExit(f"quadriflow did not run on {o.name}: {r_}")
            ss = o.modifiers.new("sub", "SUBSURF"); ss.levels = ss.render_levels = g.get("levels", 2)
            bpy.ops.object.modifier_apply(modifier="sub")
            if target is not None:
                sw_ = o.modifiers.new("sw", "SHRINKWRAP"); sw_.target = target; sw_.wrap_method = "NEAREST_SURFACEPOINT"
                bpy.ops.object.modifier_apply(modifier="sw")
                bpy.data.objects.remove(target)
            laplace(o, g.get("after", []))
    for p in o.data.polygons: p.use_smooth = True
    print("CLEAN", s["name"], n0, "->", len(o.data.vertices))

# regions: faces of a shell whose centre falls inside a front-view polygon
# (and a z window) take another material. Authored, in mm.
def inside(pt, poly):
    x, y = pt; n = len(poly); c = False
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c
for r in P.get("regions", []):
    o = bpy.data.objects[r["object"]]
    polys = [r["poly"]] + ([[[-x, y] for x, y in r["poly"]]] if r.get("mirror") else [])
    if MAT[r["material"]].name not in o.data.materials:
        o.data.materials.append(MAT[r["material"]])
    idx = list(o.data.materials).index(MAT[r["material"]])
    zlo, zhi = r.get("z", [-1e9, 1e9])
    for f in o.data.polygons:
        c = f.center
        if zlo <= c.z <= zhi and any(inside((c.x, c.y), pl) for pl in polys) and (r.get("facing") is None or f.normal.z > r["facing"]):
            f.material_index = idx
    if r.get("split"):
        # its own object, so the shell's render-time layered material does not paint over it
        bm = bmesh.new(); bm.from_mesh(o.data)
        sel = [f for f in bm.faces if f.material_index == idx]
        nb = bmesh.new(); vmap = {}
        for f in sel:
            vs = []
            for v in f.verts:
                if v.index not in vmap: vmap[v.index] = nb.verts.new(v.co)
                vs.append(vmap[v.index])
            try: nb.faces.new(vs)
            except ValueError: pass
        bmesh.ops.delete(bm, geom=sel, context="FACES_ONLY")
        bm.to_mesh(o.data); bm.free()
        me = bpy.data.meshes.new(r["split"]); nb.to_mesh(me); nb.free()
        no = bpy.data.objects.new(r["split"], me); sc.collection.objects.link(no)
        for pg in me.polygons: pg.use_smooth = True
        me.materials.append(MAT[r["material"]])
        print("SPLIT", r["split"], len(sel))

# mask regions: a binary image registered to the shell's front-view bbox.
# Faces that look forward take the material where the mask is set; faces that
# look backward take `back` if given. Measured from a reference, never shipped.
for r in P.get("mask_regions", []):
    o = bpy.data.objects[r["object"]]
    img = bpy.data.images.load(os.path.join(here, r["image"]))
    iw, ih = img.size; px = np.array(img.pixels[:]).reshape(ih, iw, img.channels)[::-1, :, 0] > 0.5
    co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    bx0, by0 = co[:, 0].min(), co[:, 1].min(); bx1, by1 = co[:, 0].max(), co[:, 1].max()
    if r.get("bbox"): bx0, by0, bx1, by1 = r["bbox"]
    for key in (r["material"], r.get("back")):
        if key and MAT[key].name not in o.data.materials: o.data.materials.append(MAT[key])
    mi = list(o.data.materials).index(MAT[r["material"]])
    bi = list(o.data.materials).index(MAT[r["back"]]) if r.get("back") else None
    nf = len(o.data.polygons)
    c = np.empty(nf * 3); o.data.polygons.foreach_get("center", c); c = c.reshape(-1, 3)
    nrm = np.empty(nf * 3); o.data.polygons.foreach_get("normal", nrm); nrm = nrm.reshape(-1, 3)
    u = np.clip(((c[:, 0] - bx0) / (bx1 - bx0) * iw).astype(int), 0, iw - 1)
    v = np.clip(((by1 - c[:, 1]) / (by1 - by0) * ih).astype(int), 0, ih - 1)
    idx = np.empty(nf, dtype=np.int32); o.data.polygons.foreach_get("material_index", idx)
    front = nrm[:, 2] > r.get("front_min", -0.35)
    if r.get("zmin") is not None: front &= c[:, 2] > r["zmin"]
    idx[front & px[v, u]] = mi
    if bi is not None: idx[~front] = bi
    o.data.polygons.foreach_set("material_index", idx); o.data.update()
    print("MASK", r["material"], int((front & px[v, u]).sum()), "of", nf)

# For renders, the per-face split above is too coarse on a scan: it follows
# triangles. The render material projects the same masks in the shader, so the
# boundary is as smooth as the mask. Per-face stays for the GLB.
RENDER_SWAP = {}
by_obj = {}
for r in P.get("mask_regions", []): by_obj.setdefault(r["object"], []).append(r)
for oname, layers in by_obj.items():
    o = bpy.data.objects[oname]
    co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    bx0, by0, bx1, by1 = co[:, 0].min(), co[:, 1].min(), co[:, 0].max(), co[:, 1].max()
    m = bpy.data.materials.new(f"{NAME}-{oname}-layered"); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    base_key = next(sh.get("material", "shell") for sh in P["shell"] if sh["name"] == oname)
    cur = bsdf(nt, CW[base_key]).outputs["BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.vector_type = "POINT"
    # uv = (co - b0) / size, applied as scale after translation: Mapping does T then S? It does S then T.
    mp.inputs["Scale"].default_value = (1 / (bx1 - bx0), 1 / (by1 - by0), 1)
    mp.inputs["Location"].default_value = (-bx0 / (bx1 - bx0), -by0 / (by1 - by0), 0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Normal"], sep.inputs["Vector"])
    for r in layers:
        img = nt.nodes.new("ShaderNodeTexImage"); img.image = bpy.data.images.load(os.path.join(here, r.get("soft", r["image"])))
        img.image.colorspace_settings.name = "Non-Color"; img.extension = "EXTEND"; img.interpolation = "Cubic"
        nt.links.new(mp.outputs["Vector"], img.inputs["Vector"])
        mask_out = img.outputs["Color"]
        if r.get("side"):
            # faces turned away from the camera read a dilated mask: a side wall projects
            # to a sliver in the front view, so the front mask alone speckles it
            si = nt.nodes.new("ShaderNodeTexImage"); si.image = bpy.data.images.load(os.path.join(here, r["side"]))
            si.image.colorspace_settings.name = "Non-Color"; si.extension = "EXTEND"; si.interpolation = "Cubic"
            nt.links.new(mp.outputs["Vector"], si.inputs["Vector"])
            lo, hi = r.get("side_band", [0.3, 0.6])
            f2 = nt.nodes.new("ShaderNodeMapRange"); f2.inputs["From Min"].default_value = lo; f2.inputs["From Max"].default_value = hi
            nt.links.new(sep.outputs["Z"], f2.inputs["Value"])
            mx2 = nt.nodes.new("ShaderNodeMix"); mx2.data_type = "FLOAT"
            nt.links.new(f2.outputs["Result"], mx2.inputs["Factor"])
            nt.links.new(si.outputs["Color"], mx2.inputs[2]); nt.links.new(img.outputs["Color"], mx2.inputs[3])
            mask_out = mx2.outputs[0]
        # frontness: 1 where the normal looks toward the camera enough
        fr = nt.nodes.new("ShaderNodeMapRange"); fr.inputs["From Min"].default_value = r.get("front_min", -0.35) - 0.1
        fr.inputs["From Max"].default_value = r.get("front_min", -0.35) + 0.1
        nt.links.new(sep.outputs["Z"], fr.inputs["Value"])
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(mask_out, mul.inputs[0]); nt.links.new(fr.outputs["Result"], mul.inputs[1])
        fac = mul.outputs["Value"]
        if r.get("back"):
            inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
            nt.links.new(fr.outputs["Result"], inv.inputs[1])
            mx_ = nt.nodes.new("ShaderNodeMath"); mx_.operation = "MAXIMUM"
            nt.links.new(fac, mx_.inputs[0]); nt.links.new(inv.outputs["Value"], mx_.inputs[1]); fac = mx_.outputs["Value"]
        if r.get("inward"):
            # a grip's inner wall (normal turned toward the pad's centre line, below y_max,
            # not facing the camera) belongs to this layer: a part line, not a projection
            iw = r["inward"]
            ox = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], ox.inputs["Vector"])
            sg = nt.nodes.new("ShaderNodeMath"); sg.operation = "SIGN"; nt.links.new(ox.outputs["X"], sg.inputs[0])
            dn = nt.nodes.new("ShaderNodeMath"); dn.operation = "MULTIPLY"; nt.links.new(sg.outputs["Value"], dn.inputs[0]); nt.links.new(sep.outputs["X"], dn.inputs[1])
            def ramp(src, a0, a1):
                n_ = nt.nodes.new("ShaderNodeMapRange"); n_.inputs["From Min"].default_value = a0; n_.inputs["From Max"].default_value = a1
                nt.links.new(src, n_.inputs["Value"]); return n_.outputs["Result"]
            t = iw.get("nx", 0.3); b_ = iw.get("blend", 0.1)
            m1 = ramp(dn.outputs["Value"], -t + b_, -t - b_)          # 1 when n.x*sign(x) < -t
            m2 = ramp(sep.outputs["Z"], iw.get("nz_max", 0.8) + b_, iw.get("nz_max", 0.8) - b_)
            m3 = ramp(ox.outputs["Y"], iw.get("y_max", 0.0) + 2, iw.get("y_max", 0.0) - 2)
            p1 = nt.nodes.new("ShaderNodeMath"); p1.operation = "MULTIPLY"; nt.links.new(m1, p1.inputs[0]); nt.links.new(m2, p1.inputs[1])
            p2 = nt.nodes.new("ShaderNodeMath"); p2.operation = "MULTIPLY"; nt.links.new(p1.outputs["Value"], p2.inputs[0]); nt.links.new(m3, p2.inputs[1])
            mxi = nt.nodes.new("ShaderNodeMath"); mxi.operation = "MAXIMUM"
            nt.links.new(fac, mxi.inputs[0]); nt.links.new(p2.outputs["Value"], mxi.inputs[1]); fac = mxi.outputs["Value"]
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(fac, mix.inputs["Fac"]); nt.links.new(cur, mix.inputs[1])
        nt.links.new(bsdf(nt, CW[r["material"]]).outputs["BSDF"], mix.inputs[2]); cur = mix.outputs["Shader"]
    nt.links.new(cur, nt.nodes["Material Output"].inputs["Surface"])
    RENDER_SWAP[oname] = m

deps = bpy.context.evaluated_depsgraph_get()
def top_z(x, y, objs=None):
    hit, loc, n, i, ob, _ = sc.ray_cast(bpy.context.evaluated_depsgraph_get(), Vector((x, y, 500)), Vector((0, 0, -1)))
    return loc.z if hit else 0.0

# ------------------------------------------------------------ authored parts
parts_col = bpy.data.collections.new("parts"); sc.collection.children.link(parts_col)
def adopt(o, mat_key, parent=None):
    for c in o.users_collection: c.objects.unlink(o)
    parts_col.objects.link(o)
    if mat_key and o.type in ("MESH", "FONT", "CURVE"):
        o.data.materials.clear(); o.data.materials.append(MAT[mat_key])
    if parent:
        bpy.context.view_layer.update()
        o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o

def bevel(o, w, seg=5):
    b = o.modifiers.new("bevel", "BEVEL"); b.width = w; b.segments = seg; b.limit_method = "ANGLE"
    b.harden_normals = False
    for p in o.data.polygons: p.use_smooth = True
    return o

def cyl(name, x, y, z, r, h, mat_key, bev, verts=96, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z - h / 2))
    o = bpy.context.active_object; o.name = name
    bevel(o, min(bev, h * 0.49, r * 0.49))
    return adopt(o, mat_key, parent)

def dome_cap(name, x, y, z, r, h, dish, mat_key, parent=None):
    """A stick cap: cylinder, rounded rim, concave top by `dish` mm."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=96, radius1=r, radius2=r, depth=h)
    top = [v for v in bm.verts if v.co.z > 0]
    # subdivide the top cap into rings to allow the dish
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    o.location = (x, y, z - h / 2)
    bpy.context.view_layer.objects.active = o
    bevel(o, min(r * 0.28, h * 0.45), 8)
    if dish:
        # a sphere displacement for the concave top
        o.modifiers.new("sub", "SUBSURF").levels = 0
    return adopt(o, mat_key, parent)

def rrect(name, x, y, z, w, h, d, rad, mat_key, bev, rot=0.0, parent=None):
    """Rounded-rectangle slab in XY (w x h), depth d, corner radius rad."""
    bm = bmesh.new()
    pts = []
    rad = min(rad, w / 2 - 1e-4, h / 2 - 1e-4)
    for cx, cy, a0 in ((w / 2 - rad, h / 2 - rad, 0), (-w / 2 + rad, h / 2 - rad, 90), (-w / 2 + rad, -h / 2 + rad, 180), (w / 2 - rad, -h / 2 + rad, 270)):
        for i in range(13):
            a = math.radians(a0 + 90 * i / 12)
            pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    vs = [bm.verts.new((px, py, 0)) for px, py in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in ext["geom"]:
        if isinstance(v, bmesh.types.BMVert): v.co.z = -d
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    o.location = (x, y, z); o.rotation_euler.z = math.radians(rot)
    bevel(o, min(bev, d * 0.49), 5)
    return adopt(o, mat_key, parent)

def poly_slab(name, pts, z, d, mat_key, bev, parent=None, loc=(0, 0)):
    bm = bmesh.new()
    vs = [bm.verts.new((px, py, 0)) for px, py in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in ext["geom"]:
        if isinstance(v, bmesh.types.BMVert): v.co.z = -d
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    o.location = (loc[0], loc[1], z)
    bevel(o, min(bev, d * 0.49), 5)
    return adopt(o, mat_key, parent)

def glyph_text(name, text, x, y, z, size, mat_key, parent):
    bpy.ops.object.text_add(location=(x, y, z))
    o = bpy.context.active_object; o.name = name
    o.data.body = text; o.data.size = size; o.data.extrude = 0.08
    o.data.align_x = "CENTER"; o.data.align_y = "CENTER"
    o.data.font = bpy.data.fonts.load(P["font"]) if P.get("font") else o.data.font
    return adopt(o, mat_key, parent)

def glyph_curve(name, kind, x, y, z, s, mat_key, parent, stroke=None):
    """Line glyphs (PlayStation-style shapes, arrows) as bevelled curves, s = size in mm."""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "2D"; cu.fill_mode = "BOTH"
    cu.extrude = 0.06
    def poly(pts, cyclic=True):
        sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
        for p, (px, py) in zip(sp.points, pts): p.co = (px, py, 0, 1)
        sp.use_cyclic_u = cyclic
    st = stroke or s * 0.11
    def ring(pts):
        # outline stroke: outer and inner offset polygons make a filled band
        import itertools
        n = len(pts); cx = sum(p[0] for p in pts) / n; cy = sum(p[1] for p in pts) / n
        outer = [(cx + (px - cx) * (1 + st / s), cy + (py - cy) * (1 + st / s)) for px, py in pts]
        inner = [(cx + (px - cx) * (1 - st / s), cy + (py - cy) * (1 - st / s)) for px, py in pts]
        poly(outer); poly(inner[::-1])
    h = s / 2
    if kind == "triangle":
        ring([(0, h * 0.95), (-h * 1.0, -h * 0.75), (h * 1.0, -h * 0.75)])
    elif kind == "circle":
        ring([(h * math.cos(a / 48 * 2 * math.pi), h * math.sin(a / 48 * 2 * math.pi)) for a in range(48)])
    elif kind == "square":
        ring([(h * .85, h * .85), (-h * .85, h * .85), (-h * .85, -h * .85), (h * .85, -h * .85)])
    elif kind == "cross":
        w = st / 2  # half-width: a bar st wide, the same weight as the outlined glyphs
        for a in (45, -45):
            c, sn = math.cos(math.radians(a)), math.sin(math.radians(a))
            pts = [(-h, -w), (h, -w), (h, w), (-h, w)]
            poly([(px * c - py * sn, px * sn + py * c) for px, py in pts])
    elif kind in ("arrow-up", "arrow-down", "arrow-left", "arrow-right"):
        pts = [(0, h * 0.6), (-h * 0.6, -h * 0.4), (h * 0.6, -h * 0.4)]
        a = {"arrow-up": 0, "arrow-left": 90, "arrow-down": 180, "arrow-right": 270}[kind]
        c, sn = math.cos(math.radians(a)), math.sin(math.radians(a))
        poly([(px * c - py * sn, px * sn + py * c) for px, py in pts])
    elif kind == "bar":
        poly([(-h, -st / 2), (h, -st / 2), (h, st / 2), (-h, st / 2)])
    elif kind == "minus":
        poly([(-h, -st / 2), (h, -st / 2), (h, st / 2), (-h, st / 2)])
    elif kind == "plus":
        w = st / 2
        poly([(-w, h), (w, h), (w, w), (h, w), (h, -w), (w, -w), (w, -h), (-w, -h), (-w, -w), (-h, -w), (-h, w), (-w, w)])
    elif kind == "house":
        poly([(0, h), (h, 0), (h * .7, 0), (h * .7, -h), (-h * .7, -h), (-h * .7, 0), (-h, 0)])
    elif kind == "lines3":
        for dy in (-h * .55, 0, h * .55):
            poly([(-h, dy - st / 2), (h, dy - st / 2), (h, dy + st / 2), (-h, dy + st / 2)])
    elif kind == "burst":
        # the Create button's mark: three strokes fanning up from a point under them
        for a in (55, 90, 125):
            c, sn = math.cos(math.radians(a)), math.sin(math.radians(a))
            r0, r1 = h * 0.35, h * 1.0; ox, oy = 0, -h * 0.55
            pts = [(r0, -st / 2), (r1, -st / 2), (r1, st / 2), (r0, st / 2)]
            poly([(ox + px * c - py * sn, oy + px * sn + py * c) for px, py in pts])
    elif kind == "mic":
        # muted microphone: the capsule outlined, its stand, and a slash through it
        cw_, ch_ = h * 0.42, h * 0.62; cy_ = h * 0.25
        def cap_ring(w, hh):
            pts = []
            for i in range(24):
                a = math.pi * i / 23
                pts.append((w / 2 * math.cos(a), cy_ + (hh / 2 - w / 2) + w / 2 * math.sin(a)))
            for i in range(24):
                a = math.pi + math.pi * i / 23
                pts.append((w / 2 * math.cos(a), cy_ - (hh / 2 - w / 2) + w / 2 * math.sin(a)))
            return pts
        poly(cap_ring(cw_ + st, ch_ + st)); poly(cap_ring(cw_ - st, ch_ - st)[::-1])
        poly([(-st / 2, -h * 0.35), (st / 2, -h * 0.35), (st / 2, cy_ - ch_ / 2), (-st / 2, cy_ - ch_ / 2)])
        poly([(-h * 0.3, -h * 0.35 - st / 2), (h * 0.3, -h * 0.35 - st / 2), (h * 0.3, -h * 0.35 + st / 2), (-h * 0.3, -h * 0.35 + st / 2)])
        c, sn = math.cos(math.radians(-50)), math.sin(math.radians(-50))
        poly([(px * c - py * sn, px * sn + py * c) for px, py in [(-h * 0.9, -st / 2), (h * 0.9, -st / 2), (h * 0.9, st / 2), (-h * 0.9, st / 2)]])
    elif kind == "squares2":
        # view button: two overlapping outlined squares
        for ox, oy in ((-h * .2, h * .2), (h * .2, -h * .2)):
            q = h * .55
            poly([(ox - q, oy - q), (ox + q, oy - q), (ox + q, oy + q), (ox - q, oy + q)])
            q2 = q - st
            poly([(ox - q2, oy - q2), (ox - q2, oy + q2), (ox + q2, oy + q2), (ox + q2, oy - q2)])
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o)
    o.location = (x, y, z)
    return adopt(o, mat_key, parent)

def surface(x, y, dz=0.0):
    return top_z(x, y) + dz

def well(o, h, gap, key="well", dz=0.25):
    """The dark gap a control sits in: the part offset outward by `gap`, sunk until only
    a rim of it shows at the shell's surface. Its own feature, so a control's box stays its own."""
    if key not in MAT:
        MAT[key] = principled(f"{NAME}-{key}", CW.get(key, dict(rgb=(0.004, 0.004, 0.005), rough=0.6)))
    w = o.copy(); w.data = o.data.copy(); w.name = o.name + "-well"
    parts_col.objects.link(w)
    d = w.modifiers.new("grow", "DISPLACE"); d.direction = "NORMAL"; d.mid_level = 0.0; d.strength = gap
    # its top stands dz proud of the surface at the control's centre, so a curved face
    # does not bury it at the far side; the control covers all of it but the rim
    w.location.z -= h - dz + gap
    w.data.materials.clear(); w.data.materials.append(MAT[key])
    return w

def lathe_cap(name, x, y, cz, p):
    """A stick cap turned from its profile: a spherical dish, a rounded rim, a straight
    side, so the concave top and the rim's highlight come from geometry, not a boolean."""
    R, H, dish = p["cap_r"], p["cap_h"], p.get("dish", 0.9)
    rim, e = p.get("rim_w", 1.6), p.get("edge", 1.0)
    ri = R - rim
    Rs = (ri ** 2 + dish ** 2) / (2 * dish)  # sphere through (0,-dish) and (ri,0)
    prof = []
    for i in range(24):
        r = ri * i / 23; prof.append((r, -dish + Rs - math.sqrt(max(Rs ** 2 - r ** 2, 0))))
    # rim: a round of radius rim/2 from the dish lip over the top, then the outer edge round
    cr = rim / 2; cx, cz_ = ri + cr, -cr * 0.35
    for i in range(1, 13):
        a = math.pi - math.pi * 0.5 * i / 12
        prof.append((cx + cr * math.cos(a), cz_ + cr * math.sin(a) * 0.9 + cr * 0.35))
    ex, ez = R - e, prof[-1][1] - e
    for i in range(1, 13):
        a = math.pi / 2 - math.pi / 2 * i / 12
        prof.append((ex + e * math.cos(a), ez + e * math.sin(a)))
    prof.append((R, -H)); prof.append((p.get("neck_r", R * 0.5), -H)); prof.append((0, -H))
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z_)) for r, z_ in prof]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=128, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.location = (x, y, cz)
    return adopt(o, p.get("cap_material", p.get("material", "stick")))

def build_part(p):
    t = p["type"]; x, y = p.get("x", 0), p.get("y", 0); n = p["name"]
    if "z" in p:
        z = p["z"]
    elif p.get("ring"):
        # a part over a hole: the surface is the rim around it, not what is behind it
        z = max(top_z(x + p["ring"] * math.cos(a), y + p["ring"] * math.sin(a)) for a in [i * math.pi / 6 for i in range(12)]) + p.get("dz", 0.0)
    else:
        z = surface(x, y, p.get("dz", 0.0))
    if t == "button":
        o = cyl(n, x, y, z + p["h"], p["r"], p["h"] + p.get("sink", 2.0), p.get("material", "btn"), p.get("bevel", p["r"] * 0.35))
        if p.get("gap"): well(o, p["h"], p["gap"], dz=p.get("well_dz", 0.25))
        top = z + p["h"]
        if "glyph" in p:
            g = p["glyph"]
            if g.startswith("text:"):
                glyph_text(f"{n}-glyph", g[5:], x, y, top - 0.02, p.get("glyph_size", p["r"] * 1.1), p.get("glyph_material", "glyph"), o)
            else:
                glyph_curve(f"{n}-glyph", g, x, y, top - 0.02, p.get("glyph_size", p["r"] * 1.1), p.get("glyph_material", "glyph"), o, p.get("stroke"))
        return o
    if t == "stick":
        # base collar (the dome ring you see around the cap), then the cap on a short neck
        base = None
        if p.get("collar_r"):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=p["collar_r"], location=(x, y, z + p.get("collar_dz", -p["collar_r"] * 0.55)))
            base = bpy.context.active_object; base.name = f"{n}-base"
            base.scale.z = p.get("collar_flat", 0.55)
            for f in base.data.polygons: f.use_smooth = True
            adopt(base, p.get("collar_material", "stick"))
        cz = z + p["cap_z"]
        if p.get("neck_r"):
            neck = cyl(f"{n}-neck", x, y, cz - p["cap_h"] * 0.5, p["neck_r"], p["cap_z"] - p["cap_h"] * 0.5 + 1.0, p.get("material", "stick"), 0.3)
        if p.get("lathe"):
            cap = lathe_cap(n, x, y, cz, p)
        else:
            cap = cyl(n, x, y, cz, p["cap_r"], p["cap_h"], p.get("cap_material", p.get("material", "stick")), p.get("cap_bevel", p["cap_h"] * 0.45))
        if p.get("dish") and not p.get("lathe"):
            # concave top: carve a sphere into the cap
            R = (p["cap_r"] ** 2 + p["dish"] ** 2) / (2 * p["dish"])
            bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=R, location=(x, y, cz - p["dish"] + R))
            cut = bpy.context.active_object
            m = cap.modifiers.new("dish", "BOOLEAN"); m.object = cut; m.operation = "DIFFERENCE"; m.solver = "EXACT"
            cap.modifiers.move(len(cap.modifiers) - 1, 0)
            with bpy.context.temp_override(object=cap, active_object=cap):
                bpy.ops.object.modifier_apply(modifier="dish")
            bpy.data.objects.remove(cut)
        if p.get("rim_r") and not p.get("lathe"):
            bpy.ops.mesh.primitive_torus_add(major_radius=p["rim_r"], minor_radius=p.get("rim_w", 0.9), major_segments=128, minor_segments=16,
                                             location=(x, y, cz - p.get("rim_dz", 1.0)))
            rim = bpy.context.active_object; rim.name = f"{n}-rim"
            for f in rim.data.polygons: f.use_smooth = True
            adopt(rim, p.get("cap_material", p.get("material", "stick")), cap)
        for ch in (base, neck if p.get("neck_r") else None):
            if ch:
                bpy.context.view_layer.update()
                ch.parent = cap; ch.matrix_parent_inverse = cap.matrix_world.inverted()
        return cap
    if t == "cross":
        a, w = p["arm"], p["width"]; r = p.get("corner", 1.0)
        pts = [(-w/2, a), (w/2, a), (w/2, w/2), (a, w/2), (a, -w/2), (w/2, -w/2), (w/2, -a), (-w/2, -a), (-w/2, -w/2), (-a, -w/2), (-a, w/2), (-w/2, w/2)]
        o = poly_slab(n, pts, z + p["h"], p["h"] + 2, p.get("material", "btn"), p.get("bevel", 0.8), loc=(x, y))
        if p.get("gap"): well(o, p["h"], p["gap"], dz=p.get("well_dz", 0.25))
        for k, (dx, dy) in {"up": (0, 1), "down": (0, -1), "left": (-1, 0), "right": (1, 0)}.items():
            if p.get("arrows"):
                glyph_curve(f"{n}-{k}-glyph", f"arrow-{k}", x + dx * a * 0.68, y + dy * a * 0.68, z + p["h"] - 0.02, p["arrows"], p.get("glyph_material", "glyph"), o)
        return o
    if t == "dirs":
        # DualSense-style: four separate arrow-shaped keys around a centre
        root = None
        for k, ang in {"up": 90, "left": 180, "down": 270, "right": 0}.items():
            L, W, tip = p["len"], p["width"], p["tip"]
            pts = [(tip, 0), (tip + W * .35, W / 2), (tip + L, W / 2), (tip + L, -W / 2), (tip + W * .35, -W / 2)]
            c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
            pts = [(px * c - py * s, px * s + py * c) for px, py in pts]
            cx = x + (tip + L / 2) * c; cy = y + (tip + L / 2) * s
            zz = surface(cx, cy, p.get("dz", 0))
            o = poly_slab(f"{n}_{k}", pts, zz + p["h"], p["h"] + 2, p.get("material", "btn"), p.get("bevel", 1.0), loc=(x, y))
            if p.get("gap"): well(o, p["h"], p["gap"], dz=p.get("well_dz", 0.25))
            if p.get("arrows"):
                glyph_curve(f"{n}_{k}-glyph", f"arrow-{k}", x + (tip + L * .45) * c, y + (tip + L * .45) * s, zz + p["h"] + 0.0, p["arrows"], p.get("glyph_material", "glyph"), o)
        return None
    if t == "rrect":
        o = rrect(n, x, y, z + p["h"], p["w"], p["hh"], p["h"] + p.get("sink", 2), p.get("radius", 1.0), p.get("material", "btn"), p.get("bevel", 0.6), p.get("rot", 0))
        if p.get("gap"): well(o, p["h"], p["gap"], dz=p.get("well_dz", 0.25))
        if "glyph" in p:
            glyph_curve(f"{n}-glyph", p["glyph"], x, y, z + p["h"] - 0.02, p.get("glyph_size", min(p["w"], p["hh"]) * 0.6), p.get("glyph_material", "glyph"), o)
        return o
    if t == "facet":
        # a faceted dish (the Elite's d-pad): flat in the middle, each arm a plane tilted
        # up and out, each corner tilted both ways, so it reads as a cross cut in metal
        R, a, sl, h = p["R"], p.get("flat", p["R"] * 0.3), p.get("slope", 0.12), p.get("h", 1.0)
        def zf(u, v): return sl * (max(abs(u) - a, 0) + max(abs(v) - a, 0))
        bm = bmesh.new(); NR, NA = 48, 192
        centre = bm.verts.new((0, 0, 0)); rings = []
        for i in range(1, NR + 1):
            r = R * i / NR
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * j / NA), r * math.sin(2 * math.pi * j / NA),
                                        zf(r * math.cos(2 * math.pi * j / NA), r * math.sin(2 * math.pi * j / NA)))) for j in range(NA)])
        for j in range(NA): bm.faces.new((centre, rings[0][j], rings[0][(j + 1) % NA]))
        for i in range(NR - 1):
            for j in range(NA):
                bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % NA], rings[i][(j + 1) % NA]))
        lip = max(zf(R, 0), zf(R * 0.7071, R * 0.7071))
        wall = [bm.verts.new((v.co.x, v.co.y, lip + p.get("rim", 0.3))) for v in rings[-1]]
        base = [bm.verts.new((v.co.x * 1.0, v.co.y * 1.0, -h - 2.0)) for v in rings[-1]]
        for j in range(NA):
            k = (j + 1) % NA
            bm.faces.new((rings[-1][j], wall[j], wall[k], rings[-1][k]))
            bm.faces.new((wall[j], base[j], base[k], wall[k]))
        bm.faces.new(base[::-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(n); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(n, me); sc.collection.objects.link(o)
        top_ = z + h - lip
        o.location = (x, y, top_)
        b = o.modifiers.new("bevel", "BEVEL"); b.width = p.get("bevel", 0.4); b.segments = 4; b.limit_method = "ANGLE"
        b.angle_limit = math.radians(50)
        for f in me.polygons: f.use_smooth = False
        adopt(o, p.get("material", "metal"))
        # the rim wall stands `rim` above the dish, so that is the top the well sits under
        if p.get("gap"): well(o, h + p.get("rim", 0.3), p["gap"], dz=p.get("well_dz", 0.25))
        return o
    if t == "decal":
        # a mark printed on the shell (not a control): the glyph alone, on the surface
        g = glyph_curve(n, p["glyph"], x, y, z + p.get("lift", 0.03), p["size"], p.get("glyph_material", "glyph"), None, p.get("stroke"))
        g.rotation_euler.z = math.radians(p.get("rot", 0.0))
        return g
    if t == "torus":
        bpy.ops.mesh.primitive_torus_add(major_radius=p["R"], minor_radius=p["r"], major_segments=128, minor_segments=24, location=(x, y, z + p.get("h", 0)))
        o = bpy.context.active_object; o.name = n; o.scale.z = p.get("flat", 1.0)
        for f in o.data.polygons: f.use_smooth = True
        return adopt(o, p.get("material", "shell"))
    if t == "box":
        o = rrect(n, x, y, p.get("z", z) + p["d"] / 2, p["w"], p["hh"], p["d"], p.get("radius", 2), p.get("material", "shell"), p.get("bevel", 2), p.get("rot", 0))
        return o
    raise ValueError(t)

if P.get("parts"):
    for p in P["parts"]:
        build_part(p)
    if P.get("lit"):
        for o in parts_col.objects:
            if o.name == P["lit"] and o.type == "MESH": assign(o, "lit")

# ------------------------------------------------------------ frame + camera
bpy.context.view_layer.update()
vis = [o for o in sc.objects if o.type in ("MESH", "FONT", "CURVE")]
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in vis:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
size = mx - mn; ctr = (mn + mx) / 2
print("FRAME", tuple(round(v, 1) for v in size))
for o in vis:
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    if min(b.x for b in bb) < mn.x + 0.5 or max(b.y for b in bb) > mx.y - 0.5: print("EXTREME", o.name, o.type)

R = P.get("rig", {})
if ENGINE == "workbench":
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
else:
    sc.render.engine = "CYCLES"
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "METAL"; pr.get_devices()
    for d in pr.devices: d.use = d.type != "CPU"
    sc.cycles.device = "GPU"; sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True; sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.pixel_filter_type = "BLACKMAN_HARRIS"; sc.cycles.filter_width = 1.5
    sc.cycles.max_bounces = 8
sc.render.film_transparent = True
sc.view_settings.view_transform = R.get("view_transform", "AgX")
sc.view_settings.look = R.get("look", "AgX - Medium High Contrast" if sc.view_settings.view_transform == "AgX" else "None")
sc.view_settings.exposure = R.get("exposure", 0.0)
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.render.image_settings.color_depth = "16"

# lights, relative to the pad's size so every pad goes through the same rig
S = max(size.x, size.y)
def area(name, off, energy, sz, shape="RECTANGLE", sy=None, colour=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = shape; ld.size = sz * S
    if sy: ld.size_y = sy * S
    ld.energy = energy * S ** 2; ld.color = colour
    l = bpy.data.objects.new(name, ld); sc.collection.objects.link(l)
    l.location = ctr + Vector(off) * S
    l.rotation_euler = (ctr - l.location).to_track_quat("-Z", "Y").to_euler()
    return l
L = R.get("lights", {})
# key: big softbox high and to the left, in front. Fill: low right, weak.
# rims: behind and above, left and right, to draw the edge on a near-black stage.
area("key", L.get("key_pos", (-0.9, 1.1, 1.6)), L.get("key", 80), L.get("key_size", 1.4), sy=L.get("key_size", 1.4) / 1.4)
# front: a big softbox round the lens, the product photographer's flat fill (off unless set)
if L.get("front"): area("front", L.get("front_pos", (0.0, 0.25, 2.4)), L["front"], L.get("front_size", 2.4))
area("fill", L.get("fill_pos", (1.3, -0.4, 1.4)), L.get("fill", 15), 1.8)
area("rim-l", L.get("riml_pos", (-1.3, 0.9, -0.5)), L.get("rim", 60), 0.35, sy=1.6)
area("rim-r", L.get("rimr_pos", (1.3, 0.9, -0.5)), L.get("rim", 60), 0.35, sy=1.6)
area("top", L.get("top_pos", (0.0, 1.4, 0.4)), L.get("top", 25), 1.6, sy=0.3)
area("rim-b", L.get("rimb_pos", (0.0, -1.4, -0.4)), L.get("rimb", 40), 1.6, sy=0.3)
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Strength"].default_value = L.get("world", 0.15)

def camera(name, direction, tilt_deg=0.0, ortho=True, lens=200, dist_mm=None):
    cd = bpy.data.cameras.new("cam-" + name)
    c = bpy.data.objects.new(name, cd); sc.collection.objects.link(c)
    d = Vector(direction).normalized()
    d = Matrix.Rotation(math.radians(tilt_deg), 3, "X") @ d
    if name == "front" and R.get("yaw"):
        d = Matrix.Rotation(math.radians(R["yaw"]), 3, "Y") @ d
    dist = dist_mm if dist_mm else S * (12 if not ortho else 4)
    c.location = ctr + d * dist
    c.rotation_euler = (ctr - c.location).to_track_quat("-Z", "Y").to_euler()
    if name == "front":
        # built, not tracked: tracking a view along world Z picks an arbitrary roll
        c.rotation_euler = (Matrix.Rotation(math.radians(R.get("yaw", 0.0)), 3, "Y")
                            @ Matrix.Rotation(math.radians(tilt_deg), 3, "X")).to_euler()
    if name == "front" and R.get("cam_offset"):
        # a hand-held photo's camera sits off the pad's centre line; keep the view axis, move the eye
        c.location += Vector((R["cam_offset"][0], R["cam_offset"][1], 0))
    cd.clip_end = dist * 4
    if ortho:
        cd.type = "ORTHO"
    else:
        cd.lens = lens
    return c

def fit(cam, margin):
    """Size the ortho scale / lens so the projected bbox fills the frame at `margin`."""
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    pts = []
    for o in vis:
        if o.type == "MESH":
            me = o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
            mw = o.matrix_world
            import numpy as np
            co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
            M4 = np.array(inv @ mw); co = co @ M4[:3, :3].T + M4[:3, 3]
            pts.extend(Vector(r) for r in co[::max(1, len(co) // 60000)])
            # exact extremes, not just the sample
            for i in (0, 1, 2):
                pts.append(Vector(co[co[:, i].argmin()])); pts.append(Vector(co[co[:, i].argmax()]))
    xs = [p.x for p in pts]; ys = [p.y for p in pts]
    w = max(xs) - min(xs); h = max(ys) - min(ys)
    cx = (max(xs) + min(xs)) / 2; cy = (max(ys) + min(ys)) / 2
    if cam.data.type == "ORTHO" or not (cam.name == "front" and R.get("cam_offset")):
        cam.location = cam.matrix_world @ Vector((cx, cy, 0))
    else:
        cx = cy = 0.0  # keep the eye where the offset put it; lens shift frames the pad
    aspect = w / h
    sc.render.resolution_x = WIDTH; sc.render.resolution_y = int(round(WIDTH / aspect * (1 + 2 * margin) / (1 + 2 * margin)))
    if cam.data.type == "ORTHO":
        cam.data.ortho_scale = w * (1 + 2 * margin)
        sc.render.resolution_y = int(round(WIDTH * h / w))
        bpy.context.view_layer.update()
        s_ = cam.data.ortho_scale
        a = cam.matrix_world @ Vector((-s_ / 2, s_ / 2 * h / w, 0)); b = cam.matrix_world @ Vector((s_ / 2, -s_ / 2 * h / w, 0))
        MAPS[cam.data.name[4:]] = [a.x, a.y, b.x, b.y]
        return w, h
    # perspective: fit the projected extents (not the camera-space box, which is wrong up close)
    P_ = np.array([(p.x - cx, p.y - cy, p.z) for p in pts]); u = P_[:, 0] / -P_[:, 2]; v = P_[:, 1] / -P_[:, 2]
    wu, hv = u.max() - u.min(), v.max() - v.min(); span = wu * (1 + 2 * margin)
    cam.data.sensor_fit = "HORIZONTAL"; cam.data.sensor_width = 36
    cam.data.lens = 36 / span
    cam.data.shift_x = (u.max() + u.min()) / 2 / span; cam.data.shift_y = (v.max() + v.min()) / 2 / span
    sc.render.resolution_y = int(round(WIDTH * hv / wu))
    bpy.context.view_layer.update()
    # mm on the plane through the pad's front face (world z = 0) that one image width spans
    d0 = cam.matrix_world.translation.z if abs(cam.matrix_world.col[2].z) > 0.9 else -min(p.z for p in pts)
    s_ = span * d0
    MAPS[cam.data.name[4:]] = [-s_ / 2, s_ / 2 * hv / wu, s_ / 2, -s_ / 2 * hv / wu]
    return wu * d0, hv * d0
    return w, h
MAPS = {}

def feature_of(o):
    """The feature an object belongs to: its root parent, d-pad arms folded into one."""
    import re
    # sticks' collar and neck are their own features: the cap is what gets measured
    while o.parent and not re.search(r"-(base|neck)$", o.name): o = o.parent
    n = o.name
    n = re.sub(r"_(up|down|left|right)$", "", n)
    n = re.sub(r"^speaker-\d+$", "speaker", n)
    return n

def render_ids(fn):
    """Flat, unaliased object-ID image: the render's features measured from pixels.
    The ID is in R*256+G of a Raw 8-bit PNG; the legend goes beside it as JSON."""
    st = dict(engine=sc.render.engine, vt=sc.view_settings.view_transform, look=sc.view_settings.look,
              exp=sc.view_settings.exposure, depth=sc.render.image_settings.color_depth)
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading; sh.light = "FLAT"; sh.color_type = "OBJECT"
    sh.show_object_outline = False; sh.show_cavity = False; sh.show_shadows = False
    sh.show_specular_highlight = False; sh.show_xray = False; sh.show_backface_culling = False
    sc.display.render_aa = "OFF"; sc.render.dither_intensity = 0
    sc.view_settings.view_transform = "Raw"; sc.view_settings.look = "None"; sc.view_settings.exposure = 0
    sc.render.image_settings.color_depth = "8"
    legend = {}
    names = sorted({feature_of(o) for o in sc.objects if o.type in ("MESH", "FONT", "CURVE")})
    for i, n in enumerate(names, start=1): legend[n] = i
    for o in sc.objects:
        if o.type in ("MESH", "FONT", "CURVE"):
            i = legend[feature_of(o)]; o.color = ((i // 256) / 255, (i % 256) / 255, 0.0, 1.0)
    # a control's well is shading, not the control: out of the ID pass, so it can neither
    # cover the part it rings nor be measured as one
    wells = [o for o in sc.objects if o.name.endswith("-well")]
    for o in wells: o.hide_render = True
    sc.render.filepath = fn; bpy.ops.render.render(write_still=True)
    for o in wells: o.hide_render = False
    legend = {k: v for k, v in legend.items() if not k.endswith("-well")}
    json.dump(legend, open(fn[:-4] + ".json", "w"), indent=1)
    sc.render.engine = st["engine"]; sc.view_settings.view_transform = st["vt"]; sc.view_settings.look = st["look"]
    sc.view_settings.exposure = st["exp"]; sc.render.image_settings.color_depth = st["depth"]
    sc.render.filepath = ""

saved = {}
for oname, m in RENDER_SWAP.items():
    o = bpy.data.objects[oname]
    idx = np.empty(len(o.data.polygons), dtype=np.int32); o.data.polygons.foreach_get("material_index", idx)
    saved[oname] = (list(o.data.materials), idx)
    o.data.materials.clear(); o.data.materials.append(m)
    o.data.polygons.foreach_set("material_index", np.zeros(len(idx), dtype=np.int32))
timings = {}
for v in VIEWS:
    if v == "front":
        # dist_mm: a product shot's camera sits close enough to see both grips' inner walls
        cam = camera("front", (0, 0, 1), R.get("tilt", 0.0), ortho=R.get("ortho", True), lens=R.get("lens", 200),
                     dist_mm=R.get("dist_mm"))
        fit(cam, R.get("margin", 0.01))
    elif v == "hero":
        cam = camera("hero", (0.45, -0.75, 0.9), 0, ortho=False, lens=85)
        fit(cam, 0.04)
    elif v == "side":
        cam = camera("side", (1, 0, 0.15), 0, ortho=False, lens=85)
        fit(cam, 0.04)
    elif v == "back":
        cam = camera("back", (0, 0.001, -1), 0, ortho=True)
        fit(cam, 0.02)
    elif v == "top":
        cam = camera("top", (0, 1, 0.05), 0, ortho=False, lens=85)
        fit(cam, 0.04)
    sc.camera = cam
    fn = os.path.join(out_dir, f"{NAME}-{COLOURWAY}-{v}.png")
    sc.render.filepath = fn
    t = time.time(); bpy.ops.render.render(write_still=True); timings[v] = round(time.time() - t, 1)
    if v == "front" and "--ids" in argv:
        render_ids(os.path.join(out_dir, f"{NAME}-{COLOURWAY}-front-ids.png"))

report = dict(pad=NAME, colourway=COLOURWAY, width=WIDTH, samples=SAMPLES, render_s=timings,
              total_s=round(time.time() - T0, 1), frame_mm=[round(v, 1) for v in size],
              maps=MAPS, parts=sorted(o.name for o in parts_col.objects), shells=[o.name for o in shells])

for oname, (mats, idx) in saved.items():
    o = bpy.data.objects[oname]; o.data.materials.clear()
    for mm in mats: o.data.materials.append(mm)
    o.data.polygons.foreach_set("material_index", idx)
if "--glb" in argv:
    bpy.ops.object.select_all(action="DESELECT")
    for o in sc.objects:
        if o.type in ("FONT", "CURVE"):
            o.select_set(True)
    if [o for o in sc.objects if o.select_get()]:
        bpy.context.view_layer.objects.active = [o for o in sc.objects if o.select_get()][0]
        bpy.ops.object.convert(target="MESH")
    bpy.ops.object.select_all(action="DESELECT")
    for o in sc.objects:
        if o.type == "MESH": o.select_set(True)
    # scans arrive at millions of triangles; an app does not need them
    for o in shells:
        n = len(o.data.polygons)
        if n > 250000:
            d = o.modifiers.new("dec", "DECIMATE"); d.ratio = 250000 / n
            with bpy.context.temp_override(object=o, active_object=o):
                bpy.ops.object.modifier_apply(modifier="dec")
    glb = os.path.join(out_dir, f"{NAME}-{COLOURWAY}.glb")
    # mm -> m for glTF consumers
    for o in sc.objects:
        if o.type == "MESH" and o.parent is None: o.scale *= 0.001; o.location *= 0.001
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True)
    report["glb_bytes"] = os.path.getsize(glb)
json.dump(report, open(os.path.join(out_dir, f"{NAME}-{COLOURWAY}-report.json"), "w"), indent=1)
print("REPORT", json.dumps(report))
