// CSS lint. Was .stylelintrc.json; it is JS now for the reason the Makefile
// header already gives for tasks living in Make: JSON cannot carry a comment,
// and the rules below are all decisions that need one. (Stylelint rejects a
// "//" key inside `rules` as an unknown rule, so there was not even a trick
// left to abuse.) No behaviour change: nothing referenced the old filename,
// stylelint auto-discovers this one, and `make lint-css` is unchanged.
//
// stylelint-config-recommended is the baseline: it turns on every "possible
// error" rule rather than whatever a person thought to list. The overrides are
// this repo's own, each one earned. Sources only, never the generated sheets in
// dist/: Lightning CSS compresses colours there and the output flags values
// nobody wrote.

export default {
  extends: ["stylelint-config-recommended"],
  plugins: ["stylelint-declaration-strict-value"],
  rules: {
    "no-duplicate-selectors": [true, { severity: "warning" }],
    "declaration-block-no-duplicate-properties": [true, { ignore: ["consecutive-duplicates-with-different-values"] }],
    "declaration-block-no-shorthand-property-overrides": true,
    "property-no-unknown": [true, { ignoreProperties: ["corner-shape"] }],
    "no-descending-specificity": null,
    "function-no-unknown": null,
    "media-feature-name-no-unknown": [true, { ignoreMediaFeatureNames: ["prefers-reduced-motion"] }],

    // Token usage, which is the inversion of what scripts/curb-check.mjs does.
    // curb-check validates that a literal is one of the blessed tiers; by
    // construction it can never ask whether the token was used at all, so
    // `border-radius:14px` passed for as long as it existed while --r-card is
    // exactly 14px in the same repo. fe3f465 fixed thirteen of those by hand
    // and nothing stopped the fourteenth (there was one, in dialogs.css).
    //
    // tokens.css needs no exemption and has none: its literals live in custom
    // -property declarations, which are not any of the properties named here.
    // Verified rather than assumed.
    //
    // LONGHANDS ONLY. `border`, `outline` and `background` are deliberately
    // absent: the plugin reads the first token of a shorthand, so
    // `border:1px solid var(--sep)` reports the WIDTH `1px` as the off-token
    // value and a declaration that already uses the token fails. That is
    // thirty-odd false positives and no true ones. Measured before it was left
    // out; do not "complete" this list.
    "scale-unlimited/declaration-strict-value": [
      ["border-radius", "color", "fill", "stroke", "background-color", "border-color", "outline-color"],
      {
        // The plugin ignores ANY function value by default, and its own message
        // says so: "Expected variable, function or keyword". So the closed
        // palette below was closed against bare hexes only -- rgba(), rgb(),
        // hsl() and color-mix() all walked straight through, and
        // `border-color:rgba(255,255,255,0.22)` sat in the chrome on all 14
        // pages while `make lint-css` exited 0. Probed rather than assumed:
        // a scratch sheet of one literal per notation reported the hex and the
        // px and nothing else.
        //
        // Turning it off flags five real literals and two false ones, both of
        // them color-mix() over a var(). The `var\(` pattern below is what keeps
        // those: it means "a value that resolves through a token is a token",
        // which is the rule anyone would state in words. Measured both ways
        // before landing: 7 errors without it, 5 with, 0 after the five were
        // tokenised.
        ignoreFunctions: false,
        ignoreValues: {
          // The colour list is a CLOSED PALETTE, not a silence. Every hex is a
          // deliberate literal outside the theme ramp: the nav-over-hero dark
          // glass, the .feel-cinema band's local palette (one of them carries
          // its own measured contrast comment), the light-bar LED hues, and
          // #fff on the accent, which contrast.mjs checks by name. None has a
          // token to point at, and minting one for each is a design decision
          // rather than a lint fix -- the same reason the spacing scale is not
          // enforced here. What the list buys is that the palette is closed: a
          // hex that is not already one of these fails. Nothing caught that
          // before, and #4D8DFF is written out nine times across these sheets
          // while appearing in tokens.css exactly zero times.
          "": [
            "currentColor", "inherit", "transparent", "none",
            // Values routed through a token. Required once ignoreFunctions is
            // off, so that color-mix(in srgb,var(--blue) 32%,transparent) reads
            // as the token use it is.
            //
            // BOTH ANCHORED, deliberately. An unanchored /var\(/ means "mentions
            // a token somewhere", not "resolves through one", and
            // color-mix(in srgb,#ff0000 50%,var(--bg)) walks through it -- as
            // does rgb(255 0 0/var(--o)). Verified: with the loose pattern all
            // four of those probe cases pass. curb-check does not cover the gap
            // either; its FORBIDDEN_HEX is a five-entry denylist, not a palette.
            //
            // The color-mix pattern is narrow and will reject a form nobody has
            // written yet. That is the failure direction to want: a new mix
            // errors and someone widens this line, where the loose version would
            // have let a literal in silently.
            "/^var\\(/",
            "/^color-mix\\(in [a-z-]+,\\s*(var\\(--[\\w-]+\\)|transparent|currentColor)(\\s+[\\d.]+%)?,\\s*(var\\(--[\\w-]+\\)|transparent|currentColor)(\\s+[\\d.]+%)?\\)$/i",
            // C7CEDA left this list when the nav-over-hero glass became the
            // --oh-* group: it now appears only as a custom-property value in
            // tokens.css, which no property here covers.
            "/^#(fff|F4F7FC|E9EDF6|8791A6|AEB6C6|7FB0FF|4D8DFF|A87CFF|FF6FAE|FFB454|5FD48D|3FE0C0)$/i",
          ],
          // 0 and 50% are resets and circles, not radius tiers. 1-7px is the
          // hand-built SVG vignette geometry, which curb-check also leaves
          // alone and for the reason its comments record: sub-8px radii fire
          // ~100% false on this codebase. 8px and up is where a real component
          // radius lives, and that is where this bites.
          "border-radius": ["0", "50%", "/^[1-7]px$/"],
        },
      },
    ],
  },
};
