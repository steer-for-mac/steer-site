# Steer site

Marketing site for Steer (macOS menu-bar app: game controller to Mac input).
Static site: `index.html` + `styles.css`, plus per-topic `*.html` doc pages.
No build step. Screenshots regenerate from the app repo (see auto-memory).

## Design: read before touching UI, CSS, or copy

**`docs/design-rules.md` is the curb.** Read it before any change to layout,
styling, or visible copy, and reject changes that violate its non-negotiables.
Short version: system fonts only, one system-blue accent, cool neutral surfaces,
AA-verified contrast, no em-dashes / clichés / emoji in copy, one primary CTA.
The site is deliberately not an "average website"; the reasons live in that doc
and in the `styles.css` comments.
