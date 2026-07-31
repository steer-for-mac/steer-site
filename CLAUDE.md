# Steer site

Marketing site for Steer, a macOS menu-bar app that turns a game controller into
Mac input. Eleventy assembles it into `_site/`, which is gitignored and is the
only thing deployed. `make help` lists every task; `make ci` is the gate.

`docs/design-rules.md` is the curb and is binding on any change to layout,
styling or copy.

## Four things that will bite you

**Layer, not specificity.** `@layer tokens, base, components, bands`. Moving a
rule between sheets moves it between layers, and layer order beats specificity
outright — demote a rule to `base` and it loses to anything in `components`
however specific it is. Nothing lints this.

**`_includes/art/` is pasted in at build time; `assets/svg/` is served** and
fetched at runtime by `home.js`. They are not interchangeable.

**Nunjucks renders what it includes**, including the JS under
`_includes/scripts/`. A malformed `{{` fails the build loudly; a well-formed
`{{ name }}` renders to empty string and deletes code silently.

**The page freezes itself under automation.** `home.js` adds `.still` when
`navigator.webdriver` is true, and `<use href="assets/svg/…#s">` is blocked over
`file://`. Nothing headless sees motion, or any pad art, without removing that
class and serving the directory.

## Working here

One band per file is what lets several agents work at once: give an agent its
band's two files and keep it out of `styles/design-system.css`.

`index.src.html` is which bands appear on the homepage, and in what order.
