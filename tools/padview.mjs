/* Renders ONE hero-pad-*.svg standalone, with the gradient defs and --pa-*
   tokens it needs, so a candidate drawing can be looked at without building the
   site. Two pad-art sessions judged their output through a viewer that supplied
   neither, so every candidate came out flat grey and the real question -- does
   this read as the controller -- was never asked. */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, basename, resolve } from "node:path";

const [svgPath, outPath, padArg] = process.argv.slice(2);
if (!svgPath || !outPath) {
  console.error("usage: node tools/padview.mjs <pad.svg> <out.png> [ps|xb|sw|mf]");
  process.exit(2);
}
const pad = padArg || (basename(svgPath).match(/hero-pad-(\w+)/)?.[1] ?? "ps");

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const svg = readFileSync(svgPath, "utf8");
const defs = readFileSync(`${ROOT}/src/_includes/art/hero-defs.svg`, "utf8");
const heroCss = readFileSync(`${ROOT}/src/styles/bands/hero.css`, "utf8");

/* The token block lives in the .chero rule and its per-pad overrides. Lifting
   the declarations verbatim keeps this viewer honest: it cannot drift into a
   prettier palette than the page ships. */
const tokens = [...heroCss.matchAll(/--pa-[a-z0-9-]+\s*:\s*[^;]+;/g)].map((m) => m[0]).join("\n");

/* The leader rules, lifted the same way and for a sharper reason: the page sets
   `.ann polyline{fill:none}`, and a polyline without it fills black. Omitting
   them made every pad render a black wedge across its grip, which two redraws
   then went hunting for as a defect in the drawing. An instrument that invents
   the flaw it is used to find is worse than no instrument. */
const annRules = [...heroCss.matchAll(/^\.chero \.ann [a-z]+\{[^}]+\}$/gm)]
  .map((m) => m[0].replace(/^\.chero /, "")).join("\n");
const letters = JSON.parse(readFileSync(`${ROOT}/src/_data/pads.json`, "utf8")).pads[pad]?.letters ?? {};

/* The letter positions from pads.json, drawn as crosshairs. A drawing that is
   correct in isolation but whose buttons are not under these is still wrong:
   that is exactly how the traced Xbox shipped its letters beside its buttons. */
const marks = Object.entries(letters).map(([role, l]) =>
  `<g class="reg"><circle cx="${l.x}" cy="${l.y}" r="3"/>` +
  `<text x="${l.x + 7}" y="${l.y + 4}">${l.letter} ${role}</text></g>`).join("");

const html = `<style>
  :root{color-scheme:dark;${tokens}--line:rgba(233,237,246,0.17);--ink-2:#98A1B5}
  ${annRules}
  body{margin:0;background:radial-gradient(120% 90% at 50% 0%,#131B2C 0%,#070A12 70%);
       display:grid;gap:18px;place-items:center;padding:26px;font:11px ui-monospace}
  .frame{width:960px}
  svg{width:100%;height:auto;display:block}
  .lab{color:#7A8398;letter-spacing:.14em;text-transform:uppercase}
  .reg circle{fill:none;stroke:#FF3B6B;stroke-width:1.5}
  .reg text{fill:#FF3B6B;font:9px ui-monospace}
  .off .reg{display:none}
</style>
<div class="lab">${basename(svgPath)} &middot; pad ${pad} &middot; 960px, as the hero draws it</div>
<div class="frame off">${defs}${svg}</div>
<div class="lab">with pads.json letter anchors overlaid</div>
<div class="frame">${svg.replace(/<\/svg>\s*$/, `${marks}</svg>`)}</div>`;

mkdirSync(dirname(resolve(outPath)), { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1020, height: 900 }, deviceScaleFactor: 2 });
await p.setContent(html, { waitUntil: "load" });
await p.waitForTimeout(300);
/* Fail loud rather than writing a blank: a defs id the drawing references but
   hero-defs.svg does not define renders as untouched fill, which looks like a
   deliberately flat style instead of a broken reference. */
const missing = await p.evaluate(() => {
  const ids = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
  return [...new Set([...document.querySelectorAll("*")].flatMap((e) =>
    ["fill", "stroke", "clip-path", "filter"].map((a) => e.getAttribute(a))
      .filter((v) => v?.startsWith("url(#")).map((v) => v.slice(5, -1))))]
    .filter((id) => !ids.has(id));
});
writeFileSync(outPath, await p.screenshot({ fullPage: true }));
await b.close();
console.log(`${outPath}${missing.length ? `\nMISSING DEFS (these render flat): ${missing.join(", ")}` : ""}`);
if (missing.length) process.exit(1);
