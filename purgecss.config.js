// PurgeCSS: report (and optionally strip) rules no page can reach.
//
// It scans the markup AND the two page scripts, so a class either adds at runtime is
// found without anyone maintaining a list of them. The safelist below is only
// for states that appear nowhere as a literal: pseudo-elements, and the
// attribute-driven gates whose values are built by string concatenation.
//
//   npx purgecss --config purgecss.config.js            # report
//   npx purgecss --config purgecss.config.js --output . # rewrite (review the diff)
export default {
  // Shipped pages only, which since the Eleventy migration means the build
  // output and nothing else. The band fragments were in here and were the same
  // mistake _probe.html was: a build input, not a page. Their content is already
  // inside index.html, so listing them could only ever keep a band alive after
  // the band stopped being included. Measured: drop a band from index.src.html
  // and the gate still passed at 2.5% with the fragments in the glob, 4.5%
  // without them.
  content: ["_site/*.html", "_site/home.js", "_site/theme.js"],
  // Every sheet the build emits, globbed rather than listed, so a new
  // styles/pages/<page>.css is graded the day it appears instead of the day
  // somebody remembers this line. A page sheet is small, so the percentage is
  // a sharp instrument on it: one dead rule in a 200-byte file is 20%.
  css: ["_site/*.css"],
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
      // styles/bands/hero.css carries 9 rules under html[data-theme="lightoff"], the
      // "daylight studio" hero treatment: a designed, commented light-mode
      // variant of the pad plate. Nothing sets that value today — no markup, no
      // home.js — so PurgeCSS is right that it is unreachable, and it is kept
      // anyway on the precedent docs/design-rules.md set for .vg-speak and
      // .vg-launch: re-deriving a drawn plate costs far more than carrying it.
      //
      // Safelisting the attribute NAME is the narrowest exemption this API can
      // express (values are not exposed to the safelist). It only lets the
      // [data-theme=...] node pass; every other node in the selector is still
      // checked, so `[data-theme="dark"] .traffic .r` was still reported dead
      // and deleted.
      //
      // Do NOT read the trigger as "when data-theme gets wired up": it already
      // is, home.js and the head script both set light/dark. Only the lightoff
      // value is unset. Delete this entry when either something sets lightoff,
      // or the daylight studio is dropped from styles/bands/hero.css. It is the
      // largest carve-out in this file by far, worth 3.8 points of home.css on
      // its own (it was 6.3 and 42 rules until the pad art moved to var()-driven
      // presentation attributes, which collapsed thirty of those selectors into
      // one palette block), so it is also the first thing to re-examine if the
      // threshold below ever feels tight.
      /^data-theme$/,
    ],
    // keep every :hover/::after/[aria-*] variant of a class that survives
    greedy: [/^d-/, /^dgs/, /^lay-/, /^vg-/, /^shots/, /^ml-/],
    deep: [/^chero/],
  },
  // Attribute and keyframe rules are matched too, not just class selectors.
  //
  // variables is OFF so this number means one thing: rules no page can reach.
  // With it on, the entire reading was unused custom properties rather than
  // dead rules — 0.5% and 2.5% against 0.0% and 0.0% with it off. tokens.css
  // ships to all 16 pages and legitimately carries values only the homepage
  // uses, so that signal is noise here, and it was drowning the real one: a
  // band dropped from index.src.html with its sheet left behind reads 4.2%.
  // Zero versus 4.2 is a gate. 2.5 versus 4.7 was not.
  variables: false,
  keyframes: true,
};
