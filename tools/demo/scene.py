#!/usr/bin/env python3
"""Author a sparse 125Hz frame file for steer://debug/inject from a choreography.
Steps: ("hold", s) | ("stick", axis, value, s) | ("sticks", {axis:value}, s) | ("press", button, s) | ("chord", [buttons], s)
Stick deflections persist until ("release",). Buttons release at the end of their step.
"""
import json, sys
TICK = 0.008
def build(steps):
    t = 0.0; frames = []; held = {}
    def emit(state):
        nonlocal t
        frames.append({"timestamp": round(t, 4), "state": dict(state)})
    for step in steps:
        kind = step[0]
        if kind == "hold":
            t += step[1]
        elif kind == "stick":
            _, axis, value, dur = step; held[axis] = value; emit(held); t += dur
        elif kind == "sticks":
            _, axes, dur = step; held.update(axes); emit(held); t += dur
        elif kind == "release":
            held = {}; emit(held); t += TICK
        elif kind == "press":
            _, btn, dur = step; s = dict(held); s[btn] = True; emit(s); t += dur; emit(held); t += TICK
        elif kind == "chord":
            _, btns, dur = step; s = dict(held); [s.__setitem__(b, True) for b in btns]; emit(s); t += dur; emit(held); t += TICK
        else: raise SystemExit(f"unknown step {step}")
    frames.append({"timestamp": round(t, 4), "state": {}})
    return {"frames": frames, "loop": False}
if __name__ == "__main__":
    steps = json.loads(sys.argv[1]); json.dump(build(steps), open(sys.argv[2], "w"), indent=0); print("frames:", len(build(steps)["frames"]))
