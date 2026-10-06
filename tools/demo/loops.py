#!/usr/bin/env python3
"""Short loops of Steer's own panels for the site and for social clips.

    (cd ../steer && just dev-up)
    tools/demo/loops.py scratch/loops

Records only Steer Dev's windows (record-apps), then crops each take to its
panel. The keyboard types into a fresh TextEdit document this script opens and
closes; it refuses if TextEdit is already running. The ring and Window Snap
cancel at the end, so nothing of the owner's is opened or moved.
"""
import json
import random
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from take import BID, REC, STEER, agent, find, inject, osa, path, press  # noqa: E402

WINIDS = Path(__file__).resolve().parent.parent.parent / "scratch/take/winids"


def beat(lo=0.35, hi=0.6):
    time.sleep(random.uniform(lo, hi))


def aim(stick, dx, dy, hold=0.18):
    """An eased push: ramp in, hold, ease out, like a thumb."""
    ax = stick + "Stick"; steps = []
    for k in (0.35, 0.7, 1.0):
        steps.append(["sticks", {ax + "X": 128 + round(127 * dx * k), ax + "Y": 128 + round(127 * dy * k)}, 0.03])
    steps += [["hold", hold], ["sticks", {ax + "X": 128 + round(60 * dx), ax + "Y": 128 + round(60 * dy)}, 0.03], ["release"]]
    inject(steps)


def panel():
    """The largest Steer overlay that is neither the dimmer nor the menu popup."""
    pid = subprocess.run(["pgrep", "-f", "/Steer Dev.app/Contents/MacOS/Steer$"], capture_output=True, text=True).stdout.split()[0]
    out = subprocess.run([str(WINIDS), pid], capture_output=True, text=True).stdout.splitlines()
    best = None
    for line in out:
        wid, layer, x, y, w, h = (int(v) for v in line.split()[:6])
        if 0 < layer <= 20 and w < 1700 and w != 232 and w * h > 20000 and (best is None or w * h > best[2] * best[3]):
            best = (x, y, w, h)
    return best


def record(name, seconds, drive, outdir):
    mov = outdir / f"{name}.mov"
    rec = subprocess.Popen([str(REC), str(mov), str(seconds), BID], stdout=subprocess.PIPE, text=True)
    if rec.stdout.readline().strip() != "recording":
        sys.exit("recorder did not start")
    time.sleep(0.6)
    box = drive()
    rec.wait(timeout=seconds + 30)
    json.dump({"box": box}, open(outdir / f"{name}.json", "w"))
    print(name, box)


def keyboard():
    press("r3"); time.sleep(1.0); box = panel()
    cur = {0: find(0, "f"), 1: find(1, "j")}
    for ch in "hello mac":
        if ch == " ":
            beat(); press("cross"); continue
        side = 0 if find(0, ch) else 1
        for dr, di in path(side, cur[side], find(side, ch)):
            aim("left" if side == 0 else "right", di, dr); beat(0.12, 0.25)
        cur[side] = find(side, ch); beat(0.15, 0.3)
        press("l2" if side == 0 else "r2"); beat(0.3, 0.55)
    time.sleep(1.2); press("r3"); time.sleep(0.6)
    return box


def ring():
    press("l3"); time.sleep(1.0); box = panel()
    for dx, dy in ((0, -1), (1, 0), (0.7, 0.7), (-0.7, 0.7), (-1, 0)):
        aim("left", dx, dy, hold=0.7); beat(0.4, 0.7)
    press("circle"); time.sleep(0.8)
    return box


def snap():
    inject([["chord", ["l1", "circle"], 0.14]]); time.sleep(1.1); box = panel()
    for dx, dy in ((-1, 0), (0, -1), (1, 0), (1, 0), (0, 1)):
        aim("left", dx, dy); beat(0.6, 0.9)
    press("circle"); time.sleep(0.8)
    return box


def main():
    outdir = Path(sys.argv[1]).resolve(); outdir.mkdir(parents=True, exist_ok=True)
    if subprocess.run(["pgrep", "-x", "TextEdit"], capture_output=True).returncode == 0:
        sys.exit("TextEdit is running; its windows would be yours. Quit it first.")
    try:
        osa('tell application "TextEdit" to make new document')
        time.sleep(1.0)
        osa('tell application "TextEdit" to activate')
        time.sleep(0.8)
        agent("steer://padview/show", 800)  # a Steer window, so the recorder can see the app
        time.sleep(0.6)
        record("keyboard", 22, keyboard, outdir)
        record("ring", 12, ring, outdir)
        record("snap", 12, snap, outdir)
    finally:
        for r in ("keyboard/hide", "radial/hide", "windowsnap/hide", "padview/hide"):
            subprocess.run(["just", "agent", f"steer://{r}", "300"], cwd=STEER, capture_output=True, check=False)
        osa('tell application "TextEdit" to close every document saving no')
        osa('tell application "TextEdit" to quit')


if __name__ == "__main__":
    main()
