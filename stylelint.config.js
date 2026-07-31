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
// _site/: Lightning CSS compresses colours there and the output flags values
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
            "/^#(fff|F4F7FC|C7CEDA|E9EDF6|8791A6|AEB6C6|7FB0FF|4D8DFF|A87CFF|FF6FAE|FFB454|5FD48D|3FE0C0)$/i",
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
