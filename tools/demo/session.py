#!/usr/bin/env python3
"""One continuous session for the homepage panel, driven through the dev build's
synthetic pad and recorded from the screen. Every input is logged with its time
since the recording started, so overlay.py can draw the pad frame-accurately.

  session.py <out.mov> [--stage | --roll | --teardown]

Preconditions, all checked before rolling: no other session driving the screen
(ListAgents on the caller's side), Steer Dev.app launched by path, the handler
pinned by bundle id, desktop icons hidden, Safari and the TV app staged, and a
pre-roll screenshot the caller looks at before recording. Everything opened here
is closed in teardown; desktop icons come back.
"""
import json, math, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__)); from scene import build
DEV = os.path.expanduser("~/Developer/steer/Steer Dev.app"); BID = "dev.seanfloyd.steer.dev"
C = os.path.expanduser("~/Library/Containers/dev.seanfloyd.steer.dev/Data/tmp"); STEER = os.path.expanduser("~/Developer/steer")
REGION = "0,25,1728,1092"     # the display below the menu bar, cropped in post
LOG = []; T0 = None; SAFARI_WIN = None
WIN_FILE = os.path.join(C, "session-safari-window")   # the staged Safari window id, so --teardown in a later process still closes it
def sh(*a, **k): return subprocess.run(a, capture_output=True, text=True, **k)
def osa(script): return sh("osascript", "-e", script).stdout.strip()
def ax(*a): return sh("swift", f"{STEER}/tools/ax/ax.swift", *a, cwd=STEER).stdout.split()
def mouse(): x, y = ax("mouse"); return int(x), int(y)
def url(u): sh("open", "-g", "-b", BID, u)
n = [0]
def inject(steps, label):
    n[0] += 1; p = f"{C}/session-{n[0]}.json"; d = build(steps); json.dump(d, open(p, "w"))
    t = None if T0 is None else time.monotonic() - T0 + 0.3   # 0.3s: measured open(1) latency
    url(f"steer://debug/inject?file={p}"); LOG.append({"t": t, "file": p, "label": label})
    time.sleep(d["frames"][-1]["timestamp"] + 0.45)
def stroke(dx, dy, dur, mag=118):
    d = math.hypot(dx, dy); ux, uy = dx / d, dy / d; k = max(8, round(dur / 0.008)); steps = []
    for i in range(k):
        m = mag * math.sin(math.pi * (i + 0.5) / k)
        steps.append(["sticks", {"leftStickX": 128 + round(m * ux), "leftStickY": 128 + round(m * uy)}, 0.008])
    return steps + [["release"]]
def glide_to(tx, ty, label):
    x, y = mouse(); d = math.hypot(tx - x, ty - y)
    if d < 6: return
    inject(stroke(tx - x, ty - y, max(0.35, d / 590)), label)
def press(b, label, ms=90): inject([["press", b, ms / 1000]], label)
N=(128,10); NE=(218,38); E=(245,128); SE=(218,218); S=(128,245); SW=(38,218); W=(10,128); NW=(38,38)
LETTER = {}
for sec, letters in ((N,"abcd"),(NE,"efgh"),(E,"ijkl"),(SE,"mnop"),(S,"qrst"),(SW,"uvwx")):
    for L, btn in zip(letters, ("square","triangle","circle","cross")): LETTER[L] = (sec, btn)
def typed(word):
    """One aim per slice, consecutive same-slice letters are just presses."""
    steps = []; cur = None
    for ch in word:
        if ch == " ": steps += [["release"], ["press", "r2", 0.10], ["hold", 0.45]]; cur = None; continue
        sec, btn = LETTER[ch]
        if sec != cur: steps += [["release"], ["sticks", {"leftStickX": sec[0], "leftStickY": sec[1]}, 0.34]]; cur = sec
        steps += [["press", btn, 0.10], ["hold", 0.42]]
    return steps + [["release"]]

def setup():
    sh("open", "-a", DEV); time.sleep(3); osa('tell application "System Events" to tell process "Steer" to click button 1 of window "Steer Dev Settings"')
    url("steer://debug/connect?type=dualsense"); time.sleep(0.6)
    sh("defaults", "write", "com.apple.finder", "CreateDesktop", "false"); sh("killall", "Finder"); time.sleep(1.5)
    # Run this from the empty Space (Desktop 2), verified by the caller's screenshot first.
    # the owner's normal Safari, a normal window, the evening's real errand: the show's trailer
    # our own window, addressed by its id from here on; the owner's windows are never touched
    global SAFARI_WIN
    SAFARI_WIN = osa('tell application "Safari"\nset d to make new document with properties {URL:"https://www.youtube.com/results?search_query=monarch+legacy+of+monsters+official+trailer"}\nreturn id of front window\nend tell')
    open(WIN_FILE, "w").write(SAFARI_WIN)
    time.sleep(6); osa(f'tell application "Safari" to set bounds of window id {SAFARI_WIN} to {{0, 25, 1728, 1117}}'); time.sleep(0.5)
    # the TV app in front, full screen, on its search with one letter typed: the
    # session opens on the evening's first question, what to watch
    osa('tell application "TV" to activate'); time.sleep(3.5)
    osa('tell application "System Events" to tell process "TV" to set position of window 1 to {0, 25}'); osa('tell application "System Events" to tell process "TV" to set size of window 1 to {1728, 1092}'); time.sleep(0.6)
    tv = sh("pgrep", "-x", "TV").stdout.split()[0]; sh("swift", f"{STEER}/tools/ax/ax.swift", "click", "Search", "--pid", tv, cwd=STEER); time.sleep(1.2)
    osa('tell application "System Events" to keystroke "a" using {command down}'); osa('tell application "System Events" to keystroke "m"'); time.sleep(1.0)
def teardown():
    url("steer://daisy/hide"); url("steer://radial/hide"); url("steer://debug/disconnect"); time.sleep(0.4)
    win = SAFARI_WIN or (open(WIN_FILE).read().strip() if os.path.exists(WIN_FILE) else None)
    if win: osa(f'tell application "Safari" to close window id {win}')   # ours only, by id
    if os.path.exists(WIN_FILE): os.remove(WIN_FILE)
    sh("defaults", "delete", "com.apple.finder", "CreateDesktop"); sh("killall", "Finder")
    if sh("pgrep", "-f", "/Applications/Steer.app").stdout.strip(): osa('quit app "Steer"')

RING = ["Safari", "Finder", "Music", "Mail", "Calendar", "Notes", "Messages", "Settings", "TV"]  # dev config order, clockwise from the top; the ring holds nine
def ring_aim(label):
    """Stick vector for a ring slot: items sit clockwise from north, evenly spaced."""
    i = RING.index(label); a = math.radians(i * 360 / len(RING))
    return {"leftStickX": 128 + round(110 * math.sin(a)), "leftStickY": 128 - round(110 * math.cos(a))}
def ring_pick(label):
    return [["press", "l3", 0.10], ["hold", 1.0], ["sticks", ring_aim(label), 0.9], ["press", "cross", 0.10], ["hold", 0.3], ["release"]]
def frame_of(handle, app):
    pid = sh("pgrep", "-x", app).stdout.split()[0]; out = ax("frame", handle, "--pid", pid)
    if len(out) < 4: return None
    x, y, w, h = map(int, out[:4]); return (x + w // 2, y + h // 2)

def session(out):
    global T0
    # the ring's Safari pick raises Safari's front window: make sure that is ours
    if SAFARI_WIN: osa(f'tell application "Safari" to set index of window id {SAFARI_WIN} to 1')
    front = osa('tell application "System Events" to get name of first application process whose frontmost is true')
    if front != "TV": raise SystemExit(f"not rolling: frontmost is {front!r}, expected the TV app")
    rec = subprocess.Popen(["screencapture", "-v", "-C", "-V", "34", "-R", REGION, "-x", out]); T0 = time.monotonic(); time.sleep(1.2)
    # 01 type until the show appears
    inject([["chord", ["l1", "r3"], 0.12], ["hold", 1.0]] + typed("on"), "type on")
    time.sleep(1.2)
    inject([["chord", ["l1", "r3"], 0.12]], "close keyboard"); time.sleep(1.4)   # the list re-lays out once the keyboard is gone
    # rows are 88pt apart from 225pt down at this window size; the tree names none of them
    glide_to(560, 226, "to result"); time.sleep(0.3); press("cross", "open Monarch"); time.sleep(2.5)
    # 03 ring back to Safari, read: scroll with the right stick
    inject(ring_pick("Safari"), "ring: Safari")
    time.sleep(1.5)
    glide_to(520, 336, "to trailer"); time.sleep(0.3); press("cross", "play trailer"); time.sleep(5.5)
    press("r2", "pause", ms=100); time.sleep(1.2)
    inject([["sticks", {"rightStickY": 200}, 1.2], ["release"]], "scroll the page"); time.sleep(1.0)
    rec.wait(); json.dump(LOG, open(out + ".run.json", "w"), indent=1); print("recorded", out)

if __name__ == "__main__":
    out = sys.argv[1]
    if "--stage" in sys.argv:      # stage, screenshot the frame for a human look, leave everything up
        setup(); sh("screencapture", "-x", "-R", REGION, out + ".stage.png"); print("staged:", out + ".stage.png"); sys.exit()
    if "--teardown" in sys.argv: teardown(); sys.exit()
    if "--roll" in sys.argv:
        try: session(out)          # the frame was staged and verified by the caller
        finally: teardown()
        sys.exit()
    setup()
    try: session(out)
    finally: teardown()
