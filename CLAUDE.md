# Steer site

Marketing site for Steer (macOS menu-bar app: game controller to Mac input).
Static output, assembled by a build. Screenshots regenerate from the app repo
(see auto-memory).

## Never edit these three files

`index.html`, `styles.css` and `home.css` are **generated**. Each carries a
banner saying so, and `bin/build --check` fails a stale copy in CI.

| edit this | to change |
|---|---|
| `parts/<band>.html` | markup of one band |
| `parts/<band>.css` | styling of one band |
| `styles/tokens.css` | any colour, surface, radius, shadow, measure |
| `styles/shared.css` | anything used by more than the homepage |
| `styles/base.css` | homepage components |
| `index.src.html` | which parts appear, and in what order |

Then `bin/build`. Cascade order is `@layer tokens, base, components, bands`,
declared in the two entry files under `styles/`, so a band rule beats a shared
one without needing to out-specify it.

One band per file is what lets several people or agents work at once. Give a
delegated agent its two files; keep it out of `styles/base.css`.

## Commands

    make help        every target
    make up          nginx on https://steer.seanfloyd.dev.local (and :8391)
    make ci          build, lint, render, in parallel
    make shots       render every band at 1440 and 375 into scratch/shots/
    bin/build --prod strip dev comments (17% of index.html)

Tooling is adopted, not hand-rolled: Lightning CSS bundles, stylelint and
html-validate lint, PurgeCSS answers reachability, `bin/a11y-check` and
`bin/lighthouse` came from `../news-digest`. Three attempts at hand-rolling CSS
edits broke the page; see `docs/lessons/`.

## Design: read before touching UI, CSS, or copy

**`docs/design-rules.md` is the curb.** Read it before any change to layout,
styling, or visible copy, and reject changes that violate its non-negotiables.
Short version: system fonts only, one system-blue accent, cool neutral surfaces,
AA-verified contrast, no em-dashes / clichés / emoji in copy, one primary CTA.
The site is deliberately not an "average website"; the reasons live in that doc
and in the CSS comments.

## Two traps that cost hours

- **The page freezes its own animation under automation.** `home.js` adds
  `.still` when `navigator.webdriver` is true. No headless check can see motion
  unless it removes that class first.
- **`<use href="assets/svg/…#s">` is blocked over `file://`.** Serve it:
  `make up`, or let `scripts/shots.mjs` use its own in-process server.
