# Handover, 2026-07-30

Long redesign session. Read `CLAUDE.md` first (it says which three files are
generated and names two traps that cost hours), then this.

## Where the page is

6,960px, 7.7 screens, from 8,546 at the start of the day. `make ci` is green:
build freshness, a11y structure, stylelint, curb-check + self-test, a 1440/375
render with an overflow gate, and PurgeCSS reachability.

Rebuilt today: `#uses` (four use cases scannable in one row again), `#feel`,
`#trust` (1,340 to 1,119, with `import-review.png` now behind its strongest
claim), `#pricing` (1,087 to 708), and the capabilities signal chain, which now
animates a press from controller to Steer to Mac. `#reach` and `#requirements`
were cut; requirements content moved to `support.html`.

Infrastructure is new and is the most-verified work here: `parts/*.html` +
`styles/` assembled by `bin/build`, Lightning CSS bundling with real `@layer`,
a `package.json`, Docker on the production hostname, and a GitHub Actions
deploy. The build round-trip is byte-identical and the whole CSS migration was
proven pixel-identical across 16 frames.

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

Code health: #10 unreachable CSS and the orphaned `.sec-snug` tier, #22 band
rules still scattered through `styles/base.css`, #23 inline styles (15 in
`parts/`, ~80 more across sub-pages, plus `<style>` blocks in seven files, none
of which stylelint or PurgeCSS can see).

Blocked: #24 re-shoot every screenshot per controller. This gates real product
imagery anywhere in the flow, because every capture is PlayStation-labelled and
the page re-labels per pad. `import-review.png` is the one glyph-free exception
and is already used.

## How to work here

Delegation works well now: one agent per band, given `parts/<band>.html` and
`parts/<band>.css` and nothing else. Give it the CSS index for its band up
front, because `styles/base.css` is still 98KB with band rules scattered from
line 44 to 1594, and an agent will otherwise spend real tokens finding them.

Verify by rendering. Every claim I shipped without a render this session turned
out to be wrong, and two of them were "the animation works".

## Related

- `docs/design-rules.md` is the curb and is binding
- `docs/lessons/` has the two lessons worth reading before touching CSS
- `docs/screenshots.md` has the per-pad re-shoot blockers
