# Steer site — backlog

Non-urgent ideas, parked deliberately. Pull from here when there's a reason to.

## Version sync (app repo → site footer)

**Want:** the footer version string (currently hand-set to `v1.0 beta` in `index.html`)
should reflect the real shipped version after launch, without manual edits.

**Why parked:** during beta there is nothing to sync — a marketing footer wants
"v1.0", not "build 241". Hand-bumping at major releases is fine until there's a
real changelog/version surface worth automating.

**Approach when picked up:**
- The site is a plain branch-based GitHub Pages deploy (org `steer-for-mac/steer-site`,
  no Actions workflow today).
- Add a GitHub Action in the **app** repo that, on each release, fires a
  `repository_dispatch` (or commits a tiny `version.json`) into `steer-site`.
- The site either reads `version.json` at build/commit time or the dispatch updates
  the footer string directly; Pages redeploys on push.
- Only worth it alongside a live changelog page that genuinely tracks builds.

## Dark-mode screenshots

If dark mode ships (see prototype), recapture the app screenshots in macOS dark
appearance so they match the page instead of sitting as bright light-mode windows.
Light shots framed on a dark page are acceptable as an interim; native dark captures
are the polished end state.
