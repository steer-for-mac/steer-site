#!/usr/bin/env python3
"""Short loops of Steer's own panels for the site and for social clips.

    (cd ../steer && just dev-up)
    tools/demo/loops.py scratch/loops [keyboard] [ring] [snap]   # all three by default
    tools/demo/loops.py cut scratch/loops/keyboard.json src/assets/app/loops/keyboard-dark

Records only Steer Dev's windows (record-apps), then crops each take to its
panel. The keyboard types into a fresh TextEdit document this script opens and
closes; it refuses if TextEdit is already running. The ring and Window Snap
cancel at the end, so nothing of the owner's is opened or moved.

Each take's json carries `marks`: seconds from the recorder's "recording" line
to each step (the keyboard's open, each word, done, closed). `cut` turns them
into the site's loop: done->closed, then open->done, so the seam falls on the
finished sentence and the loop restarts as the keyboard opens again.
"""
import json
import random
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from take import BID, REC, STEER, agent, find, inject, osa, path, press  # noqa: E402

MARKS: dict[str, float] = {}
T0 = [0.0]


def mark(name):
    MARKS[name] = round(time.monotonic() - T0[0], 3)


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
    T0[0] = time.monotonic(); MARKS.clear()
    time.sleep(0.6)
    box = drive()
    rec.wait(timeout=seconds + 30)
    (outdir / f"{name}.json").write_text(json.dumps({"box": box, "marks": dict(MARKS)}))
    print(name, box, MARKS)


def front_is_textedit():
    return osa('tell application "System Events" to get name of first process whose frontmost is true') == "TextEdit"


WORDS = ["type", "with", "your", "controller"]


def osk_state():
    """The keyboard as Steer Dev reports it: cursors, typed text, suggestions."""
    # The client itself, not `just agent`: a read per push, and just's start-up
    # alone made the take run out of time before "controller".
    out = subprocess.run([str(STEER / "tools/dev/steer-agent")], cwd=STEER, capture_output=True, text=True, check=True).stdout
    return json.loads(out)["state"]["overlays"]["onScreenKeyboard"]


def accept_if_offered(word):
    """If `word` is among the suggestions, step R1 to it and type it with
    Triangle, which also types the space. True if it did."""
    state = osk_state()
    if word not in state["suggestions"]:
        return False
    beat(0.3, 0.45)  # long enough to read the chips
    for _ in range(len(state["suggestions"])):
        state = osk_state()
        if state["suggestions"][state["suggestion"] or 0] == word:
            break
        press("r1"); beat(0.35, 0.5)
    press("triangle"); beat(0.35, 0.5)
    return True


def flicks(stick, route):
    """A route as one burst of flicks, as a thumb does it: each push a 60 ms
    deflection (one step; the stepper repeats only after 400 ms) and a 50 ms
    return to centre, which re-arms it."""
    ax = stick + "Stick"; steps = []
    for dr, di in route:
        steps += [["sticks", {ax + "X": 128 + 127 * di if di >= 0 else 128 + 128 * di,
                              ax + "Y": 128 + 127 * dr if dr >= 0 else 128 + 128 * dr}, 0.06],
                  ["release"], ["hold", 0.05]]
    inject(steps)


def type_letter(ch):
    """Flick the cursor of the half that holds `ch` onto it along the fewest
    pushes from where Steer says it is, check once, and type it."""
    side = 0 if find(0, ch) else 1
    stick, cursor = ("left", "leftCursor") if side == 0 else ("right", "rightCursor")
    for _ in range(4):
        here = osk_state()[cursor]
        if here["key"] == ch:
            break
        flicks(stick, path(side, (here["row"], here["index"]), find(side, ch)))
    else:
        sys.exit(f"the {stick} cursor never reached {ch!r}; it is on {osk_state()[cursor]['key']!r}")
    press("l2" if side == 0 else "r2"); beat(0.08, 0.16)


def one_textedit_window():
    count = osa('tell application "System Events" to tell process "TextEdit" to count windows')
    if count != "1":
        sys.exit(f"TextEdit has {count} windows, not the one document this take types into")


def keyboard():
    if not front_is_textedit():
        sys.exit("TextEdit is not in front; refusing to type into someone else's window")
    one_textedit_window()
    mark("open"); press("r3"); time.sleep(1.0); box = panel()
    for word in WORDS:
        if not front_is_textedit():
            sys.exit("TextEdit left the front mid-take; stopping before typing into another window")
        for n, ch in enumerate(word):
            if accept_if_offered(word):
                break
            type_letter(ch)
        else:
            if not accept_if_offered(word):  # typed in full: Space by hand
                beat(0.12, 0.2); press("cross"); beat(0.2, 0.3)
        mark(f"word:{word}")
    mark("done")
    time.sleep(1.4); press("r3"); time.sleep(0.6)
    mark("closed")
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


def cut(take_json, out_base, width=1600, height=880):
    """The loop from a take's marks: A = done->closed, B = open->done, cropped to
    the panel's box (points, so x2 for the Retina capture) at width:height,
    H.264 CRF 26 tuned for animation (e832428), and the first frame as poster."""
    take = json.loads(Path(take_json).read_text())
    m, (x, y, w, _) = take.get("marks", {}), take["box"]
    missing = {"open", "done", "closed"} - set(m)
    if missing:
        sys.exit(f"{take_json} has no {sorted(missing)} mark; record it again with this script")
    if not m["open"] < m["done"] < m["closed"]:
        sys.exit(f"marks out of order: {m}")
    cw = 2 * w
    ch = -(-cw * height // width // 2) * 2  # the output's aspect, rounded up to even
    crop = f"crop={cw}:{ch}:{2 * x}:{2 * y},scale={width}:{height}"
    a, b = (m["done"], m["closed"]), (m["open"], m["done"])
    graph = (f"[0:v]trim={a[0]}:{a[1]},setpts=PTS-STARTPTS[a];[0:v]trim={b[0]}:{b[1]},setpts=PTS-STARTPTS[b];"
             f"[a][b]concat=n=2:v=1[c];[c]{crop},fps=30,format=yuv420p[v]")
    mov = Path(take_json).with_suffix(".mov")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mov), "-filter_complex", graph, "-map", "[v]",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-tune", "animation",
                    "-movflags", "+faststart", "-an", f"{out_base}.mp4"], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{out_base}.mp4", "-frames:v", "1", "-q:v", "4",
                    f"{out_base}.jpg"], check=True)
    print(f"{out_base}.mp4: A {a[0]}-{a[1]} s + B {b[0]}-{b[1]} s, {crop}")


def main():
    if sys.argv[1:2] == ["cut"]:
        if len(sys.argv) != 4:
            sys.exit("usage: loops.py cut <take.json> <out base, no extension>")
        return cut(sys.argv[2], sys.argv[3])
    outdir = Path(sys.argv[1]).resolve(); outdir.mkdir(parents=True, exist_ok=True)
    if subprocess.run(["pgrep", "-x", "TextEdit"], capture_output=True).returncode == 0:
        sys.exit("TextEdit is running; its windows would be yours. Quit it first.")
    made = False
    try:
        # Launched without activating, TextEdit shows no Open panel; activated
        # first, it does, and that panel is a second window in the take.
        osa('tell application "TextEdit" to launch'); made = True
        time.sleep(0.8)
        osa('tell application "TextEdit" to make new document')
        time.sleep(0.8)
        osa('tell application "TextEdit" to activate')
        time.sleep(0.8)
        one_textedit_window()
        agent("steer://padview/show", 800)  # a Steer window, so the recorder can see the app
        time.sleep(0.6)
        osa('tell application "TextEdit" to activate'); time.sleep(0.5)
        only = set(sys.argv[2:]) or {"keyboard", "ring", "snap"}
        if "keyboard" in only:
            record("keyboard", 40, keyboard, outdir)
        if "ring" in only:
            record("ring", 12, ring, outdir)
        if "snap" in only:
            record("snap", 12, snap, outdir)
    finally:
        for r in ("keyboard/hide", "radial/hide", "windowsnap/hide", "padview/hide"):
            subprocess.run(["just", "agent", f"steer://{r}", "300"], cwd=STEER, capture_output=True, check=False)
        if made:  # compiling any `tell application "TextEdit"` launches it, so check from here
            for step in ("close every document saving no", "quit"):
                if subprocess.run(["pgrep", "-x", "TextEdit"], capture_output=True).returncode == 0:
                    subprocess.run(["osascript", "-e", f'tell application "TextEdit" to {step}'], capture_output=True, check=False)


if __name__ == "__main__":
    main()
