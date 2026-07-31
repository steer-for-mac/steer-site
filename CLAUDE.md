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
| `_includes/layouts/base.njk` | the document every page shares: head, meta, theme init, body frame |
| `_includes/chrome/nav.html`, `_includes/chrome/footer.html` | site chrome, on all 14 chrome pages at once |
| `_includes/bands/<band>.html` | markup of one homepage band |
| `_includes/art/<band>-<thing>.svg` | one piece of inline SVG that band draws |
| `styles/bands/<band>.css` | styling of one homepage band |
| `styles/pages/<page>.css` | styling used by one sub-page and no other |
| `styles/tokens.css` | any colour, surface, radius, shadow, measure |
| `styles/primitives.css` | the SVG stroke language and other cross-page primitives |
| `styles/grammar.css` | the `.d-*` design system every band speaks |
| `styles/shared.css` | chrome used by more than the homepage |
| `index.src.html` | which bands appear on the homepage, and in what order |

Then `make build`. Cascade order is `@layer tokens, base, components, bands`,
declared in the two entry files under `styles/`, so a band rule beats a shared
one without needing to out-specify it. Each sheet above sits in exactly one
layer: tokens, primitives in `base`, grammar and shared in `components`,
`styles/bands/*.css` in `bands`.

**Moving a rule between those files moves it between layers, and layer order
beats specificity outright.** A rule that drops to `base` now loses to anything
in `components` however specific it is; a rule that rises to `bands` now wins.
Nothing lints this. The headers of `primitives.css` and `grammar.css` name the
three rules that had to stay where they are for exactly this reason.

One band per file is what lets several people or agents work at once. Give a
delegated agent its two files; keep it out of `styles/grammar.css`.

**Inline SVG is not in the markup.** It sits in `_includes/art/`, named for the
band that draws it, and the build pastes it back:

    {{ "/_includes/art/hero-pad-ps.svg" | svgContents | safe }}

`eleventy-plugin-svg-contents` does the pasting; the leading slash is its API,
not a URL. hero.html was 46KB, 39KB of it pad geometry, so an agent sent to
change one line of copy read 46KB to find it; it is 7KB now. The built page is
unchanged, deliberately: this buys reading, not bytes. Reasons for the directory,
and the one place the plugin reformats, are in `eleventy.config.js`.

`assets/svg/` is a different thing and must not be used for this. It holds
`pad-art-{mf,ps,sw,xb}.svg`, which are **served**, and fetched at runtime by
`home.js` rewriting `use.padart`'s href. `_includes/art/` is never served.

**A band's two files are at the same path in each tree.** Swap `_includes` for
`styles` and `.html` for `.css`: `_includes/bands/feel.html` is styled by
`styles/bands/feel.css`. Derivable by rule, so nobody has to be told, and there
is no map to go stale. Not every band has a sheet (`uses` has none, and neither
does the chrome); an absent file means the band has no CSS of its own, not that
it is somewhere else.

**A page pairs the same way**: `vs.html` is styled by `styles/pages/vs.css`,
bundled to `_site/vs.css` and linked by the layout for that page alone. Put a
rule there when one page uses it; put it in `styles/shared.css` only when three
or more do, because that sheet ships on all 14 pages. Page sheets are
**unlayered**, unlike everything else here: they replaced `<style>` blocks that
sat in each page's front matter, which outranked every layer in `site.css`.

## Three things Eleventy does not do, kept in `eleventy.config.js`

Each fails silently rather than loudly if it goes missing, so read the comments
at the call sites before touching them.

- `styles/home.entry.css` is **generated** from a glob of `styles/bands/*.css`,
  because neither `@import` nor Lightning CSS `--bundle` takes a glob. Lose it
  and a new band sheet is simply never imported.
- Lightning CSS runs with `--minify` **and** `--targets`. The targets are a bug
  fix: without them it emits Media Queries Level 4 range syntax that Safari 16.3
  cannot parse, and the responsive layout stops applying with no error.
- `ELEVENTY_ENV=production` strips HTML comments (17% of the homepage is design
  rationale written for editors, not visitors). Dev builds keep them.

## Commands

**Every task is defined in the `Makefile`, once.** The header there says why.
`package.json` has two scripts and both forward to `make`; nothing else defines
work. Add a task by adding a target with a `##` comment, and it shows up in
`make help`.

    make help        every target
    make build       assemble the site into _site/
    make build-prod  same, with dev comments stripped
    make up          build, then nginx on https://steer.seanfloyd.dev.local (and :8391)
    make ci          build, then lint and render in parallel
    make lint-css    stylelint every hand-written sheet
    make lint-html   html-validate every page in _site/
    make lint-js     eslint home.js and every .mjs tool
    make lint-py     ruff over every Python gate
    make a11y        axe-core, WCAG 2 A/AA, every page in _site/
    make contrast    every token colour pair clears AA on its darkest surface
    make shots       render every band at 1440 and 375 into scratch/shots/

`scripts/` holds all the tooling, whatever language it is in: `scripts/ci` is
the parallel runner `make ci` invokes, and the Python gates sit beside the Node
ones. `bin/` is gone; splitting by language put two halves of one toolchain in
two directories.

Tooling is adopted, not hand-rolled: Eleventy assembles, Lightning CSS bundles,
stylelint / eslint / ruff lint the three languages, PurgeCSS answers
reachability, axe-core grades accessibility, colorjs.io does the contrast maths,
`scripts/a11y-check` and `scripts/lighthouse` came from `../news-digest`. Three
attempts at hand-rolling CSS edits broke the page; see `docs/lessons/`.

Each linter is its recommended preset and nothing else selected on top, so the
configs hold environment facts and earned exceptions rather than taste. Two of
them enforce something a preset cannot: `stylelint-declaration-strict-value`
requires a *variable* for radius and colour properties, which is the inversion
of what `curb-check.mjs` does (it validates that a literal is a blessed tier and
can never ask whether the token was used, so `border-radius:14px` passed while
`--r-card` is exactly 14px). Spacing is deliberately not enforced: there are 51
distinct px values against one `--pad`, so there is no scale to enforce yet.
`make lint-py` discovers its files by shebang because four of the five Python
gates have no `.py` extension and `ruff check scripts/` silently reads only one
of them.

There are two accessibility gates and they are not redundant. `scripts/a11y-check`
is a static HTML parse: instant, no browser, catches a missing `<main>` or an
`<img>` with no `alt`. `make a11y` (`scripts/axe-check.mjs`) drives axe-core over
the rendered page, which is the only way to see a heading that skips a level or a
link told apart from its paragraph by colour alone. Both of those shipped live
while the static check passed. It is axe-core rather than `scripts/lighthouse`
because Lighthouse's accessibility category *is* axe-core plus a page load and a
score: 2m15s over these 14 pages against 7s, and a two-minute step in `make ci`
is one that stops being run.

`make lint-html` runs html-validate over `_site/**/*.html`, and it is in CI. It
used to read the band fragments against a config that switched eight rules off
because a fragment is not a document; the fragments became Nunjucks and the step
was dropped rather than repointed. It grades complete documents now, so all
eight are back on. The backlog that stood in the way (103 errors, 97 of them
inline `style` attributes) is what `styles/pages/` exists to hold.

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
