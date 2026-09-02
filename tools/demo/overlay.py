#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow"]
# ///
"""Render the live-input overlay for a demo take from the frame files that drove it.

Every frame the synthetic pad played is known to the millisecond, so the pad
drawn in the corner is not an animation of what the pad probably did: it is the
injected input itself. Reads a run log (JSON list of {"t": seconds since the
recording started, "file": frame file}), draws pressed buttons and stick
deflection on the manufacturer render, and writes a PNG sequence ffmpeg overlays.

  overlay.py <run.json> <out_dir> --fps 30 --duration S [--offset S] [--pad ps]
"""
import argparse, json, math, os
from PIL import Image, ImageDraw

# control centres as fractions of the render, from styles/bands/apps.css
CTRL = {"lstick": (0.34, 0.49), "rstick": (0.66, 0.49), "cross": (0.81, 0.395), "circle": (0.885, 0.285),
        "triangle": (0.81, 0.175), "square": (0.735, 0.28), "l1": (0.22, 0.10), "r1": (0.78, 0.10),
        "l2": (0.16, 0.05), "r2": (0.84, 0.05), "dpadUp": (0.19, 0.22), "dpadDown": (0.19, 0.34),
        "dpadLeft": (0.13, 0.27), "dpadRight": (0.25, 0.27), "l3": (0.34, 0.49), "r3": (0.66, 0.49),
        "options": (0.71, 0.11), "create": (0.29, 0.11), "touchpadClick": (0.50, 0.20)}
ACCENT = (0, 113, 235, 255)

def load_run(path):
    """Expand every frame file into absolute (t, state) samples, state persisting between frames."""
    run = json.load(open(path)); samples = []
    for inj in run:
        base = inj["t"]; state = {}
        for fr in json.load(open(inj["file"]))["frames"]:
            state = dict(fr["state"])  # frame files are sparse but each carries the full held state
            samples.append((base + fr["timestamp"], state))
    samples.sort(key=lambda s: s[0]); return samples

def state_at(samples, t):
    cur = {}
    for ts, st in samples:
        if ts > t: break
        cur = st
    return cur

def draw(pad, state, scale):
    """Sizes are fractions of the drawn width, so the marks read at any overlay size."""
    im = pad.copy(); d = ImageDraw.Draw(im, "RGBA"); w, h = im.size; r = int(w * 0.036); lw = max(3, int(w * 0.008))
    for name, (fx, fy) in CTRL.items():
        if name in ("lstick", "rstick"): continue
        if state.get(name):
            d.ellipse((fx * w - r, fy * h - r, fx * w + r, fy * h + r), outline=ACCENT, width=lw, fill=(0, 113, 235, 110))
    for name, xk, yk in (("lstick", "leftStickX", "leftStickY"), ("rstick", "rightStickX", "rightStickY")):
        fx, fy = CTRL[name]; reach = w * 0.055
        dx = (state.get(xk, 128) - 128) / 127 * reach; dy = (state.get(yk, 128) - 128) / 127 * reach
        cx, cy = fx * w + dx, fy * h + dy; rr = int(w * 0.03); live = abs(dx) + abs(dy) > 2
        if live: d.line((fx * w, fy * h, cx, cy), fill=ACCENT, width=lw)
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=ACCENT if live else (0, 113, 235, 120), outline=(255, 255, 255, 220), width=2)
    return im

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("run"); ap.add_argument("out"); ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--duration", type=float, required=True); ap.add_argument("--offset", type=float, default=0.0)
    ap.add_argument("--pad", default="ps"); ap.add_argument("--width", type=int, default=440); a = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__)); pad = Image.open(os.path.join(here, "..", "..", "src", "assets", "pads", f"pad-{a.pad}.png")).convert("RGBA")
    scale = a.width / pad.width; pad = pad.resize((a.width, int(pad.height * scale)), Image.LANCZOS)
    samples = load_run(a.run); os.makedirs(a.out, exist_ok=True); n = int(a.duration * a.fps)
    for i in range(n):
        draw(pad, state_at(samples, i / a.fps + a.offset), scale).save(os.path.join(a.out, f"f{i:05d}.png"))
    print(f"{n} frames -> {a.out}")

if __name__ == "__main__":
    main()
