"""Workbench: body grey + left grip red, from front, left side, bottom. -- OUT rx ry rz dx dy dz"""
import bpy, sys, os, math
import numpy as np
from mathutils import Matrix, Vector
a = sys.argv[sys.argv.index("--") + 1:]; out = a[0]; rx, ry, rz, dx, dy, dz = map(float, a[1:7])
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dl", "pr-531537")
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
def load(f, rot, offset=(0, 0, 0), col=(0.8, 0.8, 0.8, 1)):
    bpy.ops.wm.stl_import(filepath=os.path.join(D, f)); o = bpy.context.selected_objects[0]
    R = Matrix.Rotation(math.radians(rot[2]), 4, "Z") @ Matrix.Rotation(math.radians(rot[1]), 4, "Y") @ Matrix.Rotation(math.radians(rot[0]), 4, "X")
    o.data.transform(R)
    co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    mn, mx = co.min(0), co.max(0); c = (mn + mx) / 2
    o.data.transform(Matrix.Translation(Vector((-c[0], -c[1], -mx[2])) + Vector(offset))); o.color = col; return o
load("Front.stl", (0, 0, 180)); load("Back.stl", (0, 0, 0), (0, 0, -22), (0.6, 0.7, 0.9, 1))
load("Grip.stl", (rx, ry, rz), (dx, dy, dz), (0.9, 0.2, 0.2, 1))
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "OBJECT"
sc.render.resolution_x = 700; sc.render.resolution_y = 700
cd = bpy.data.cameras.new("c"); cd.type = "ORTHO"; cd.ortho_scale = 170; cd.clip_end = 3000
cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
for name, loc in {"front": (0, 0, 500), "left": (-500, 0, -25), "bottom": (0, -500, -25), "back": (0, 0, -500)}.items():
    cam.location = loc; tgt = Vector((0, 0, -25)) if name != "front" else Vector((0, 0, 0))
    cam.rotation_euler = (tgt - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{out}-{name}.png"; bpy.ops.render.render(write_still=True)
