---
title: A sandboxed app ignores per-app appearance defaults
date: 2026-09-02
category: process
module: captures, tools/demo/help-overlay.sh
problem_type: gotcha
severity: medium
applies_when:
  - a capture of the dev build is needed in dark appearance without changing the whole Mac
  - a script writes AppleInterfaceStyle into an app's defaults domain and the capture comes out light
tags: [screenshots, dark-mode, sandbox, defaults]
---

## The lesson

`defaults write dev.seanfloyd.steer.dev AppleInterfaceStyle Dark` does nothing
to the sandboxed dev build, and neither does writing the same key into the
container's own plist under `~/Library/Containers/<bundle>/Data/Library/
Preferences/`. Both captures came out light (mean luminance 224 of 255) after a
relaunch. What works is flipping the system appearance through System Events
for the seconds the surface is up, then putting it back to what it was:

```
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to true'
```

The dev build follows the change live, so no relaunch is needed and the
capture takes four seconds of the owner's screen. Record what the appearance
was before and restore exactly that, not "light".

## Also learned the same afternoon

Homebrew's ffmpeg is built without `drawtext`, so any pipeline that burns text
into a frame fails with `No such filter: 'drawtext'` and exits 8. Draw text
with Pillow into the overlay frames instead, or leave it to the page.
