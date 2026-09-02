---
title: The app can film itself through its own input path
date: 2026-09-02
category: process
module: marketing video, tools/syninput
problem_type: best_practice
severity: high
applies_when:
  - a page needs footage of Steer driving a Mac and there is no camera, no controller, or no hands free
  - someone proposes a screenshot, a drawing, or generated video for a claim the app can demonstrate live
tags: [video, synthetic-input, screencapture, ffmpeg, marketing]
---

## The lesson

A demo of Steer does not need a hand on a pad. The dev build's synthetic
controller (`steer://debug/connect`, `steer://debug/inject?file=`) sends
frames through the same tick loop as real hardware, so a scripted stick and
button sequence moves the real cursor, opens the real on-screen keyboard, and
types into a real app. `screencapture -v -C -R x,y,w,h` records that region at
native 2x with the cursor. The homepage centrepiece was made this way in one
take: the TV app's search, "the studio" typed a letter at a time, results
rebuilding live, Return, pointer onto the result. Every frame is the app's
own output.

## What it took, so it is not re-derived

- Scene from `~/Developer/steer/tools/syninput` plus a choreography builder
  (`scene.py` in this session's scratchpad; sparse 125 Hz frames, state
  persists between frames). Aim the stick in one frame, press the face button
  in a later one while still deflected, then release.
- Calibration on this Mac: full deflection moves the cursor about 1180 px/s
  after acceleration; a sine-eased stroke at magnitude 118 covers about 590 px
  per second, at 70 about 140 px/s. Stick Y positive is down.
- On-camera pointer moves must be ONE eased stroke per move. Closed-loop
  correction pulses read as a twitching cursor and were called out on sight.
  Use closed-loop only off camera, to park the cursor or focus a field.
- Frame the region inside the display and inside the window: a region past
  the screen edge records black, and any window the region uncovers is in the
  shot. Re-assert the window's position and size immediately before rolling;
  a stray click on a toolbar can drag it between takes.
- The wheel window keeps its last position; place it with System Events before
  the take so the results stay visible beside it.
- The dev build opens an empty Settings window on launch; close it first.
- Pin the URL handler: `open -g -b dev.seanfloyd.steer.dev "steer://..."`. A bare
  `open steer://` goes to whichever copy LaunchServices prefers, which was
  /Applications/Steer.app, launched silently mid-session and fed another
  session's chords. Check `ListAgents` before driving the screen at all.

## Related

- [[inventory-the-ink-before-concluding-it-does-not-exist]]: the same claim
  three sessions earlier, about stills.
