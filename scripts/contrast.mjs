#!/usr/bin/env node
// contrast — the checker styles/tokens.css has been citing for every ratio it
// records, and which did not exist in this repo. Nearly every colour there
// carries a comment like "#626269 measures 4.97:1 on --bg-inset-2 (verified
// via contrast.mjs)". Those measurements were real; the tool was lost. So the
// audit trail behind docs/design-rules.md's AA rule could not be reproduced,
// while the same doc rejects on sight "any colour pair whose contrast was never
// measured".
//
//     node scripts/contrast.mjs           check every pair, exit 1 on a failure
//     node scripts/contrast.mjs --table   print the full matrix
//
// The rule it enforces is the curb's, not WCAG's default reading: a text colour
// must clear AA against the DARKEST surface it can land on, not against --bg.
// Small print lands on inset cards, so measuring --text-3 on white flatters it
// by more than a point (6.05 there, 4.97 on --bg-inset-2).
//
// The colour science is colorjs.io, the CSS WG editors' own implementation, and
// not the twenty lines of hand-rolled sRGB-to-linear that used to sit here.
// Those twenty lines were correct -- they reproduced every ratio tokens.css
// records and the negative control bit -- which is exactly why they were worth
// replacing rather than trusting: nothing about a hand-rolled luminance tells
// you it is right, and the next person to touch a gamma exponent gets no
// warning. Same numbers, from the reference implementation: verified 4.97,
// 6.05, 4.60, 4.62, 4.52 and 4.54 to the digit against the comments in
// styles/tokens.css, with #007aff still failing at 4.02.
//
// This does cost the one dependency the file used to boast about not having.
// That trade is deliberate: a design gate that is wrong in the fourth decimal
// and still exits 0 is worse than one that cannot run at all, and the second
// failure is the loud one.

import Color from "colorjs.io";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AA = 4.5;          // normal-size text
const AA_LARGE = 3.0;    // >=24px, or >=18.66px bold

// Text tokens, and the largest size each is actually used at. Everything here
// is body-sized or smaller; the display tier uses --text, which clears AA
// anyway, so nothing claims the 3.0 exemption today. Keep it that way.
const TEXT = ["--text", "--text-2", "--text-3", "--blue-text", "--green-text", "--amber-text"];
// Every surface a text token can land on. --bg-inset-2 is the darkest in light
// mode and the lightest in dark, i.e. the worst case in both directions.
const SURFACE = ["--bg", "--bg-sunken", "--bg-inset", "--bg-inset-2", "--card-bg"];
// Filled buttons put white on the accent, which is why --blue is #0071eb and
// not Apple's #007aff: the latter measures 4.02 and fails.
const ON_ACCENT = [["#ffffff", "--blue"]];

// "WCAG21" names the algorithm explicitly rather than taking the library's
// default, which is APCA-flavoured in some versions and would silently grade to
// a different standard than the one every comment in tokens.css was measured
// against. The ordering the old code did by hand (lighter over darker) is
// inside this call; the result is symmetric.
const ratio = (a, b) => Color.contrast(a, b, "WCAG21");

// Parse the token blocks. Only literal hexes are checkable: rgba() over an
// unknown backdrop and color-mix() taking var() have no fixed value, so they
// are skipped rather than guessed at.
// Comments come out FIRST. tokens.css opens with a block comment, and a
// selector pattern of `[^{]*` will happily swallow it and report the whole
// preamble as the selector name, so `:root` is never found and every light
// token silently goes unchecked. Caught by a negative control: feeding the
// checker #007aff, the blue tokens.css explicitly forbids, produced zero
// failures. A checker that passes everything looks identical to a clean sheet.
function blocks(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  for (const m of css.matchAll(/^\s*([^{}]*?)\s*\{([^}]*)\}/gm)) {
    const vars = {};
    for (const v of m[2].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*(?:;|$)/g)) {
      vars[v[1]] = v[2];
    }
    if (Object.keys(vars).length) out.push({ selector: m[1].trim(), vars });
  }
  return out;
}

const css = readFileSync(join(ROOT, "styles/tokens.css"), "utf8");
const all = blocks(css);
const light = all.find((b) => b.selector === ":root")?.vars ?? {};
const dark = all.find((b) => b.selector === '[data-theme="dark"]')?.vars ?? {};

// An accent block overrides only --blue*; it inherits every surface from the
// theme it modifies. That inheritance is the whole reason a violet accent can
// fail on a surface the blue one passed.
const themes = [{ name: "light", vars: light }, { name: "dark", vars: { ...light, ...dark } }];
for (const b of all) {
  if (!b.selector.includes("data-accent")) continue;
  const base = b.selector.startsWith("[data-theme=\"dark\"]") ? themes[1].vars : light;
  themes.push({ name: b.selector, vars: { ...base, ...b.vars } });
}

const table = process.argv.includes("--table");
let failures = 0, checked = 0;

for (const { name, vars } of themes) {
  for (const t of TEXT) {
    if (!vars[t]) continue;
    // Worst case only, unless --table: the curb's rule is about the darkest
    // surface, and reporting the other four passing is noise that hides it.
    let worst = null;
    for (const s of SURFACE) {
      if (!vars[s]) continue;
      const r = ratio(vars[t], vars[s]);
      if (table) console.log(`  ${name.padEnd(38)} ${t.padEnd(13)} on ${s.padEnd(13)} ${r.toFixed(2)}`);
      if (!worst || r < worst.r) worst = { r, s };
    }
    if (!worst) continue;
    checked++;
    if (worst.r < AA) {
      failures++;
      console.log(`FAIL  ${name}  ${t} ${vars[t]} on ${worst.s} ${vars[worst.s]} = ${worst.r.toFixed(2)}, needs ${AA}`);
    }
  }
  for (const [fg, bgTok] of ON_ACCENT) {
    if (!vars[bgTok]) continue;
    const r = ratio(fg, vars[bgTok]);
    checked++;
    if (table) console.log(`  ${name.padEnd(38)} ${fg.padEnd(13)} on ${bgTok.padEnd(13)} ${r.toFixed(2)}`);
    if (r < AA) {
      failures++;
      console.log(`FAIL  ${name}  ${fg} on ${bgTok} ${vars[bgTok]} = ${r.toFixed(2)}, needs ${AA}`);
    }
  }
}

console.log(`\ncontrast: ${checked} pair(s) checked at their worst surface, ${failures} failing (AA ${AA}, large ${AA_LARGE}).`);
process.exit(failures ? 1 : 0);
