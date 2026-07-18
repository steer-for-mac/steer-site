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
  button.
- Trust language stays literal and verifiable: on-device, no account, no
  telemetry. Never soften it into marketing vagueness.

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

## Before you call it done

- Any new colour pair clears AA against the darkest surface it can sit on.
- The page renders with JavaScript disabled and under `prefers-reduced-motion`
  (static frames are present, nothing disappears).
- No horizontal overflow at 375, 768, and 1440 px.
- Grep the diff for em-dashes, clichés, and emoji in visible copy (they are
  fine inside code comments, never in rendered text).
