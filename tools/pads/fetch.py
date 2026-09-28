#!/usr/bin/env python3
"""Fetch the three shell meshes into dl/, each pinned by URL and sha256.

The meshes are downloaded inputs, never committed (LICENCES.md has the
licences). A file already present with the right hash is left alone; a wrong
hash stops the run, because a changed upload means a different shell.
Anonymous, with a generic User-Agent. Stdlib only. Usage: tools/pads/fetch.py
"""
import hashlib
import io
import struct
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

DL = Path(__file__).resolve().parent / "dl"
UA = {"User-Agent": "Mozilla/5.0"}
P = "https://files.printables.com/media/prints/"

# (path under dl/, url, sha256 of what the url serves)
FILES = [
    ("tv-6497183.zip", "https://www.thingiverse.com/thing:6497183/zip",
     "9d51313041a82d2770c8710c2264274b191bb6a05782b3947af6e587b69d5ced"),
    ("pr-1508424/dualsense-scan.3mf",
     P + "727f5178-da1c-4ab4-acd0-ee6b4090f2e5/stls/11363259_bedcff39-6e60-44ba-ba72-775dc7be6aec_24e7ec30-9820-41f1-b802-85b785bdffd4/dualsense-scan.3mf",
     "9913550849b0931b642baff7602032087a66fdf3d72fe2ddae848f7feb65a957"),
    ("pr-531537/Front.stl", P + "531537/stls/4292026_baaab0c6-6069-4f15-801b-0754d9af99ef/front.stl",
     "af260c33b4265822229ad7f20f97755d03abf89b287ef8002311735464a2db00"),
    ("pr-531537/Back.stl", P + "531537/stls/4292027_774fdc23-3d49-4412-8301-89736ea3f7c8/back.stl",
     "db00c4873fe6f8716c93a8a7e9017dbf82beadcc8cbfccd6f47a67ed00c121e8"),
    ("pr-531537/Back Cover.stl", P + "531537/stls/4292024_c3f2f391-dbe8-41da-9642-5503805c0c62/back-cover.stl",
     "90427d076e0a07b3ef0f2ebb04c9cb9ce0a8ebf500bcd00c9918c69b8c56022c"),
    ("pr-531537/Grip.stl", P + "531537/stls/4292025_21fce800-080d-46ba-bed7-e13c710d64d2/grip.stl",
     "5739ec1c346222fc0c0b576e327667b081250fd3771a83bbdea01aa33f583702"),
]
# Derived here, so pinned too: what the params' "file" entries actually open.
XB_STL = ("tv-6497183/files/xbox_series_controller.stl",
          "9ae0590367ebc49bb370fd6ebabe4865ffc13ed6108d7bb8e77b908c4182c80f")
# The first cut of this STL came from an unrecorded converter; this one matches
# it vertex for vertex and differs in one normal's signed zero.
PS_STL = ("pr-1508424/dualsense.stl",
          "82f5198314f03a50af1c68ea925c19a63b60823e964952f3c254d1a6b50d18f2")


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def check(p, want):
    got = sha(p)
    if got != want:
        sys.exit(f"{p}: sha256 {got}, pinned {want}. The upload changed; re-fit the params before re-pinning.")


def stl_from_3mf(src, dst):
    root = ET.fromstring(zipfile.ZipFile(src).read("3D/3dmodel.model"))
    ns = root.tag.split("}")[0] + "}"
    tris = []
    for mesh in root.iter(ns + "mesh"):
        v = [tuple(float(e.get(k)) for k in "xyz") for e in mesh.iter(ns + "vertex")]
        tris += [(v[int(t.get("v1"))], v[int(t.get("v2"))], v[int(t.get("v3"))]) for t in mesh.iter(ns + "triangle")]
    out = io.BytesIO()
    out.write(bytes(80) + struct.pack("<I", len(tris)))
    for a, b, c in tris:
        u = [b[i] - a[i] for i in range(3)]
        w = [c[i] - a[i] for i in range(3)]
        n = (u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0])
        k = (n[0] ** 2 + n[1] ** 2 + n[2] ** 2) ** 0.5 or 1.0
        out.write(struct.pack("<12fH", *(x / k for x in n), *a, *b, *c, 0))
    dst.write_bytes(out.getvalue())


for rel, url, want in FILES:
    p = DL / rel
    if not (p.exists() and sha(p) == want):
        p.parent.mkdir(parents=True, exist_ok=True)
        print("fetch", rel, file=sys.stderr)
        for wait in (30, 90, 0):  # Thingiverse answers 429 to a second zip inside a minute or so
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
                    p.write_bytes(r.read())
                break
            except urllib.error.HTTPError as e:
                if e.code != 429 or not wait:
                    raise
                print(f"  429, retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
    check(p, want)

xb = DL / XB_STL[0]
if not xb.exists():
    xb.parent.mkdir(parents=True, exist_ok=True)
    xb.write_bytes(zipfile.ZipFile(DL / "tv-6497183.zip").read("files/xbox_series_controller.stl"))
check(xb, XB_STL[1])

ps = DL / PS_STL[0]
if not ps.exists():
    stl_from_3mf(DL / "pr-1508424/dualsense-scan.3mf", ps)
check(ps, PS_STL[1])
print("dl/ matches every pin", file=sys.stderr)
