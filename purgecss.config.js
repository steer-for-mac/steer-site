// PurgeCSS: report (and optionally strip) rules no page can reach.
//
// It scans the markup AND home.js, so a class the script adds at runtime is
// found without anyone maintaining a list of them. The safelist below is only
// for states that appear nowhere as a literal: pseudo-elements, and the
// attribute-driven gates whose values are built by string concatenation.
//
//   npx purgecss --config purgecss.config.js            # report
//   npx purgecss --config purgecss.config.js --output . # rewrite (review the diff)
export default {
  content: ["parts/*.html", "*.html", "!index.src.html", "home.js"],
  css: ["home.css", "styles.css"],
  safelist: {
    standard: [
      // set by home.js as 'data-pad', '<pad>' pairs, never written literally
      /^pd-/, /^only-/, /^face-slot/, /^padart$/,
      // toggled by script or by the browser, so absent from any static snapshot
      /^on$/, /^still$/, /^booted$/, /^anim-halt$/, /^shots-open$/, /^accent-anim$/,
      /^zoomed$/, /^cur$/, /^lb-auto$/, /^rb-halt$/, /^active$/,
    ],
    // keep every :hover/::after/[aria-*] variant of a class that survives
    greedy: [/^d-/, /^dgs/, /^lay-/, /^vg-/, /^shots/, /^ml-/],
    deep: [/^chero/],
  },
  // Attribute and keyframe rules are matched too, not just class selectors.
  variables: true,
  keyframes: true,
};
