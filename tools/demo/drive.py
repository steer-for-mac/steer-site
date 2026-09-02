#!/usr/bin/env python3
"""Closed-loop choreography driver for Steer's synthetic pad. Usage: drive.py <scene> where scene in {typing}."""
import json, math, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__)); from scene import build
STEER = os.path.expanduser("~/Developer/steer"); DEV = f"{STEER}/Steer Dev.app"
C = os.path.expanduser("~/Library/Containers/dev.seanfloyd.steer.dev/Data/tmp")
def ax(*a): return subprocess.run(["swift", f"{STEER}/tools/ax/ax.swift", *a], capture_output=True, text=True, cwd=STEER).stdout.split()
def mouse(): x, y = ax("mouse"); return int(x), int(y)
n = [0]
def inject(steps, wait=None):
    n[0] += 1; p = f"{C}/take-{n[0]}.json"; d = build(steps); json.dump(d, open(p, "w"))
    subprocess.run(["open", "-g", "-b", "dev.seanfloyd.steer.dev", f"steer://debug/inject?file={p}"])
    time.sleep((wait if wait is not None else d["frames"][-1]["timestamp"]) + 0.45)
def move_to(tx, ty, tol=8):
    for _ in range(5):
        x, y = mouse(); dx, dy = tx - x, ty - y; d = math.hypot(dx, dy)
        if d <= tol: return (x, y)
        if d > 220: mag, speed = 127, 1000.0       # full deflection ~1000-1200 px/s
        elif d > 60: mag, speed = 70, 330.0
        else: mag, speed = 40, 110.0
        ax_, ay_ = 128 + round(mag * dx / d), 128 + round(mag * dy / d)
        inject([["sticks", {"leftStickX": ax_, "leftStickY": ay_}, min(1.6, d / speed)], ["release"]])
    return mouse()
def press(b, ms=90): inject([["press", b, ms / 1000]])
SE = {"leftStickX": 218, "leftStickY": 218}; S = {"leftStickX": 128, "leftStickY": 245}; N = {"leftStickX": 128, "leftStickY": 128}
def letter(sector, button):
    inject([["sticks", sector, 0.40], ["press", button, 0.10], ["hold", 0.22], ["release"]])
def typing(field=(832, 165), start=(1010, 760)):
    move_to(*start); time.sleep(0.6)
    p = move_to(*field); print("at field", p, flush=True); time.sleep(0.4)
    press("cross"); time.sleep(0.9)
    inject([["chord", ["l1", "r3"], 0.12]]); time.sleep(1.4)   # L1+R3 = on-screen keyboard
    for sec, btn in [(SE, "cross"), (SE, "circle"), (S, "triangle"), (S, "cross"), (SE, "circle")]:  # p o r t o
        letter(sec, btn); time.sleep(0.15)
    time.sleep(0.6); press("r3"); time.sleep(3.5)   # Return
if __name__ == "__main__":
    {"typing": typing}[sys.argv[1]]()
