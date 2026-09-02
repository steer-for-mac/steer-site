---
title: Inventory the ink before concluding it does not exist
date: 2026-09-02
category: process
module: homepage, src/assets
problem_type: best_practice
severity: high
applies_when:
  - a band or page "reads as empty" and the proposed fix is a new drawing, a new layout, or a photo shoot
  - a session is about to conclude that the assets a design needs are missing
  - a design canvas or comp has been iterating on line art for more than one round
tags: [design, assets, screenshots, hero, ink]
---

## The lesson

Before deciding a design is blocked on assets, list the assets. Three sessions
(2026-08-01, 2026-08-19, and the canvas loop) concluded the homepage needed
photography that did not exist, and each drifted to line drawings, which the
owner rejected every time. `src/assets/` held fifteen 2x app panes in both
themes, two real desktop captures (the app ring over Applications, the
on-screen keyboard) and three transparent manufacturer renders the whole time.
The hero that finally read as a marketing site is one real capture in a window
frame with a render set down in front of it. No new asset was made.

## The measurement

- Assets on disk before this session: 15 settings panes x 2 themes at 2000x1760,
  2 desktop captures at 1600x1200, 3 renders at 2400x880 with alpha.
- Assets any earlier session's transcript enumerated: 0. The pad-art brief
  lists the SVG pipeline in detail and never the PNG directory beside it.
- Cut because it was drawn rather than captured: the capabilities band's
  controller-to-Mac diagram and the six-chip persona row. The four use-case
  plates were cut in the same pass and put back the same day: they are CSS
  loops, frozen under webdriver, and a paused proof looks exactly like a
  static drawing. Judge a plate with `.still` removed and two frames diffed.

## The shape

The trigger is a sentence like "blocked on photography" or "line drawings cover
all four pads consistently". Both are rationalisations for not having looked.
The check is one command: `fd . src/assets -t f`, then open the six largest.
If a real capture of the thing the band claims exists, it goes in a `.shot`
frame at a legible crop and a static drawing goes. A looping plate is not a
static drawing: it proves press, Mac reacts, pad answers, which no capture
can, so it stays beside the capture rather than under it. If none exists, say which
capture the app's own `refresh-design-shots.sh` would produce, not which photo
a camera would.

## Related

- [[measure-the-category-before-treating-a-reference-as-a-target]]: same
  failure one level up, a conclusion reached without the cheap measurement.
- [[a-full-page-screenshot-is-not-a-render-of-lazy-images]]
