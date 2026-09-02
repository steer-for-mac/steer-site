---
title: A full-page screenshot is not a render of lazy images
date: 2026-09-02
category: process
module: tools, screenshots
problem_type: silent_noop
severity: medium
applies_when:
  - a screenshot shows an empty card, frame, or figure where markup has an <img loading="lazy">
  - judging "this band reads as empty" from a Playwright full-page or element capture
tags: [playwright, screenshots, lazy-loading, avif, verification]
---

## The lesson

A `fullPage` screenshot, and an element screenshot taken after a fast scroll,
shows grey holes where lazy `<img>`s have not decoded yet. The homepage's six
feature panes and the trust dialog rendered as empty rectangles in three
successive captures and were about to be reported as a page defect. Every one
was `complete=true, naturalWidth=2000` once asked directly.

## The check

Before calling an image slot empty, walk it:

```js
[...document.querySelectorAll('#features img')].map(i =>
  `${i.currentSrc.split('/').pop()} complete=${i.complete} nat=${i.naturalWidth}`)
```

after scrolling the page through in ~500px steps with a pause, then waiting
about two seconds for avif decode. A screenshot is an instrument; negative
control it against the DOM before reasoning from what it shows.

## Related

- [[inventory-the-ink-before-concluding-it-does-not-exist]]: the conclusion
  this artefact nearly fed.
- [[headless-cannot-see-this-page-animate]]: the other way this page's
  captures lie under automation.
