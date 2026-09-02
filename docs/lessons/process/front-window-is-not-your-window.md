---
title: Front window is not your window
date: 2026-09-02
category: process
module: tools/demo/session.py
problem_type: incident
severity: high
applies_when:
  - a script creates a window in the owner's browser to stage a capture and then raises, resizes, scrolls or closes it
  - a capture is triggered while the owner is away, so nobody sees the frame before it rolls
tags: [safari, applescript, spaces, screen-recording, ownership]
---

## What happened

The homepage retake was armed to roll when the Mac went idle. Its stage
created a Safari document and took `id of front window` as its own. Safari
put the new window in the Space where its other window lived, so the front
window was the owner's 27-tab window. The stage then set that window's
bounds, the ring pick switched Spaces and raised it, the right stick scrolled
it, and 34 seconds of the owner's tabs went into the recording. The TV app
had also reopened on the last show rather than on its search, and the runner
checked only that the TV app was frontmost, so the frame was wrong from the
first second. The recording was deleted; the window survived because the
teardown closed the id it had, which by then named a window that no longer
existed.

## The rules it left

- A window is yours only if it did not exist before you made it. Take the id
  from the difference of `id of every window` before and after, and refuse to
  stage when that difference is not exactly one window.
- A stage is a frame, not an app name. Compare the staged screenshot to a
  stored reference thumbnail (`tools/demo/stage-reference.png`, mean grey
  difference under 14 on a 192x124 thumbnail; the bad stage scored 147, the
  two good ones 0 and 4) and tear down on a miss.
- Unattended is not a licence. A run that fires on idle has nobody looking at
  the frame, so it needs every check a person would have made, and it still
  records the owner's display: if the Space changes, so does what is filmed.
