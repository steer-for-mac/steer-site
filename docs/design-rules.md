# Steer site — design rules

The curb. Read this before editing any UI, CSS, or copy on this site, whether
you are a human or an agent. It exists for one reason: AI (and tired humans)
drift toward the average website. This site is not average on purpose, and the
reasons are not obvious from the markup. If a change violates a non-negotiable
below, it is wrong even if it looks fine in isolation.

The design thesis is already recorded in the top comments of `styles/tokens.css`
and `styles/shared.css`, and
in the annotations throughout `index.html`. This file is the readable index of
those decisions.

## The thesis

The site should feel like the app. Steer is a native macOS menu-bar app, so
the site inherits the macOS Settings language: SF system fonts, one system-blue
accent, cool neutral surfaces, Apple restraint. Measured against Linear,
Vercel (Geist), Raycast, and apple.com. It is not an Awwwards showpiece and
should never try to be one.

## Non-negotiables

- **Fonts: system only.** `-apple-system` / SF Pro for everything, SF Mono for
  eyebrows, labels, numbers, and fine print. No web fonts, no display fonts.
  The system font *is* the display tier (see `.chero h1`). Do not "upgrade" a
  heading to Inter, Satoshi, Clash, or any custom face. That would break the
  whole point.
- **One accent.** System blue by default. In the hero the accent is the
  selected pad's LED colour; the accent picker swaps it. Every accent variant
  is AA-verified. Never introduce a second saturated accent, a gradient accent,
  or a rainbow. One interactive colour, period.
  Two exceptions, both of which encode a fact rather than decorate (2026-09-02,
  after "seems very grey"): the accent also carries the numbering and the
  mono labels that name a cell (`.lg-n`, `.lg-k` on cells, the price figure),
  so the grid's structure reads in one colour; and the banner's three family
  cells sit on a wash of their own brand colour (`--blue-fill`, `--green-fill`,
  `--red-fill`), the way kynth.studio's tiles carry a product's colour. The
  washes go under a render, its label and its one-line caption only, never
  under reading text, and
  the Others cell stays neutral because 315 mappings have no one colour. A
  fourth tint, or a wash under a paragraph, is drift.
- **Cool neutral surfaces, never warm.** Use the surface ramp
  (`--bg` to `--bg-inset-2`) and the elevation ramp (`--shadow-rest` <
  `--shadow-rest-lg` < `--shadow-window`). No warm cream (`#FAFAF9`), no warm
  near-black. `--shadow-window` is reserved for screenshots and the hero band.
  One exception (2026-10-06, round 13): in dark mode the homepage's ink
  drawings sit on a paper sheet (`--h-sheet`, `#D6D3CC`) rather than being
  inverted, because an inverted pen drawing reads as a negative. Paper is a
  drawing's surface only; the page and every reading surface stay cool.
- **Contrast clears WCAG AA.** Every text-on-surface pair must clear 4.5:1 for
  small text, measured against the *darkest* surface it can land on
  (`--bg-inset-2`), not against `--bg`. The measured ratios are recorded inline
  in `styles/tokens.css`; if you retune a colour, re-measure and update the comment.
  All small print rides `--text-3`.
- **No reading text below 11px.** 11px is the smallest type the site sets on
  purpose (`.eyebrow`, on nine pages), so it is the floor, and
  `tests/legibility.spec.js` gates it on every page at 1440 and 375. Text inside
  an `aria-hidden` subtree is exempt because it is drawing, not reading: the
  face-button letters and plate caption are printed on the controller at the
  drawing's scale, exactly as they are on the real hardware. Watch for type
  sized in container units: the hero's annotations were set in `cqw` against a
  stage whose width is capped by the hero's height, which rendered them at
  7.62px on a 900px-tall laptop and could never exceed 10.5px on any monitor.
  Four hero rewrites named that as the reason they were failing and none of them
  measured it.
- **Radius tiers are fixed:** 14 card / 10 inset / 980 pill / 12 window
  (`--r-card`, `--r-inset`, `--r-btn`, `--r-window`). The window tier is for
  screenshot frames only (`.window`, `.shot`). Do not invent a new radius.
- **Motion: transform and opacity only.** Custom cubic-bezier eases, no keyword
  or bounce eases. Everything is gated behind `prefers-reduced-motion` with a
  meaningful static frame, and the page must render with JS disabled (all
  sections are static markup, never JS-injected).
- **Section rhythm uses the tempo classes** (`.sec`, `.sec-loose`, `.sec-snug`,
  `.sec-tight`), not ad-hoc padding. One tier down, the gap between a section
  head and its first surface is `.sec-body` (40px, 44px inside `.sec-loose`),
  not an inline margin; it had drifted to four different values before it was
  tokenized. Keep the whole scale ordered (tight < sec < snug < loose) at every
  breakpoint; the 860px block once inverted it by shrinking only `.sec`.
- **Surfaces alternate** on sub-pages. The homepage (round 13) is one plain
  surface on purpose: its bands are questions on one grid, and the hairline
  above the close is the only boundary it needs. Adjacent sections should not share a surface unless
  something else draws the boundary; two plain-bg sections in a row read as one
  tall empty band (that was the reach-to-pricing dead zone). The page tail runs
  trust (sunken) / pricing (plain) / footer (sunken). `reach` and `requirements`
  were cut in `4c871d1`; they were the tail's only two plain bands, so pricing
  took the plain surface to keep the alternation.
- **Eyebrows are for sub-pages.** The SF Mono label with its accent dot stays
  on the sub-pages. The homepage has none: every heading is a couplet, the
  visitor's doubt in grey (`.pain`) and Steer's answer in ink, so reading only
  the headings gives the pitch. A label that only repeats the heading is cut.
- **The accent may colour one word of a headline**, the playful word
  ("Hand it a *controller.*"). It replaced a New York italic in the
  2026-10-06 review: that face exists only on Apple devices and turns into
  Georgia elsewhere. One word, never a phrase, never body text.

## Copy rules

- No em-dashes in visible copy. Use colons, periods, commas. US keyboard chars.
- No AI clichés: seamless, elevate, unleash, effortless, next-gen, revolutionize,
  supercharge, and friends.
- No emoji in copy.
- Write for the non-technical reader first. Audience before feature list.
- One primary CTA per view. Price is microcopy beside the CTA, not a competing
  button. The launch list is a real form, never a bare mailto: a mailto dies
  silently on a machine with no mail client, at the moment of highest intent.
  Since October 2026 the form sits in the first screen and again at the close
  (`#pricing`), screens apart, so each is the one blue button in its view; the
  nav opens the same form in a dialog and keeps `href="#pricing"` for no-JS.
  The mailto appears only when a submit fails (`launch-list.js`), as the way
  out rather than the mechanism.
- Trust language stays literal and verifiable: on-device, no account, no
  telemetry. Never soften it into marketing vagueness. A trust heading may not
  overstate and then get walked back by its own body: the licence check does
  send something, so the claim is about what never leaves (mappings, keystrokes),
  not a blanket "nothing about you".
- Say what is true about availability. While Steer is pre-launch, the hero price
  microcopy reads "once, when it ships". Burying launch status in 13px grey text
  seven screens down is out of character for a page that discloses undocumented
  API use in its FAQ.
- Comparisons need a source. The $435 Speed Editor is the only verified price on
  the page, so it is the only one that ships. Do not add another.
- Don't restate the hero. The self-playing demo owns "it moves, types and
  opens your apps". Bands below must add what it can't show: who it's for,
  that every app gets its own buttons, how it feels, what it costs.
- A place named on the site carries the app's own name: Controls, Library,
  Gallery, Steer, History; a customization (never "profile"), the help card,
  the on-screen keyboard, the ring of apps (never "App ring" or "daisy
  wheel"), layers only after "hold a shoulder button" has explained them.
  The app's glossary is `steer/docs/2026-10-03-glossary-audit.md`.
- Plain words beat product jargon in visible copy. "Chords", "MFi", "radial
  launcher", "app ring", and `steer://` belong in the FAQ and the spec tables,
  not in hero annotations or feature chips. A non-technical reader is the
  default reader. A fresh reader met "each step of the ring" three screens
  before anything said what the ring was; on the homepage it is "flip through
  your apps".
- Shipped pages say "the app you're using", never "the app in front" or "the app
  you are in".
  "Frontmost" is developer shorthand: two non-Mac readers stopped on it in the
  hero, the intro and the Help Overlay card (2026-09-28). Source comments
  citing `ProfileManager` may keep it.
- The homepage never names a macOS settings pane to contrast with. A reader
  who has never opened System Settings > Game Controllers reads the comparison
  as noise, and the same readers circled it with a question mark. The Compare
  page, whose reader came for comparisons, keeps it.
- Named third-party software carries its category at point of use. "Resolve
  and Final Cut" read as random words to a non-editor; "DaVinci Resolve and
  Final Cut Pro" under a "Video editors" tag read as products. Same rule made
  "Rectangle" into "the Rectangle app". Full product names, category nearby.
- A vignette's meaning must be carried by the visible copy beside it, because
  the vignette itself is aria-hidden decoration. The couch card said "on-screen
  keyboard" while the picture showed a daisy wheel; a first-time reader could
  not connect sentence to picture until the sentence described the wheel.
- Configurability is only a selling point when paired with "it already works".
  Lead with the fact that it runs on plug-in, then say nothing is fixed.
  Unpaired, "highly configurable" reads as "you have homework".
- The mobile feature chips (`.features`) stand in for the SVG annotations, which
  are unreadable on a phone. Keep each chip at or under ~36 mono characters
  (at 375px the pill has ~335px of room), and never let the DualSense list be
  shorter than another pad's: it is the controller with the most to show.

## Verifying a capability claim

Every claim on this site about what the app does must be checked against
`~/Developer/steer`, and **"the symbol exists" is not a check**. Three false
claims shipped from this page in a single day, all with the same shape: a
feature was found in the source and assumed to work.

The ladder, weakest to strongest. Know which rung you are standing on before
you write a sentence.

1. **A doc or changelog says so.** Worth nothing on its own.
   `docs/automation.md` was missing six routes for months, including the two
   that turn out to be the only surfaces that can hold a status.
2. **The symbol exists in source.** Still not a feature.
   `HIDDeviceManager` declared and fired `onGenericHIDReady`,
   `onGenericHIDInputState` and `onGenericHIDDisconnected`; nothing ever
   assigned them, so every decoded frame went into a nil optional. The site
   claimed generic controllers worked. They did not.
   `TriggerBinding.release` is persisted, localised and shown in Settings, and
   `ActionResolver` never resolves it. The site claimed a button had four
   jobs. It has three plus a dead slot.
3. **The symbol is consumed.** Callback assigned, field resolved, event
   dispatched. This is the minimum bar for writing a capability into copy.
4. **Rendered, or executed.** For anything visual, look at it. For a recipe,
   run it.
5. **Confirmed on hardware.** Some claims stop at this rung and nothing below
   substitutes. Reading `LEDSystem.swift` was enough to prove the light bar
   cannot hold a status; only plugging in a controller proved the mute LED is
   too faint to read in a lit room.

Where a claim cannot reach rung 5 and the hardware is not here, say so and ask
for testers, the way the Elite paddles and generic controllers already do.
"Beta" with a call for testers is honest. Silence is not, and neither is a
confident "Yes".

Corollary for numbers: a count sourced from a bundle (35 `.lproj`, 315 SDL
entries, 20 route families) is checkable and should be stated. A count inferred
from a feature list is not. When ControllerKeys' page said nothing about
languages, the answer was to count the `.lproj` directories in their public
repository, not to write a dash.

## Drift rejection (reject on sight)

The format is borrowed from VibeCurb; the content is Steer's.

- Warm cream or warm near-black palettes. We are cool and neutral.
- Web or display fonts used as headings. The system font is the display tier.
- A second accent colour, a rainbow, decorative glassmorphism, or an AI-purple
  / AI-blue mesh gradient.
- Kinetic-typography drama, bounce eases, "Scroll to explore" indicators.
- Bootstrap defaults: `#0d6efd`, uniform 4px radius, `0 2px 4px rgba(0,0,0,.1)`
  shadow, cramped padding at or below 16px.
- Pure `#000` on `#fff`, or any colour pair whose contrast was never measured.
- Em-dashes, emoji, clichés, or a product-wide BETA badge in visible copy.
- A new call to action that competes with the page's single primary CTA.

## Load-bearing craft (do not "simplify" away)

A simplifier pass will be tempted to flatten these. They are the point.

- The self-playing demo (`bands/play/demo.html`). It is the hero's picture and
  the link that travels; its mapping cites the app's source line by line.
- The light and dark capture pairs. Each app picture has both, from
  `scripts/capture-app`; a light-only capture leaves dark mode with a hole.
- The AA-contrast comments in `styles/tokens.css`. They are the audit trail, not
  clutter. Update the math if you retune; never delete it.
- The source comments above each band's claims. They are how the next edit
  re-checks a sentence against the app.

## Length is a word budget, not an ink budget

`bad901e` cut the page from 2,900 words to peer length (median ~920 across
fourteen craft Mac app pages, none over 1,900). That was right. What it did not
do was re-tune the layout for the shorter page, so three bands kept the shape of
a longer one and rendered with card-sized holes in them: the use-case grid
stranded its fourth card in a two-column row, the capabilities head stranded
whichever column held the prose, and Feel lost both its screenshot and the
vignette meant to replace it, leaving centred prose in a band with 168px of
padding under it. A third of the page below the hero was empty rectangles, which
is what "bland" turned out to mean.

When a band reads as empty, the fix is ink, not words: a column that fills, a
card that spans, a rule that draws the structure, a measure that stops at 64
characters. Prose added to fill space puts the page straight back over the
budget the cut bought.

- **A DualSense-shot capture ships only with a caption that says so**
  (2026-09-28, restated 2026-10-06). The app captures show PlayStation glyphs;
  an Xbox owner would otherwise read the wrong ones. The homepage carries the
  caption once, under the help card (2026-10-06 page): "Pictures are the app with a
  DualSense; button names follow your controller." True because the help card,
  the keyboard and the ring take the connected pad's naming scheme.
- **`ch` is not a character.** It is the advance of a zero, about 1.4x an
  average SF lowercase glyph, so `56ch` renders as a 78-character line. Measure
  the resulting line, do not trust the unit.
- **`.shot img` needs `height:auto`**, or the `width`/`height` attributes that
  reserve the box win as presentational hints and stretch the image.

## Pictures and motion

- **One picture, one job, once per page.** The table in
  `docs/design/2026-10-06-site-system-design.md` §3 assigns each capture its
  job. Showing the controller twice, or the ring twice, is a duplicate, not
  a variation.
- **Pictures are the current app.** Captures come from `scripts/capture-app`,
  cropped where a strip names the dev build or the user's own apps. Never
  composite UI into a photo; crop or recapture.
- **Homepage motion means something or goes** (round 13): the sofa draws
  itself in, the pins land, each question lands before its answer, and the
  keyboard loop plays while on screen. None of it starts under reduced
  motion or automation, and the page is whole without JS.
- **Motion that runs by itself stops.** The demo's self-play stops on the first
  key, click or pad press, has a visible Stop button, never starts under
  reduced motion or automation, and silences its live region while it plays
  (WCAG 2.2.2). Its still frame is the claim frozen mid-proof: the keyboard
  open, a word typed.
- **Truth from the app repo.** What the demo does is what the shipped defaults
  do, cited to the source line, not a generic version of the idea.

## The page is assembled, not authored

Every page is generated into `dist/`. Edit `src/_includes/bands/*.html` (or the
page's own `.html`, which is now front matter plus its `<main>`) and run `make
build`. It
was one 92KB file, which meant every edit was surgery on a shared blob and two
people could not touch different bands at once.

Eleventy, with Nunjucks. The include-only build this replaced covered exactly
one page of sixteen: the other fifteen hand-maintained their own nav, footer,
theme script and 31 meta tags, and the theme script had already drifted into two
variants. Extending a hand-rolled includer to cover that meant writing front
matter, layouts and slots, which is a template engine, and this repo's own
history records hand-rolling as the failure mode. A delegated agent is still
handed exactly two files, and it can work out which two: `src/_includes/bands/
<band>.html` and `styles/bands/<band>.css` are the same path in two trees, so
the pair is derivable rather than looked up.

Three things that will waste your time otherwise:

- **`home: true` in front matter does nothing.** `home` is an `eleventyComputed`
  (`eleventy.config.js`), it is true only for `/index.src`, and computed data
  overrides front matter, so setting it is silently ignored and `home.css` never
  loads. A comp page that wants the band styles imports them into its own
  `styles/heroes/<name>.css`, which is what `hero-lab.css` does and why it does
  it. Cost three agents a detour before it was written down.

- **The page freezes its own animations under automation.** `home.js` adds
  `.still` when `navigator.webdriver` is true, which is deliberate (deterministic
  screenshots) and means no headless check can see motion. To test a loop, remove
  the class first: `document.documentElement.classList.remove('still')`.
- **Serving matters, and there is one way to do it.** The SVG symbols in
  `src/assets/svg/` come in through `<use href="…svg#s">`, which browsers refuse over
  `file://`. Use `make up`: nginx in Docker, on the production hostname, with the
  same `try_files` behaviour Pages gives you. A plain static server is not an
  equivalent fallback, which is why `bin/serve` was removed: it had no
  `try_files`, so `/buy` 404'd locally and worked everywhere else.
  The Playwright suite starts its own static server instead, which is the one
  justified exception: a gate has to be self-contained rather than needing a
  container up first. It is `scripts/serve.js` -- Bun's `dir` route, not nginx --
  so it has no `try_files` and no extensionless rewriting: `index.html` on a
  directory, 404 on anything else. Every `goto` in the suite ends in `.html`.

## Before you call it done

- Run `make ci`. It builds, lints and renders in parallel. The CSS toolchain is
  adopted rather than hand-rolled, after three attempts at hand-rolling broke the
  page: Lightning CSS bundles (it parses, so it cannot cut a selector list in
  half), stylelint catches duplicate selectors and dead declarations, PurgeCSS
  answers "is this rule reachable" by scanning `home.js` as well as the markup.
  A hand-written reachability check over-reported by an order of magnitude and
  would have deleted live styles if trusted.
- Run `make shots`. It renders every section at 1440 and 375 into
  `scratch/shots/`, so the by-eye checks below get looked at rather than
  remembered. `SHOTS_PAD=xb` and `SHOTS_THEME=dark` drive the gates the page
  hides behind an attribute. `SHOTS_PAGE` names the page, but only the homepage
  carries the sections it shoots, so anything else fails rather than writing
  nothing and exiting 0, which is what it used to do.
  Horizontal overflow is not its job: `tests/layout.spec.js` gates that on every
  page at 1440/768/375 in both engines, and `make ci` runs it.
- Run `node scripts/curb-check.js`. It mechanizes the copy and value-drift
  rules that were enforced by eye: em/en-dashes, AI clichés, and emoji in
  *visible* copy (text nodes + alt/title/aria-label + meta descriptions, never
  code comments or SVG path data); web/display fonts; forbidden hexes
  (`#0d6efd`, `#007aff`, warm creams); the Bootstrap shadow; and off-token
  component radii (8-40px). ERROR fails the run; WARN is a review nudge. It is
  dependency-free and self-verifying: `node scripts/curb-check.js --self-test`
  proves every detector still bites before you trust a clean run.
  - Two curb rules deliberately stay human-judged, not mechanized, because they
    fire ~100% false on this codebase: **AI-purple** (Steer's controller-LED and
    accent-picker swatches are legitimately violet/teal/amber) and **sub-8px
    radii** (the hand-built SVG vignettes). The script's comments record why.
- Any new colour pair clears AA against the darkest surface it can sit on.
  `make contrast` is that checker, it is in `make ci`, and it reproduces every
  ratio recorded in `styles/tokens.css` to the digit. The maths is colorjs.io,
  the CSS WG editors' implementation, rather than the hand-rolled luminance it
  shipped with. Retune a colour and re-run it; do not update the comment by eye.
- Radius and colour literals are enforced, not just reviewed. Anything in
  `styles/` that sets `border-radius`, `color`, `fill`, `stroke` or a
  `*-color` longhand must use a variable, or be one of the values
  `stylelint.config.js` lists with its reason. Spacing is deliberately outside
  this: there is no spacing scale to enforce yet.
- The page renders with JavaScript disabled and under `prefers-reduced-motion`
  (static frames are present, nothing disappears).
- No horizontal overflow at 375, 768, and 1440 px.
