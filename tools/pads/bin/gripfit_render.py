"""Render flat silhouettes for the grip search: body, and the grip at several Z rotations.
blender -b --factory-startup --python gripfit_render.py -- OUTDIR"""
import bpy, sys, os, math
from mathutils import Matrix, Vector
out = sys.argv[sys.argv.index("--") + 1]; os.makedirs(out, exist_ok=True)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dl", "pr-531537")
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
def load(f, rot, anchor="zmax", offset=(0, 0, 0)):
    bpy.ops.wm.stl_import(filepath=os.path.join(D, f)); o = bpy.context.selected_objects[0]
    R = Matrix.Rotation(math.radians(rot[2]), 4, "Z") @ Matrix.Rotation(math.radians(rot[1]), 4, "Y") @ Matrix.Rotation(math.radians(rot[0]), 4, "X")
    o.data.transform(R)
    import numpy as np
    co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    mn, mx = co.min(0), co.max(0); c = (mn + mx) / 2; z = mx[2] if anchor == "zmax" else mn[2]
    o.data.transform(Matrix.Translation(Vector((-c[0], -c[1], -z)) + Vector(offset))); return o
front = load("Front.stl", (0, 0, 180)); back = load("Back.stl", (0, 0, 0), offset=(0, 0, -22))
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "SINGLE"
sc.display.shading.single_color = (1, 1, 1); sc.render.film_transparent = True
sc.render.resolution_x = 800; sc.render.resolution_y = 800
cd = bpy.data.cameras.new("c"); cd.type = "ORTHO"; cd.ortho_scale = 200; cd.clip_end = 2000
cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); cam.location = (0, 0, 500); sc.camera = cam
sc.render.filepath = os.path.join(out, "body.png"); bpy.ops.render.render(write_still=True)
front.hide_render = back.hide_render = True
for rx in (180,):
    for rz in range(-40, 41, 5):
        g = load("Grip.stl", (rx, 0, rz))
        sc.render.filepath = os.path.join(out, f"grip-{rx}-{rz}.png"); bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(g)
