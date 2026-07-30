---
title: Measure the category before you treat an admired page as the target
date: 2026-07-30
category: process
module: steer-site homepage
problem_type: best_practice
severity: medium
applies_when:
  - someone points at a site or product and says "why does ours not look like that"
  - about to optimise a number (page length, word count, load time) toward one example
  - a redesign is being justified by comparison to a single reference
tags: [design, benchmarking, measurement, landing-page, prior-art]
---

## The claim

One admired example is a sample of one. Before optimising toward it, measure
five to ten peers the same way. The reference is often the outlier, and the
number you were about to chase is often already fine.

## What happened

The brief was "our page looks bland next to romm.app". romm renders 3,441px;
ours was 8,890px. Two and a half times longer looked like the obvious defect, so
a chunk of the day went into cutting section padding and folding bands to close
that gap.

Then eight peer Mac-app landing pages got measured the same way — rendered
height at 1440, visible word count, internal links in `<main>`:

| site | screens | words | links in main |
|---|---|---|---|
| raycast | 17.4 | 1628 | 71 |
| cleanshot | 11.7 | 1125 | 17 |
| kaleidoscope | 9.8 | 1269 | 2 |
| tableplus | 9.6 | 418 | 5 |
| **ours** | **9.9** | **1327** | **6** |
| mimestream | 8.0 | 626 | 1 |
| folivora | 5.8 | 1703 | 3 |
| rectangle | 5.1 | 238 | 7 |
| **romm** | **3.8** | **702** | **0** |

Median around 9.7 screens. We were *below* it. romm is the outlier at both ends
— shortest page and zero internal links — and length was never the defect.

The actual difference was visible once the wrong hypothesis was dead: every one
of romm's cells carries a mark, and none of ours did. That is a density and
illustration problem, not a length one, and cutting padding had been making the
page worse at the thing that was actually wrong.

## The second-order lesson

"Nobody in this category does X" was also used, by me, as an argument against a
proposal — a single-screen hub page with routed links. It was wrong twice over:
absence of prior art is weak evidence, and there *was* prior art (PostHog ships
exactly that) sitting in a list of examples I had been handed and had not
opened. Check the examples you are given before arguing from their absence.

## The shape

The tell is a comparison with one term. "Why isn't ours like theirs" contains a
hypothesis, and the hypothesis is usually the most visible difference rather
than the operative one. Cheap corrective, in this order:

1. Measure the reference **and** its peers, same method, same script.
2. Find which measured axis actually separates them.
3. Only then decide what to change.

Step 1 cost about twenty minutes with a headless browser and overturned the
premise of several hours of work.

## Related

- [[edit-structured-formats-with-a-parser-not-a-line-filter]] — the other way a
  confident wrong number cost a day here
