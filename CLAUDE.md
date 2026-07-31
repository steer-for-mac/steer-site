# Steer site

Marketing site for Steer (macOS menu-bar app: game controller to Mac input).
Static output, assembled by Eleventy. Screenshots regenerate from the app repo
(see auto-memory).

## Nothing generated is committed

`make build` writes the whole site into `_site/`, which is gitignored, and
`_site/` is also the only thing deployed. There is no generated file in the
working tree to keep in step, and no `--check` gate any more.

| edit this | to change |
|---|---|
| `<page>.html` | one sub-page: front matter (title, meta, extra head) plus its `<main>` |
| `parts/base.njk` | the document every page shares: head, meta, theme init, body frame |
| `parts/nav.html`, `parts/footer.html` | site chrome, on all 14 chrome pages at once |
| `parts/<band>.html` | markup of one homepage band |
| `parts/<band>.css` | styling of one homepage band |
| `styles/tokens.css` | any colour, surface, radius, shadow, measure |
| `styles/primitives.css` | the SVG stroke language and other cross-page primitives |
| `styles/grammar.css` | the `.d-*` design system every band speaks |
| `styles/shared.css` | chrome used by more than the homepage |
| `index.src.html` | which bands appear on the homepage, and in what order |

Then `make build`. Cascade order is `@layer tokens, base, components, bands`,
declared in the two entry files under `styles/`, so a band rule beats a shared
one without needing to out-specify it. Each sheet above sits in exactly one
layer: tokens, primitives in `base`, grammar and shared in `components`,
`parts/*.css` in `bands`.

**Moving a rule between those files moves it between layers, and layer order
beats specificity outright.** A rule that drops to `base` now loses to anything
in `components` however specific it is; a rule that rises to `bands` now wins.
Nothing lints this. The headers of `primitives.css` and `grammar.css` name the
three rules that had to stay where they are for exactly this reason.

One band per file is what lets several people or agents work at once. Give a
delegated agent its two files; keep it out of `styles/grammar.css`. That is why
`dir.includes` points at `parts` rather than `_includes`.

## Three things Eleventy does not do, kept in `eleventy.config.js`

Each fails silently rather than loudly if it goes missing, so read the comments
at the call sites before touching them.

- `styles/home.entry.css` is **generated** from a glob of `parts/*.css`, because
  neither `@import` nor Lightning CSS `--bundle` takes a glob. Lose it and a new
  band sheet is simply never imported.
- Lightning CSS runs with `--minify` **and** `--targets`. The targets are a bug
  fix: without them it emits Media Queries Level 4 range syntax that Safari 16.3
  cannot parse, and the responsive layout stops applying with no error.
- `ELEVENTY_ENV=production` strips HTML comments (17% of the homepage is design
  rationale written for editors, not visitors). Dev builds keep them.

## Commands

    make help        every target
    make build       assemble the site into _site/
    make build-prod  same, with dev comments stripped
    make up          build, then nginx on https://steer.seanfloyd.dev.local (and :8391)
    make ci          build, then lint and render in parallel
    make shots       render every band at 1440 and 375 into scratch/shots/

Tooling is adopted, not hand-rolled: Eleventy assembles, Lightning CSS bundles,
stylelint lints, PurgeCSS answers reachability, `bin/a11y-check` and
`bin/lighthouse` came from `../news-digest`. Three attempts at hand-rolling CSS
edits broke the page; see `docs/lessons/`.

html-validate is not in CI. It used to lint `parts/*.html` against a config that
switched off eight rules because fragments are not documents; the fragments are
Nunjucks now. Pointing it at `_site/**/*.html` is the right replacement and is
tracked separately: `npx html-validate '_site/*.html'` reports 103 pre-existing
errors today, 98 of them inline styles. Fixing those is a content change, not a
build one.

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
  `make up`, or let `scripts/shots.mjs` use its own in-process server. Both
  serve `_site/`, so a stale build shows you a stale page: build first.
