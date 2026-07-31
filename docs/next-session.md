# Handover, 2026-07-30

Two sessions. The design half is below and stands. The infrastructure half was
rewritten in the second session and **everything this doc originally said about
the build was made false by it** — corrected in place rather than left to
mislead, because that is exactly the failure the second session spent the day
removing. Read `CLAUDE.md` first, then this.

## Where the page is

6,960px, 7.7 screens, from 8,546 at the start of the day. `make ci` is green:
a11y structure, stylelint, curb-check + self-test, a 1440/375 render with an
overflow gate, and PurgeCSS reachability. Build freshness is no longer checked
because the build output is no longer committed.

Rebuilt today: `#uses` (four use cases scannable in one row again), `#feel`,
`#trust` (1,340 to 1,119, with `import-review.png` now behind its strongest
claim), `#pricing` (1,087 to 708), and the capabilities signal chain, which now
animates a press from controller to Steer to Mac. `#reach` and `#requirements`
were cut; requirements content moved to `support.html`.

Infrastructure, as of the second session and superseding what this paragraph
used to say: Eleventy assembles all 14 pages from `_includes/{bands,chrome,
layouts}` into `_site/`, Lightning CSS bundles `site.css` and `home.css` with
`--minify --targets`, the `Makefile` is the single place a task is defined, and
`scripts/` holds every gate and instrument. `bin/build`, `parts/` and `bin/`
are gone. Output is no longer committed.

Two live bugs were found and fixed on the way, both invisible to every gate:
Lightning CSS was emitting Media Queries Level 4 range syntax that Safari 16.3
cannot parse, silently disabling the responsive layout, and the production
build was overwritten by a dev build so 111 comments citing `docs/` paths and
commit hashes were shipping.

## What Sean still thinks is wrong

He has said "still looks bland" more than once, and the specific notes are all
open. In his priority order as I read it:

1. **The Feel plate is a gimmick** (#16). It illustrates the volume-ceiling
   haptic, which is the most trivial thing that band could show for a EUR 19.99
   product. The real moat is adaptive trigger resistance: feeling the click
   before it fires. I picked the d-pad because it is the one control named
   identically on all four pads, which optimised for "what can I draw once"
   rather than "what is worth showing".
2. **The signal chain looks wrong** (#20): the app icon sits in a drawn box that
   fights it, and the connector arrows are crude filled triangles that do not
   match the hairline language everywhere else.
3. **The layers figure does not read as held vs not held** (#17). The loop runs;
   it just does not communicate the one idea it exists for.
4. **Nobody cares that the app avoids private APIs** (#19). That trust row is
   developer reassurance on a page whose default reader is non-technical.
5. **The pad art should be the hero's** (#18), raised three times. Blocked on
   the hero pads being styled by CSS classes, which do not reach a `<use>`
   shadow tree. Custom properties *do* cross (verified), so converting the hero
   art to presentation attributes plus `var()` would give one source per pad.
6. **The illustrations answer the wrong question** (#2). They illustrate who the
   reader is; they should answer what stops a purchase: can I really type, is a
   stick precise enough, will my pad work, do I have to configure it first.

## The one to reconsider rather than continue

`#12`, the PostHog-style single-screen hub with routed links. It was Sean's
dad's idea, I dismissed it for "no prior art", and that was wrong twice over:
absence of prior art is weak evidence, and PostHog ships exactly that. A macOS
desktop is a more honest metaphor for Steer than it is for PostHog, and every
destination already exists. It is the only open item that would make the page a
different thing rather than a better version of this thing.

## Open tasks

Design: #2 illustrations at doubts, #6 pad strip repeats the hero, #9 does the
numbers strip earn its place, #16 Feel plate, #17 layers hold state, #18 hero
pad art, #19 private-APIs row, #20 chain box and arrows.

Content: #11 copy 1,327 words toward ~900, #25 `llms.txt` is stale and describes
the pre-redesign page.

Code health: #10, #22 and the `.sec-snug` tier are **done** — `base.css` no
longer exists and PurgeCSS reports zero rejected selectors on both sheets. #23
is corrected and still open: the real figure is 98 inline styles, not the ~95
guessed here, and it is now blocking something. html-validate is absent from CI
entirely, because it used to lint band fragments against a config that switched
eight rules off (fragments are not documents), and those fragments are Nunjucks
now. Pointing it at `_site/**/*.html` restores validation *and* upgrades it to
whole documents, which is worth doing the moment the 98 are gone.

Also open, discovered in the second session: `contrast.mjs` does not exist.
`styles/tokens.css` cites it for every AA ratio it records, so those
measurements were taken with a tool nobody can re-run, and no new colour can be
verified against the curb until it is rebuilt. It is about fifteen lines.

Blocked: #24 re-shoot every screenshot per controller. This gates real product
imagery anywhere in the flow, because every capture is PlayStation-labelled and
the page re-labels per pad. `import-review.png` is the one glyph-free exception
and is already used.

## How to work here

Delegation works well: one agent per band, given `_includes/bands/<band>.html`
and `styles/bands/<band>.css` and nothing else. The pair is derivable — swap
`_includes` for `styles` and `.html` for `.css` — so no index is needed. The
sentence this replaces sent agents to a file that no longer exists, which is
why the layout is now a convention rather than a note in a doc.

Verify by rendering, and verify the instrument too. Every claim shipped without
a render turned out to be wrong, and separately, three gates were found passing
while checking nothing: a stray `_probe.html` full of CSS text sat in PurgeCSS's
content glob so every selector in it read as used; `curb-check` named a deleted
file behind an `existsSync` guard and skipped 452 lines in silence; and the
stylelint invocation was a hand-written list that stopped covering new sheets.
Two of those were introduced the same day by someone fixing the other one.

Note for pixel diffs: `capabilities-375.png` and `feel-375.png` are both
bistable. Each produces two distinct hashes from repeated renders of an
unchanged tree, so neither is evidence on its own. Render twice before
concluding anything.

## Related

- `docs/design-rules.md` is the curb and is binding
- `docs/lessons/` has the two lessons worth reading before touching CSS
- `docs/screenshots.md` has the per-pad re-shoot blockers
