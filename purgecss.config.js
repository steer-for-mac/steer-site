// PurgeCSS: report (and optionally strip) rules no page can reach. Scans the
// markup AND the page scripts, so runtime classes need no hand-kept list; the
// safelist is only for states that appear nowhere as a literal.
//   npx purgecss --config purgecss.config.js            # report
//   npx purgecss --config purgecss.config.js --output . # rewrite (review the diff)
export default {
  // Shipped pages only: never band fragments (build inputs, not pages) and never
  // the unlinked hero-* comps, which share .lg-* rules with the homepage and
  // vouch for them. Measured: with the comps scanned, dropping the feature band
  // from index read 1.6%; without them, 11.3%. Zero versus eleven is a gate.
  content: ["dist/*.html", "!dist/hero-*.html", "dist/home.js", "dist/theme.js"],
  // Every sheet the build emits, globbed, so a new styles/pages/<page>.css is
  // graded the day it appears. A page sheet is small, so the percentage bites:
  // one dead rule in a 200-byte file is 20%.
  css: ["dist/*.css"],
  safelist: {
    standard: [
      // per-pad gates. pd-* IS written literally in the markup, so it is not
      // here for the reason the others are; it stays because the family is
      // driven by html[data-pad] and a scan cannot tell a live member from a
      // stale one. The rest are assembled by home.js from concatenated strings
      // ('only-'+pad, 'data-'+pad) and appear nowhere as literals.
      /^pd-/, /^only-/, /^face-slot/, /^padart$/,
      // toggled by script or by the browser, so absent from any static snapshot
      /^on$/, /^still$/, /^booted$/, /^anim-halt$/, /^shots-open$/, /^accent-anim$/,
      /^zoomed$/, /^cur$/, /^lb-auto$/, /^rb-halt$/, /^active$/,
      // A bare pseudo-class has no class/id/tag node, so PurgeCSS scores it
      // unreachable and would strip the site's whole keyboard focus ring.
      // `.btn:focus-visible` survives on its class; `:focus-visible` alone does not.
      /^:focus-visible$/,
      // Attribute NAME only; every other node in a [data-theme=...] selector is
      // still checked. Kept from the deleted "lightoff" palette era because the
      // dark-theme rules ride on it; re-measure before removing.
      /^data-theme$/,
    ],
    // keep every :hover/::after/[aria-*] variant of a class that survives
    greedy: [/^d-/, /^dgs/, /^lay-/, /^vg-/, /^shots/, /^ml-/],
    deep: [/^chero/],
  },
  // variables OFF so the number means one thing: rules no page can reach.
  // With it on, unused custom properties (tokens.css ships to every page)
  // drowned the real signal: a dropped band read 2.5 versus 4.7, not 0 versus 4.2.
  variables: false,
  keyframes: true,
};
