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
  // Shipped pages only, which since the Eleventy migration means the build
  // output and nothing else. parts/*.html was in here and was the same mistake
  // _probe.html was: a build input, not a page. Its content is already inside
  // index.html, so listing it could only ever keep a band alive after the band
  // stopped being included. Measured: drop a band from index.src.html and the
  // gate still passed at 2.5% with parts/ in the glob, 4.5% without it.
  content: ["_site/*.html", "_site/home.js"],
  css: ["_site/home.css", "_site/styles.css"],
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
      // parts/hero.css carries 42 rules under html[data-theme="lightoff"], the
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
      // or the daylight studio is dropped from parts/hero.css. It is the
      // largest carve-out in this file by far, worth 6.3 points of home.css on
      // its own, so it is also the first thing to re-examine if the threshold
      // below ever feels tight.
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
