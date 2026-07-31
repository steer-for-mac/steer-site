# Steer site

Marketing site for Steer, a macOS menu-bar app that turns a game controller into
Mac input. Eleventy builds it into the gitignored `dist/`, which is what
deploys. `make help` lists every task; `make ci` is the gate.

`docs/design-rules.md` binds any change to layout, styling or copy.

`_includes/art/` is pasted in at build time. `assets/svg/` is served and fetched
at runtime. They are not interchangeable.

One band per file is what lets several agents work at once: give an agent its
band's two files and keep it out of `styles/design-system.css`.
