"""Quick 6-axis Workbench views of a mesh, to find which way is front.
blender -b --factory-startup --python views.py -- OUTPREFIX MESH [MESH...]"""
import bpy, sys, os, math
from mathutils import Vector
args = sys.argv[sys.argv.index("--") + 1:]
out, meshes = args[0], args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for m in meshes:
    bpy.ops.wm.stl_import(filepath=m) if m.endswith(".stl") else bpy.ops.import_scene.gltf(filepath=m)
obs = [o for o in sc.objects if o.type == "MESH"]
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in obs:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
ctr = (mn + mx) / 2; S = max(mx - mn)
print("BBOX", tuple(round(v, 1) for v in (mx - mn)))
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "SINGLE"
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 600
cd = bpy.data.cameras.new("c"); cd.type = "ORTHO"; cd.ortho_scale = S * 1.1
cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
for name, d in {"px": (1, 0, 0), "nx": (-1, 0, 0), "py": (0, 1, 0), "ny": (0, -1, 0), "pz": (0, 0, 1), "nz": (0, 0, -1)}.items():
    cam.location = ctr + Vector(d) * S * 3
    up = "Y" if abs(d[2]) < 0.5 else "Y"
    cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Z" if abs(d[2]) < 0.5 else "Y").to_euler()
    sc.render.filepath = f"{out}-{name}.png"; bpy.ops.render.render(write_still=True)
