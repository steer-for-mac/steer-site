# Page architecture: is the homepage the wrong shape?

Measured 2026-08-19. Stale by default: the peer numbers are a snapshot and the
sites move. Re-run `scratch/arch/measure.mjs` before trusting a row.

The question this answers was left open on 2026-08-03, in these words: *"falling
into the trap of shoving it all into a single page again"*, alongside *"what's
the goal for each page?"* and *"so is the hero-logi the right shape?"*.

## The answer

**Shoving it all into one page is the category norm, not the trap.** The hub
shape is what a company builds when it is no longer selling one app.

Twelve sites measured the same way (rendered height at 1440x900, visible words
in `<main>`, internal links in `<main>`, and the distinct paths those links
reach). Nine of twelve route to three destinations or fewer, or route only
through nav and footer chrome:

| site | screens | words | real destinations | shape |
|---|---|---|---|---|
| controllerkeys | 38.2 | 2808 | 6, of which 5 are locale clones | single page |
| raycast | 17.4 | 1617 | 71 | hub |
| cleanshot | 11.8 | 1123 | 17 | hybrid |
| kaleidoscope | 9.8 | 1269 | 2 | single page |
| tableplus | 9.6 | 418 | 5, mostly utility | single page |
| **steer (today)** | **8.7** | **~1510 visible** | **5** | **single page** |
| rewasd | 8.7 | 1825 | 13 device pages | hybrid |
| mimestream | 8.0 | 626 | 1 | single page |
| openlogi | 6.9 | 568 | 4, all downloads | single page |
| logitech mx-software | 6.7 | 648 | 12, all off-page | page inside a corporate site |
| folivora | 6.5 | 1838 | 3 | single page |
| rectangle | 5.1 | 238 | 7, mostly legal | single page |
| romm | 3.9 | 646 | 0 | single page |

The three genuine hubs are the ones that outgrew being an app: raycast is an
extension store, posthog a multi-product suite, rewasd a per-device content
farm. Length does not predict architecture at all: the longest page measured is
the purest single page, and the shortest real homepage has more routed
destinations than one three times its height.

Steer sits at the category median on both axes. This is the second time a length
hypothesis about this page has been measured and died; see
`lessons/process/measure-the-category-before-treating-a-reference-as-a-target.md`.

**posthog is unmeasured, not small.** It scrolls inside a container, so
`documentElement.scrollHeight` reports exactly the viewport. Its destination
count is still valid and is what its hub call rests on.

## So what IS wrong

Not the length, and not the number of pages. Two things:

1. **Claims that disagree across pages.** Two were found, both between pages
   whose whole value is being checkable. Tracked separately, because each needs
   the app repo to settle rather than an opinion.
2. **A homepage band that is a pure excerpt.** `capabilities` items 01 to 06 are
   each a one-line excerpt of a `features.html` entry and item 07 is literally
   "Everything else"; the band's own link says "See all 38, in plain language".
   Note that cutting it is NOT the indicated fix. `bad901e` already cut this
   page to peer length once and the result read as bland, because three bands
   kept the shape of a longer page and rendered with card-sized holes. The curb
   records the conclusion: when a band reads as empty the fix is ink, not fewer
   words.

Duplication between the homepage and a sub-page is not itself a defect. In a
single-page category the homepage is the complete argument and the sub-pages are
the depth, so the same claim appearing in both is the shape working. Only
duplication that *disagrees* is a bug.

## What the two references actually contribute

Neither is a target. Measured for what they do differently, not for their look.

**logitech.com/mx-software** explains everything with flat raster: six visual
mechanisms, all photographs, annotated JPEGs, screenshots or MP4. Zero inline
SVG in `<main>`, zero code blocks, zero interactive explainers. Its callout
numbers are burned into the JPEG and decoded by a legend list underneath.

**openlogi.org** uses five load-bearing mechanisms and three of them are vector
or text that mutate at runtime: an annotated app screenshot with DOM callouts,
an interactive hotspot configurator over a product PNG, a live TOML block that
rewrites as you bind, inline SVG feature schematics, and an inline SVG trust
boundary diagram.

Both explain the same idea Steer's hero explains, that a physical button maps to
an action, and both do it with a callout-annotated device. That is the one place
they converge, and it is worth taking seriously: **the annotated device is the
category's answer, and Steer's version of that asset is already the strongest of
the three** (per-pad, themeable, swappable, hand-built vector rather than a
baked JPEG). Only its labels are broken, which is a sizing defect, not a reason
to abandon a pad-led hero.

**openlogi's first section below the hero is the configurator: the core
interaction, immediately.** Steer's is a statistics strip.

## What openlogi changes about positioning

It is not a functional competitor. It configures Logitech mice; Steer drives a
Mac from a game controller. Nobody chooses between them.

It competes for the frame. "Local-first, no account, no telemetry" is the exact
ground `trust.html` stands on, and openlogi took 1,070 points on Hacker News
standing there, for free, with the source published. Consequence: **on-device
stops being a differentiator and becomes hygiene.** The differentiator is the
one fact no competitor can print, which `gap.html` already carries: macOS can
remap a controller and cannot be run by one.

The warning from that thread is about tone, not architecture. Its harshest
criticism was the landing page: *"the vacuous marketing speak is tedious,
unpleasant and risks undermining the technology"*, and *"website made by LLM
almost invariably means the software was written by an LLM too"*. That landed on
a free open-source project, where goodwill is highest. A paid closed-source app
gets none of that slack, which is an argument for the copy rules already in
`design-rules.md` and against anything that reads as generated.

## The persona row, and why it is blocked

Logitech's segment row sits directly under the hero: six circular **lifestyle
photographs**, four of them audience segments, every one routing off the page.
It is the most portable idea on that page and the storyboard already proposes
it as frame 02.

It is blocked on photography that does not exist. The storyboard marks these
frames as needing a camera, and `design-rules.md` records what happens when a
band ships without its ink. Six grey circles would be worse than no row.

## Overruled, 2026-09-02

The owner chose the hero-logi anatomy outright after three rounds, and the
homepage now ships it: banner with the four silhouettes, six persona circles,
intro, one panel holding a screen recording, per-app cards, the named grid, a
subscribe strip. The persona row shipped with drawn pictograms as the
placeholder for the photographs this doc says it needs; the pad-led device
band, uses, feel, gap, trust and pricing left the homepage (gap to vs.html,
trust to trust.html, the rest parked under src/_includes/parked and
src/styles/parked). The peer table above stands as measurement; the page is
now shorter than every peer in it but romm, by decision, not by drift.
