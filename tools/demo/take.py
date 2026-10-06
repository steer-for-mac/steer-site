#!/usr/bin/env python3
"""Steer Dev driven through its own synthetic controller: frame injection, an
eased pointer stroke, and the split keyboard's stepping ported from
SteerCore/SplitKeyboard.swift with a shortest-path planner. tools/demo/loops.py
builds the site's loops on these. main() is an earlier full take against a
fresh TextEdit document, kept as a reference for staging and teardown.
"""The homepage hero take: Steer Dev drives a fresh TextEdit document on
Desktop 2 through its own synthetic controller, and record-apps films only
Steer Dev and that TextEdit, never anything else on screen.

    (cd ../steer && just dev-up)
    tools/demo/take.py scratch/take/hero.mov

Refuses if TextEdit is already running (its windows would be the owner's).
Everything it opens is closed at the end, and Desktop 1 is restored.
"""
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
STEER = ROOT.parent / "steer"
BID = "dev.seanfloyd.steer.dev"
TMP = Path.home() / "Library/Containers/dev.seanfloyd.steer.dev/Data/tmp"
REC = ROOT / "scratch/take/record-apps"
TICK = 0.008
WORDS = "movie night"


def sh(*a, check=True):
    return subprocess.run(a, capture_output=True, text=True, check=check).stdout.strip()


def osa(s):
    return sh("osascript", "-e", s)


def agent(route, wait=600):
    return json.loads(sh("just", "agent", route, str(wait), cwd=None) if False else subprocess.run(
        ["just", "agent", route, str(wait)], cwd=STEER, capture_output=True, text=True, check=True).stdout)


def space():
    out = subprocess.run(["just", "spaces"], cwd=STEER, capture_output=True, text=True, check=True).stdout
    return out.split()[0]


def mouse():
    x, y = subprocess.run(["swift", "tools/ax/ax.swift", "mouse"], cwd=STEER, capture_output=True,
                          text=True, check=True).stdout.split()
    return int(x), int(y)


# ---------- synthetic frames (tools/demo/scene.py's grammar, inlined) ----------
n = [0]


def inject(steps):
    t, frames, held = 0.0, [], {}
    for st in steps:
        kind = st[0]
        if kind == "hold":
            t += st[1]
        elif kind == "sticks":
            held.update(st[1]); frames.append({"timestamp": round(t, 4), "state": dict(held)}); t += st[2]
        elif kind == "release":
            held = {}; frames.append({"timestamp": round(t, 4), "state": {}}); t += TICK
        elif kind in ("press", "chord"):
            btns = [st[1]] if kind == "press" else st[1]
            s = dict(held); s.update({b: True for b in btns})
            frames.append({"timestamp": round(t, 4), "state": s}); t += st[2]
            frames.append({"timestamp": round(t, 4), "state": dict(held)}); t += TICK
    frames.append({"timestamp": round(t, 4), "state": {}})
    n[0] += 1
    p = TMP / f"take-{n[0]}.json"
    p.write_text(json.dumps({"frames": frames, "loop": False}))
    sh("open", "-g", "-b", BID, f"steer://debug/inject?file={p}")
    time.sleep(frames[-1]["timestamp"] + 0.35)


def press(b, ms=110):
    inject([["press", b, ms / 1000]])


def glide(tx, ty):
    """One eased stroke; on this Mac magnitude 118 covers about 590 px/s."""
    x, y = mouse(); d = math.hypot(tx - x, ty - y)
    if d < 6:
        return
    dur = max(0.35, d / 590); k = max(8, round(dur / TICK)); ux, uy = (tx - x) / d, (ty - y) / d
    steps = [["sticks", {"leftStickX": 128 + round(118 * math.sin(math.pi * (i + .5) / k) * ux),
                         "leftStickY": 128 + round(118 * math.sin(math.pi * (i + .5) / k) * uy)}, TICK] for i in range(k)]
    inject(steps + [["release"]])


# ---------- the split keyboard, ported from SteerCore/SplitKeyboard.swift ----------
def _row(left, right):
    x = 0.0; out = []
    for side in (left, right):
        keys = []
        for name, w in side:
            keys.append({"k": name, "x": x, "w": w}); x += w
        out.append(keys)
    return out


LETTER = lambda s: [(c, 1) for c in s]
ROWS = [
    _row([("esc", 1.5)] + [(f"F{i}", 1) for i in range(1, 6)], [(f"F{i}", 1) for i in range(6, 12)] + [("F12", 2)]),
    _row(LETTER("`12345"), LETTER("67890-=") + [("delete", 1.5)]),
    _row([("tab", 1.5)] + LETTER("qwert"), LETTER("yuiop[]\\")),
    _row([("caps", 1.75)] + LETTER("asdfg"), LETTER("hjkl;'") + [("return", 1.75)]),
    _row([("shift", 2.25)] + LETTER("zxcvb"), LETTER("nm,./") + [("shift", 2.25)]),
    _row([("fn", 1), ("ctrl", 1), ("opt", 1), ("cmd", 1.25), ("space", 2.5)],
         [("space", 2.5), ("cmd", 1.25), ("opt", 1), ("left", 1), ("updown", 1), ("right", 1)]),
]  # the arrows' up/down stack is never a typing target, so it is one slot here


def move(side, r, i, dr, di):
    keys = ROWS[r][side]
    if dr:
        t = r + dr
        if 0 <= t < len(ROWS):
            here = keys[i]; c = here["x"] + here["w"] / 2; tk = ROWS[t][side]
            hits = [j for j, k in enumerate(tk) if (k["x"] <= c < k["x"] + k["w"] if dr > 0 else k["x"] < c <= k["x"] + k["w"])]
            if hits:
                r, i = t, hits[0]
            else:
                r, i = t, min(range(len(tk)), key=lambda j: max(tk[j]["x"] - c, c - tk[j]["x"] - tk[j]["w"], 0))
        keys = ROWS[r][side]
    if di:
        cands = [j for j, k in enumerate(keys) if (k["x"] > keys[i]["x"] if di > 0 else k["x"] < keys[i]["x"])]
        if cands:
            i = (min if di > 0 else max)(cands, key=lambda j: keys[j]["x"])
    return r, i


def find(side, ch):
    for r, row in enumerate(ROWS):
        for i, k in enumerate(row[side]):
            if k["k"] == ch:
                return r, i
    return None


def path(side, start, goal):
    """Fewest stick pushes, diagonals included, by breadth-first search."""
    from collections import deque
    dirs = [(dr, di) for dr in (-1, 0, 1) for di in (-1, 0, 1) if dr or di]
    seen = {start: None}; q = deque([start])
    while q:
        cur = q.popleft()
        if cur == goal:
            break
        for d in dirs:
            nxt = move(side, *cur, *d)
            if nxt not in seen:
                seen[nxt] = (cur, d); q.append(nxt)
    out = []; cur = goal
    while seen[cur]:
        cur, d = seen[cur][0], seen[cur][1]; out.append(d)
    return out[::-1]


def push(side, dr, di):
    ax = ("left" if side == 0 else "right") + "Stick"
    inject([["sticks", {ax + "X": 128 + 127 * di if di >= 0 else 128 + 128 * di, ax + "Y": 128 + 127 * dr if dr >= 0 else 128 + 128 * dr}, 0.16], ["release"], ["hold", 0.06]])


def type_words(text):
    cur = {0: find(0, "f"), 1: find(1, "j")}
    for ch in text:
        if ch == " ":
            press("cross"); continue
        side = 0 if find(0, ch) else 1
        for dr, di in path(side, cur[side], find(side, ch)):
            push(side, dr, di)
        cur[side] = find(side, ch)
        press("l2" if side == 0 else "r2")


# ---------- stage, roll, tear down ----------
def main():
    out = Path(sys.argv[1]).resolve()
    if subprocess.run(["pgrep", "-x", "TextEdit"], capture_output=True, check=False).returncode == 0:
        sys.exit("TextEdit is running; its windows would be yours. Quit it first.")
    if subprocess.run(["pgrep", "-f", "/Steer Dev.app/Contents/MacOS/Steer$"], capture_output=True, check=False).returncode:
        sys.exit("Steer Dev is not running: (cd ../steer && just dev-up)")
    TMP.mkdir(parents=True, exist_ok=True)
    home = space()
    osa('tell application "System Events" to key code 124 using control down')  # one desktop right
    time.sleep(1.2)
    if space() == home:
        sys.exit("could not reach Desktop 2")
    rec = None
    try:
        osa('tell application "TextEdit" to make new document')
        time.sleep(1.0)
        osa('''tell application "TextEdit"
  activate
  set bounds of front window to {300, 170, 1180, 640}
  set size of text of front document to 30
end tell''')
        if osa('tell application "TextEdit" to count windows') != "1":
            sys.exit("TextEdit has more than the one window this take made")
        agent("steer://padview/show", 800)
        time.sleep(0.8)
        rec = subprocess.Popen([str(REC), str(out), "40", BID, "com.apple.TextEdit"], stdout=subprocess.PIPE, text=True)
        if rec.stdout.readline().strip() != "recording":
            sys.exit("recorder did not start")
        time.sleep(1.0)
        glide(560, 340); press("cross"); time.sleep(0.5)            # into the document
        press("r3"); time.sleep(0.9)                                  # the keyboard
        type_words(WORDS); time.sleep(0.8)
        press("r3"); time.sleep(0.8)                                  # closed
        inject([["chord", ["l1", "circle"], 0.14]]); time.sleep(1.0)  # Window Snap
        push(0, 0, -1); time.sleep(0.5)                               # Centre to Left Half
        press("cross"); time.sleep(1.4)                               # snap
        press("l3"); time.sleep(0.9)                                  # your apps
        push(0, -1, 0); time.sleep(0.8)                               # point at Safari
        press("circle"); time.sleep(0.8)                              # and decline
        press("create"); time.sleep(2.4)                              # the help card
        press("create"); time.sleep(1.5)
        rec.wait(timeout=60)
        typed = osa('tell application "TextEdit" to get text of front document')
        print("typed:", repr(typed))
        if typed.strip() != WORDS:
            print("WARNING: the document does not read", repr(WORDS))
    finally:
        if rec and rec.poll() is None:
            rec.terminate()
        for r in ("keyboard/hide", "radial/hide", "help/hide", "windowsnap/hide", "padview/hide"):
            subprocess.run(["just", "agent", f"steer://{r}", "300"], cwd=STEER, capture_output=True, check=False)
        osa('tell application "TextEdit" to close every document saving no')
        osa('tell application "TextEdit" to quit')
        time.sleep(0.8)
        osa('tell application "System Events" to key code 123 using control down')  # back to Desktop 1
        time.sleep(1.0)
        print("desktop restored" if space() == home else "WARNING: not back on the starting desktop")


if __name__ == "__main__":
    main()
