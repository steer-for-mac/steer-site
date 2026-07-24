#!/usr/bin/env node
// curb-check — mechanizes the parts of docs/design-rules.md that were enforced
// by eye. It is the readable version of the curb's "grep the diff for em-dashes,
// cliches, and emoji" line, plus the value-drift rules (web fonts, forbidden
// hexes, invented radii, bootstrap shadow, AI-purple hues).
//
// Zero dependencies on purpose: this site has no build step and no package.json.
// Run it the way contrast.mjs is run — straight from node:
//
//     node scripts/curb-check.mjs            # scan the committed pages + CSS
//     node scripts/curb-check.mjs --self-test  # prove every detector still bites
//
// It is deliberately NOT a formatter and NOT a full HTML parser. It distinguishes
// visible copy (text nodes + user-facing attributes) from the things the naive
// grep in the curb trips over: CSS/JS blocks, HTML/CSS comments, and SVG path
// data. Two severities: ERROR fails the run (exit 1); WARN is a review nudge
// (exit 0). Tune the word lists below; they are meant to be edited, not frozen.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Pages carrying visible marketing copy. Add new *.html here when they ship.
const HTML_FILES = [
  "index.html", "features.html", "agents.html", "compatibility.html",
  "accessibility.html", "vs.html", "buy.html", "support.html",
  "terms.html", "privacy.html", "refund.html",
];
const CSS_FILES = ["styles.css"];

// ---- the lists the curb enforces by eye (copy rules) ----------------------

// U+2013 en, U+2014 em, U+2015 horizontal bar, U+2212 minus. US-keyboard only.
const DASHES = /[–—―−]/;

// AI cliches / filler. The curb names the first row; the rest are the well-worn
// tells the taste-skill / impeccable references also ban. Anchored at the start
// only (leading \b, no trailing boundary) so a stem catches its suffixes:
// "effortless" fires on "effortlessly", "revolutioni" on "revolutionize".
const CLICHES = [
  "seamless", "elevate", "unleash", "effortless", "next-gen", "next gen",
  "revolutioni", "supercharge", "game-chang", "game chang", "cutting-edge",
  "state-of-the-art", "world-class", "best-in-class", "empower", "leverage",
  "delve", "robust solution", "turnkey", "paradigm", "synerg",
];
const CLICHE_RE = new RegExp(`\\b(${CLICHES.map(escapeRe).join("|")})`, "i");

// Emoji. ERROR on the unambiguous astral/emoji blocks + variation-selector-16
// + the star/arrow symbol block; WARN on the misc-symbols/dingbats range, which
// holds a few glyphs a UI might use as text (checkmarks, etc.) worth a human look.
const EMOJI_ERR = /[\u{1F000}-\u{1FAFF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/u;
const EMOJI_WARN = /[☀-➿⁉‼]/;

// ---- value-drift lists (CSS rules) ----------------------------------------

// Hexes the curb rejects on sight. Case-insensitive, compared after comments
// are stripped so the cautionary comments in styles.css do not self-flag.
const FORBIDDEN_HEX = [
  ["#0d6efd", "Bootstrap default blue"],
  ["#007aff", "the AA-failing blue the CSS comment says not to restore (use --blue #0071eb)"],
  ["#fafaf9", "warm cream — surfaces are cool neutral"],
  ["#faf9f6", "warm cream — surfaces are cool neutral"],
  ["#fbfbf9", "warm cream — surfaces are cool neutral"],
];
// Web/display faces that must never appear. System font is the display tier.
const FONT_INTRUDERS = /font-family[^;{}]*\b(Inter|Satoshi|Clash|Fraunces|Instrument\s*Serif|Geist|Roboto|Poppins|Montserrat|Lato|Open\s*Sans|Nunito)\b/i;
const FONT_LINK = /(fonts\.googleapis\.com|fonts\.gstatic\.com|@font-face)/i;
// Bootstrap's tell-tale shadow, any rounding of the alpha.
const BOOTSTRAP_SHADOW = /0\s+2px\s+4px\s+rgba\(0,\s*0,\s*0,\s*0?\.1\)/i;
// Radii the curb blesses (px). Everything else literal is drift.
const ALLOWED_RADII_PX = new Set([0, 10, 12, 14, 980]);

// ---------------------------------------------------------------------------

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Replace a matched region with the same number of newlines it spanned, so every
// later line keeps its original line number. Used to blank out non-copy regions.
function blankPreservingLines(src, re) {
  return src.replace(re, (m) => "\n".repeat((m.match(/\n/g) || []).length));
}

const NAMED = { mdash: "—", ndash: "–", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…" };
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => cp(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in NAMED ? NAMED[n.toLowerCase()] : m));
}
function cp(n) { try { return String.fromCodePoint(n); } catch { return ""; } }

function lineOf(src, index) { return src.slice(0, index).split("\n").length; }

// ---- HTML: split into visible-text lines + user-facing attribute values ----

function scanHtml(file, findings) {
  const src = readFileSync(join(ROOT, file), "utf8");

  // 1. Blank comments, <script>, <style> — the curb's grep trips on these.
  let masked = blankPreservingLines(src, /<!--[\s\S]*?-->/g);
  masked = blankPreservingLines(masked, /<script\b[\s\S]*?<\/script>/gi);
  masked = blankPreservingLines(masked, /<style\b[\s\S]*?<\/style>/gi);

  // 2. Walk the text NODES (content between tags), not raw lines. Per-node is
  //    what lets the dash check tell a prose em-dash ("...it is - no email")
  //    from a table's standalone "not supported" glyph (<td class="n">-</td>):
  //    the marker cell is a node with no letters, so the dash check skips it.
  const tag = /<[^>]*>/g;
  let last = 0, t;
  while ((t = tag.exec(masked))) {
    if (t.index > last) checkNode(file, masked, last, t.index, findings);
    last = tag.lastIndex;
  }
  if (last < masked.length) checkNode(file, masked, last, masked.length, findings);

  // 3. User-facing attribute values (screen-reader visible) count as copy too.
  //    Match either quote style (\1 backref) so a single-quoted alt='...' with a
  //    smuggled em-dash is not silently skipped.
  for (const m of masked.matchAll(/\b(?:alt|title|aria-label|placeholder)\s*=\s*(["'])(.*?)\1/gi)) {
    copyChecks(file, lineOf(masked, m.index), decodeEntities(m[2]), findings, "attr");
  }
  for (const m of masked.matchAll(/<meta[^>]*\b(?:name="description"|property="og:description")[^>]*content="([^"]*)"/gi)) {
    copyChecks(file, lineOf(masked, m.index), decodeEntities(m[1]), findings, "meta");
  }

  // 4. Inline <style> blocks get the CSS value checks too.
  for (const m of src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    cssChecks(file, m[1], lineOf(src, m.index) - 1, findings);
  }
  // 5. And the HTML itself for smuggled web-font links.
  if (FONT_LINK.test(src)) {
    const mm = src.match(FONT_LINK);
    findings.push(err(file, lineOf(src, mm.index), `web font intrusion: ${mm[1]} (system fonts only)`));
  }
}

function checkNode(file, masked, start, end, findings) {
  const text = decodeEntities(masked.slice(start, end)).trim();
  if (text) copyChecks(file, lineOf(masked, start), text, findings, "text");
}

const HAS_LETTER = /\p{L}/u;
function copyChecks(file, line, text, findings, kind) {
  // Dash only counts as a prose em-dash when it shares its node with letters;
  // a bare "-" cell (spec-table "not supported" marker) is not the AI tell.
  if (DASHES.test(text) && HAS_LETTER.test(text))
    findings.push(err(file, line, `em/en-dash in visible ${kind}: "${clip(text)}" (use colon, period, comma)`));
  const c = text.match(CLICHE_RE);
  if (c) findings.push(err(file, line, `AI cliche "${c[1]}" in ${kind}: "${clip(text)}"`));
  if (EMOJI_ERR.test(text))
    findings.push(err(file, line, `emoji in ${kind}: "${clip(text)}"`));
  else if (EMOJI_WARN.test(text))
    findings.push(warn(file, line, `symbol glyph in ${kind} (emoji? review): "${clip(text)}"`));
}

// ---- CSS value-drift checks ------------------------------------------------

function scanCss(file, findings) {
  cssChecks(file, readFileSync(join(ROOT, file), "utf8"), 0, findings);
}

function cssChecks(file, css, lineOffset, findings) {
  // Strip /* */ comments first so cautionary comments do not self-flag.
  const clean = blankPreservingLines(css, /\/\*[\s\S]*?\*\//g);
  const at = (idx) => lineOffset + lineOf(clean, idx);

  for (const [hex, why] of FORBIDDEN_HEX) {
    const i = clean.toLowerCase().indexOf(hex);
    if (i !== -1) findings.push(err(file, at(i), `forbidden colour ${hex}: ${why}`));
  }
  let m;
  if ((m = clean.match(FONT_INTRUDERS)))
    findings.push(err(file, at(m.index), `display/web font "${m[1]}" as a face (system font IS the display tier)`));
  if (FONT_LINK.test(clean)) {
    const f = clean.match(FONT_LINK);
    findings.push(err(file, at(f.index), `@font-face / web font: ${f[1]}`));
  }
  if ((m = clean.match(BOOTSTRAP_SHADOW)))
    findings.push(warn(file, at(m.index), `Bootstrap-default shadow ${m[0]} (use the elevation ramp)`));

  // Literal border-radius px outside the fixed tiers = invented radius. Scoped
  // to COMPONENT scale (8-40px): below 8px is the hand-built SVG/vignette detail
  // work the curb protects as load-bearing craft, and the 980/999 pills are
  // full-round by intent. What is left is the "stray 16px card that should be a
  // token" case this rule exists to catch.
  for (const r of clean.matchAll(/border-radius\s*:\s*([^;{}]+)/gi)) {
    const val = r[1];
    if (val.includes("var(")) continue;
    for (const px of val.matchAll(/(\d+(?:\.\d+)?)px/g)) {
      const n = Number(px[1]);
      if (!ALLOWED_RADII_PX.has(n) && n >= 8 && n <= 40)
        findings.push(warn(file, at(r.index), `literal border-radius ${n}px — not a token tier (10/12/14); use var(--r-*) or justify it`));
    }
  }

  // NB: no "AI-purple hue" check. It is a good generic curb rule, but Steer's
  // whole domain is RGB controller LEDs: the violet/teal/amber data-accent
  // swatches, light-bar hues, and the accent-picker's rainbow conic-gradient are
  // all legitimate, AA-verified colour. A hue scan fires ~100% false here and
  // would only train the reader to ignore warnings. "No second accent / no
  // AI-purple mesh" stays a human reject-on-sight item in design-rules.md.
}

// ---- reporting -------------------------------------------------------------

const clip = (s) => (s.length > 72 ? s.slice(0, 69) + "..." : s);
const err = (file, line, msg) => ({ sev: "ERROR", file, line, msg });
const warn = (file, line, msg) => ({ sev: "WARN", file, line, msg });

function report(findings) {
  const errs = findings.filter((f) => f.sev === "ERROR");
  const warns = findings.filter((f) => f.sev === "WARN");
  const order = { ERROR: 0, WARN: 1 };
  for (const f of findings.sort((a, b) => order[a.sev] - order[b.sev] || a.file.localeCompare(b.file) || a.line - b.line)) {
    const tag = f.sev === "ERROR" ? "\x1b[31mERROR\x1b[0m" : "\x1b[33mWARN \x1b[0m";
    console.log(`${tag} ${f.file}:${f.line}  ${f.msg}`);
  }
  console.log(`\ncurb-check: ${errs.length} error(s), ${warns.length} warning(s).`);
  return errs.length;
}

// ---- self-test: every detector must bite on a known-bad fixture ------------

function selfTest() {
  const cases = [
    ["dash", () => { const f = []; copyChecks("x", 1, "one — two", f, "text"); return f.length; }],
    ["cliche", () => { const f = []; copyChecks("x", 1, "a seamless setup", f, "text"); return f.length; }],
    ["cliche-stem", () => { const f = []; copyChecks("x", 1, "works effortlessly", f, "text"); return f.length; }],
    ["emoji", () => { const f = []; copyChecks("x", 1, "ship it \u{1F680}", f, "text"); return f.filter(x => x.sev === "ERROR").length; }],
    ["forbidden-hex", () => { const f = []; cssChecks("x", "a{color:#0d6efd}", 0, f); return f.length; }],
    ["hex-in-comment-ok", () => { const f = []; cssChecks("x", "/* not #0d6efd here */\na{color:var(--blue)}", 0, f); return f.length === 0 ? 1 : 0; }],
    ["web-font", () => { const f = []; cssChecks("x", "h1{font-family:Inter,sans-serif}", 0, f); return f.length; }],
    ["radius-drift", () => { const f = []; cssChecks("x", "a{border-radius:16px}", 0, f); return f.length; }],
    ["radius-token-ok", () => { const f = []; cssChecks("x", "a{border-radius:var(--r-card)}", 0, f); return f.length === 0 ? 1 : 0; }],
    ["radius-svg-detail-ok", () => { const f = []; cssChecks("x", "a{border-radius:3px}", 0, f); return f.length === 0 ? 1 : 0; }],
    ["dash-marker-cell-ok", () => { const f = []; copyChecks("x", 1, "—", f, "text"); return f.length === 0 ? 1 : 0; }],
    ["clean-copy-ok", () => { const f = []; copyChecks("x", 1, "Plug in a controller and it works.", f, "text"); return f.length === 0 ? 1 : 0; }],
  ];
  let pass = 0;
  for (const [name, fn] of cases) {
    const ok = fn() > 0;
    console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}`);
    if (ok) pass++;
  }
  console.log(`\nself-test: ${pass}/${cases.length} detectors verified.`);
  return pass === cases.length ? 0 : 1;
}

// ---- main ------------------------------------------------------------------

if (process.argv.includes("--self-test")) {
  process.exit(selfTest());
}
const findings = [];
for (const f of HTML_FILES) if (existsSync(join(ROOT, f))) scanHtml(f, findings);
for (const f of CSS_FILES) if (existsSync(join(ROOT, f))) scanCss(f, findings);
process.exit(report(findings) > 0 ? 1 : 0);
