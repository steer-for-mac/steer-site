# Steer site — design rules

The curb. Read this before editing any UI, CSS, or copy on this site, whether
you are a human or an agent. It exists for one reason: AI (and tired humans)
drift toward the average website. This site is not average on purpose, and the
reasons are not obvious from the markup. If a change violates a non-negotiable
below, it is wrong even if it looks fine in isolation.

The design thesis is already recorded in the top comment of `styles.css` and
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
- **Cool neutral surfaces, never warm.** Use the surface ramp
  (`--bg` to `--bg-inset-2`) and the elevation ramp (`--shadow-rest` <
  `--shadow-rest-lg` < `--shadow-window`). No warm cream (`#FAFAF9`), no warm
  near-black. `--shadow-window` is reserved for screenshots and the hero band.
- **Contrast clears WCAG AA.** Every text-on-surface pair must clear 4.5:1 for
  small text, measured against the *darkest* surface it can land on
  (`--bg-inset-2`), not against `--bg`. The measured ratios are recorded inline
  in `styles.css`; if you retune a colour, re-measure and update the comment.
  All small print rides `--text-3`.
- **Radius tiers are fixed:** 14 card / 10 inset / 980 pill (`--r-card`,
  `--r-inset`, `--r-btn`). Do not invent a new radius.
- **Motion: transform and opacity only.** Custom cubic-bezier eases, no keyword
  or bounce eases. Everything is gated behind `prefers-reduced-motion` with a
  meaningful static frame, and the page must render with JS disabled (all
  sections are static markup, never JS-injected).
- **Section rhythm uses the tempo classes** (`.sec`, `.sec-loose`, `.sec-snug`,
  `.sec-tight`), not ad-hoc padding.
- **The eyebrow signature stays consistent:** SF Mono uppercase label plus one
  emissive accent dot. It is the instrument signature carried down from the
  hero to every section. Keep it.

## Copy rules

- No em-dashes in visible copy. Use colons, periods, commas. US keyboard chars.
- No AI clichés: seamless, elevate, unleash, effortless, next-gen, revolutionize,
  supercharge, and friends.
- No emoji in copy.
- Write for the non-technical reader first. Audience before feature list.
- One primary CTA per view. Price is microcopy beside the CTA, not a competing
  button. Exactly one blue `btn-primary` exists on the homepage and it is the
  launch list; the founder section's "Share an idea" is deliberately secondary,
  because it sits one section above pricing and would otherwise intercept a
  ready buyer with an email draft about feature requests.
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
- Don't restate the hero. The hero annotations own sticks, buttons, and layers.
  Sections below must add something a picture of a controller cannot show
  (it arrives working, it follows you between apps, it types, it reaches past
  shortcuts into Shortcuts, macros, and scripts). Half of Capabilities used to be
  a second reading of the hero, and a reader who learns nothing for the scroll
  starts skimming, which costs Feel and Trust further down.
- Plain words beat product jargon in visible copy. "Chords", "MFi", "radial
  launcher", and `steer://` belong in the FAQ and the spec tables, not in hero
  annotations or feature chips. A non-technical reader is the default reader.
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
entries, 17 route families) is checkable and should be stated. A count inferred
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

- The hand-built per-pad hero SVG and the looping input demos.
- The light-bar / accent-picker interactivity in the Feel band.
- The AA-contrast comments in `styles.css`. They are the audit trail, not
  clutter. Update the math if you retune; never delete it.
- The use-case hierarchy: filled lead cards win the glance, the outline pills
  are recognition-only. Keep the pills visually lighter.
- The per-controller copy and headline variants (`.pd-ps` / `.pd-xb` / `.pd-sw`
  / `.pd-mf`) that swap sitewide with the selected pad.

## The `.vg` vignette family

Seven members: `.vg-glide` (hero), `.vg-type` (couch), `.vg-edit`, `.vg-stream`,
`.vg-speak` (use-case cards), `.vg-layers`, `.vg-launch` (capabilities). Before
building the eighth, know what makes one a member; it is a grammar, not a class
prefix.

- **One claim, proven.** A vignette illustrates exactly one capability, stated
  in the copy beside it and shown nowhere else on the page. If the claim is
  already illustrated, the vignette is a duplicate, not a variation (the couch
  card once reused the hero's `.vg-glide` byte for byte; that is the failure
  mode).
- **Truth from the app repo.** The interaction shown must match the shipped
  implementation in `~/Developer/steer`, not a generic version of the idea:
  real button, real layout, real commit model. Cite the source file in the CSS
  block comment. (`.vg-type` mirrors `DaisyWheelLayout`; `.vg-launch` mirrors
  `RadialMenu.swift` down to the instant open and fade-only close.)
- **Three instruments.** A controller-side control (stick, trigger chip, face
  button), a Mac-side surface (screen, timeline, scenes, deck, chips, field,
  disc), and the pad's answer (a `.vg-ring` haptic echo). The sentence is
  always: press, the Mac reacts, the pad answers.
- **Base state is the claim, frozen mid-proof.** The un-animated markup (no
  `.on`) must read as the capability already demonstrated: word typed, layer
  held, app selected. Reduced motion and no-JS ship exactly this frame. `.on`
  is added only while on-screen, by the one shared IntersectionObserver.
- **Motion:** transform and opacity only, one 5 to 6.5s loop. Vignettes that
  can share a viewport (`.vg-layers` and `.vg-launch`) get different durations
  so they never sync.
- **Width:** if the Mac-side surface is a `flex:1` member that absorbs width
  (timeline, scenes, deck, search field), the vignette fills its column. If
  the geometry is fixed (`.vg-glide`'s travel distance, `.vg-layers`' chip
  grid, `.vg-launch`'s disc), cap at `max-width:430px`. This is the rule the
  existing split follows; it is principled, keep it.
- **Controller glyphs and labels** go through `.face-slot[data-b]` and
  `data-ps/xb/sw/mf` so every vignette re-labels with the selected pad.
  Mac-side surfaces may use the pad palette or the accent; buttons never
  hardcode a glyph.
- **Watch list:** `.vg-speak` is the family's weakest member. Its flick-to-
  advance beat shares its visual idea with `.vg-stream`'s A/B swap and re-
  proves "the stick moves things", which the hero demo owns. It stays because
  it is small and the Speakers card would otherwise be prose-only, but it is
  first on the cut list, and its shape is not a template to copy.

## Before you call it done

- Any new colour pair clears AA against the darkest surface it can sit on.
- The page renders with JavaScript disabled and under `prefers-reduced-motion`
  (static frames are present, nothing disappears).
- No horizontal overflow at 375, 768, and 1440 px.
- Grep the diff for em-dashes, clichés, and emoji in visible copy (they are
  fine inside code comments, never in rendered text).
