#!/usr/bin/env node
/* axe-core over every built page. The per-commit accessibility gate.
 *
 *   node scripts/axe-check.mjs              # every _site/*.html
 *   node scripts/axe-check.mjs index vs     # just these
 *
 * WHY NOT scripts/lighthouse. Lighthouse's accessibility category IS axe-core,
 * plus a page load, a trace, a category score and a JSON report per page. Over
 * the 14 pages in _site/ that measured 2m15s; this measures ~4s, because it
 * loads axe once into one browser and navigates. `make ci` finishes in seconds
 * and a two-minute step would simply stop being run. scripts/lighthouse stays
 * as the pre-deploy gate, where best-practices and SEO are also graded.
 *
 * WHY NOT @axe-core/cli or pa11y. Both drive a browser they bring themselves:
 * the cli wants chromedriver, pa11y failed to launch its bundled Chrome here,
 * and CI already installs chrome-headless-shell for scripts/shots.mjs. The
 * adopted part is axe-core, which is the engine either wrapper would have run;
 * the transport is the CDP-over-Node-WebSocket harness scripts/shots.mjs and
 * scripts/cssdiff.mjs already use, so this adds a dependency, not a toolchain.
 *
 * Scored against WCAG 2.0/2.1 A and AA, PLUS axe's best-practice set. The
 * second half is not optional garnish: heading-order and landmark-one-main are
 * tagged best-practice, not wcag, and between them they are eleven of the
 * fourteen pages' failures. A wcag-only tag list ran green over a deliberately
 * broken heading level. The union is a superset of what Lighthouse's
 * accessibility category weights, so a page that passes here passes there.
 *
 * Runs against its own in-process server rooted at _site/, so it needs no
 * container (the <use href="assets/svg/...#s"> symbols do need a server, which
 * is why file:// is not an option). BASE_URL points it at nginx instead.
 *
 * s.eval below is CDP Runtime.evaluate, not JS eval: it runs string literals
 * written in this file inside a browser this process spawned, pointed at a
 * loopback server serving this repo. No outside input reaches it.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = resolve(ROOT, "_site");
const AXE = readFileSync(resolve(ROOT, "node_modules/axe-core/axe.min.js"), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

if (!existsSync(SITE)) { console.error("no _site/ — run `make build` first"); process.exit(2); }

/* Globbed, not a hand-kept list: a page added to the repo is graded without
   anyone remembering to edit this file. Same rule as the Makefile's lint globs. */
const names = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const pages = (names.length ? names.map((n) => (n.endsWith(".html") ? n : `${n}.html`))
  : readdirSync(SITE).filter((f) => f.endsWith(".html"))).sort();

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [];
  const cache = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  if (existsSync(cache)) for (const rev of readdirSync(cache)) cands.push(
    join(cache, rev, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
    join(cache, rev, "chrome-headless-shell-mac-x64", "chrome-headless-shell"),
    join(cache, rev, "chrome-headless-shell-linux64", "chrome-headless-shell"));
  cands.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const hit = cands.find((p) => existsSync(p));
  if (!hit) { console.error("no chrome (set CHROME_PATH)"); process.exit(2); }
  return hit;
}

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".xml": "application/xml", ".txt": "text/plain", ".ico": "image/x-icon" };
const serve = () => new Promise((res) => {
  const s = createServer((req, rs) => {
    const rel = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/").replace(/^\/+/, "") || "index.html";
    const f = join(SITE, rel);
    if (!f.startsWith(SITE) || !existsSync(f)) { rs.writeHead(404).end(); return; }
    rs.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
    rs.end(readFileSync(f));
  });
  s.listen(0, "127.0.0.1", () => res(s));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); this.ev = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.method) { const w = this.ev.get(m.method); if (w) { this.ev.delete(m.method); w(m.params); } return; }
      const p = this.p.get(m.id); if (!p) return;
      this.p.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.p.set(id, { resolve: res, reject: rej })); }
  /* A fixed sleep after Page.navigate is not a wait: a slow page let axe run
     against the PREVIOUS document, and store-cards.html silently "passed" a
     rule og.html failed on identical markup. Arm the listener before issuing
     the navigate, or the event can land first. */
  once(method) { return new Promise((res) => this.ev.set(method, res)); }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result?.value;
  }
}

const chrome = spawn(findChrome(), ["--headless", "--disable-gpu", "--hide-scrollbars",
  "--no-first-run", "--no-sandbox", "--remote-debugging-port=0", "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"] });
const reap = () => { try { chrome.kill(); } catch {} };
process.on("exit", reap);
process.on("SIGINT", () => { reap(); process.exit(130); });

const server = process.env.BASE_URL ? null : await serve();
const base = process.env.BASE_URL || `http://127.0.0.1:${server.address().port}`;
let ws, failed = 0, total = 0;
try {
  const endpoint = await new Promise((res, rej) => {
    let buf = ""; const t = setTimeout(() => rej(new Error("no devtools endpoint")), 15000);
    chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(t); res(m[1]); } });
  });
  const origin = new URL(endpoint.replace(/^ws:/, "http:")).origin;
  const target = (await (await fetch(`${origin}/json/list`)).json()).find((t) => t.type === "page");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("attach failed")), { once: true }); });
  const s = new S(ws);
  await s.send("Page.enable"); await s.send("Runtime.enable");
  /* Re-inject axe on every navigation rather than eval-ing 550KB per page. */
  await s.send("Page.addScriptToEvaluateOnNewDocument", { source: AXE });
  /* 1440: the desktop layout is the one with the most on screen. axe's colour
     rules read painted pixels, so the width decides which nodes exist to grade. */
  await s.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  /* prefers-reduced-motion, and it is load-bearing, not politeness. header.nav
     transitions its background over 250ms when home.js's IntersectionObserver
     adds .nav-over-hero on load. axe sampled that backdrop MID-FADE and scored
     the nav toggle at 4.36:1 against a colour that exists for a quarter of a
     second and belongs to neither end state; the gate failed on four runs in
     six with nothing changed between them. shared.css already answers this:
     @media(prefers-reduced-motion:reduce) kills every transition, so the page
     is graded in a state it actually holds. A flaky gate gets switched off. */
  await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  console.log(`axe-core ${JSON.parse(readFileSync(resolve(ROOT, "node_modules/axe-core/package.json"), "utf8")).version} — ${TAGS.join(", ")} over ${pages.length} page(s)\n`);
  for (const page of pages) {
    const loaded = s.once("Page.loadEventFired");
    await s.send("Page.navigate", { url: `${base}/${page}` });
    await loaded;
    await sleep(120);   // let the theme-init and nav scripts settle before axe reads the tree
    /* Both themes. The colour rules are the half of axe that depends on what is
       painted, the site ships two palettes, and the original run of this gate
       reported its link contrast in dark-theme hexes. Re-running axe after
       flipping the attribute costs one call, not a page load. */
    const found = [];
    for (const theme of ["light", "dark"]) {
      await s.eval(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
      const r = await s.eval(`axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(TAGS)} },
        resultTypes: ["violations"], reporter: "v1" }).then(r => JSON.stringify(r.violations.map(v =>
          ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ t: n.target.join(" "), f: n.failureSummary })) }))))`);
      for (const v of JSON.parse(r)) found.push({ ...v, theme });
    }
    total += found.reduce((n, v) => n + v.nodes.length, 0);
    if (!found.length) { console.log(`  [ ok ] ${page}`); continue; }
    failed++;
    console.log(`  [FAIL] ${page}`);
    for (const v of found) {
      console.log(`         ${v.id} (${v.impact}, ${v.theme}, ${v.nodes.length} node${v.nodes.length > 1 ? "s" : ""}): ${v.help}`);
      for (const n of v.nodes) {
        console.log(`           ${n.t}`);
        if (n.f) console.log(`             ${String(n.f).replace(/\s+/g, " ").slice(0, 160)}`);
      }
    }
  }
} finally {
  try { ws?.close(); } catch {}
  try { server?.close(); } catch {}
  reap();
}

if (failed) {
  console.log(`\naxe gate FAILED: ${total} violation(s) on ${failed} page(s).`);
  process.exit(1);
}
console.log(`\naxe gate passed (${pages.length} pages, 0 violations).`);
