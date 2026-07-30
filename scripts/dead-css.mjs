#!/usr/bin/env node
/* Report CSS selectors that can never match, and how many bytes they cost.
 *
 *   node scripts/dead-css.mjs              every page
 *   node scripts/dead-css.mjs --page vs.html
 *   node scripts/dead-css.mjs --min 200    only rules over 200 bytes
 *
 * A rule is unreachable when it matches nothing on ANY page, after stripping
 * the states the page reaches by script rather than by markup. Getting that
 * exemption list wrong is how a tool like this deletes a hover style, so the
 * list is explicit and commented rather than clever.
 *
 * Dependency-free, same as curb-check.mjs and shots.mjs: it serves the repo
 * over http (external <use href="…svg#s"> is blocked on file://) and drives
 * Chrome's headless shell over CDP with Node's own WebSocket.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname } from "node:path";
import { homedir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const MIN = Number(flag("min", 0));

/* States the page enters through JS, not markup. A selector mentioning any of
   these is left alone: it is unreachable in a static snapshot by design. */
const RUNTIME = [
  ":hover", ":focus", ":active", ":focus-visible", ":focus-within", ":target",
  "::backdrop", "::selection", "::placeholder", "::-webkit", ":disabled", ":checked",
  ".on", ".still", ".booted", ".anim-halt", ".shots-open", ".accent-anim", ".zoomed",
  ".cur", "[open]", "[aria-pressed", "[aria-selected", "[aria-expanded", "[hidden",
  "data-pad", "data-accent", "data-theme", ".pd-", ".only-", ".lb-auto", ".rb-halt",
];

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".xml": "application/xml",
  ".txt": "text/plain", ".ico": "image/x-icon" };

function findChrome() {
  const cache = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  const paths = existsSync(cache)
    ? readdirSync(cache).flatMap((r) => ["arm64", "x64"].map((a) =>
        join(cache, r, `chrome-headless-shell-mac-${a}`, "chrome-headless-shell")))
    : [];
  paths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const hit = paths.find((p) => existsSync(p));
  if (!hit) { console.error("No Chrome found."); process.exit(2); }
  return hit;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = createServer((q, r) => {
  const rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const f = join(ROOT, rel);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404).end(); return; }
  r.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
  r.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const chrome = spawn(findChrome(), ["--headless", "--disable-gpu", "--remote-debugging-port=0", "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"] });
const reap = () => { try { chrome.kill(); } catch {} try { server.close(); } catch {} };
process.on("exit", reap);

let ws;
try {
  const ep = await new Promise((res, rej) => {
    let b = ""; const t = setTimeout(() => rej(new Error("no devtools endpoint")), 15000);
    chrome.stderr.on("data", (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
  });
  const target = (await (await fetch(new URL("/json/list", ep.replace(/^ws:/, "http:")).origin + "/json/list")).json()).find((t) => t.type === "page");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0; const pend = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); const p = pend.get(m.id); if (p) { pend.delete(m.id); p(m.result); } });
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((r) => pend.set(i, r)); };
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.value;
  await send("Page.enable"); await send("Runtime.enable");

  const pages = flag("page", null)
    ? [flag("page")]
    : readdirSync(ROOT).filter((f) => f.endsWith(".html") && !f.startsWith("_") && f !== "index.src.html");

  const matched = new Set();
  let sheet = null;
  for (const page of pages) {
    await send("Page.navigate", { url: `${origin}/${page}` });
    await sleep(1200);
    const res = await evaluate(`(() => {
      const out = [], seen = [];
      for (const s of document.styleSheets) {
        let rules; try { rules = s.cssRules } catch { continue }
        /* Since native nesting shipped, every CSSStyleRule carries a cssRules
           list of its own. It is empty on an ordinary rule but truthy, so
           "if (r.cssRules) recurse and continue" silently skips the entire
           stylesheet. Record the rule first, then recurse only when there is
           something to recurse into. */
        const walk = (list) => { for (const r of list) {
          if (r.selectorText) {
            seen.push([r.selectorText, r.cssText.length]);
            for (const sel of r.selectorText.split(',')) {
              /* querySelector returns null for any pseudo-element, so testing
                 ".faq summary::after" verbatim reports every ::before/::after
                 rule on the site as dead. Test the element it hangs off. */
              const probe = sel.trim().replace(/::[a-z-]+(\([^)]*\))?/g, '');
              try { if (document.querySelector(probe)) { out.push(r.selectorText); break } } catch { out.push(r.selectorText); break }
            }
          }
          if (r.cssRules && r.cssRules.length) walk(r.cssRules);
        }};
        walk(rules);
      }
      return { hit: out, all: seen };
    })()`);
    if (!res || !res.all) { console.error(`  ${page}: evaluate returned nothing`); continue; }
    res.hit.forEach((s) => matched.add(s));
    if (!sheet || res.all.length > sheet.length) sheet = res.all;
  }

  const runtime = (s) => RUNTIME.some((k) => s.includes(k));
  const dead = sheet.filter(([sel, len]) => !matched.has(sel) && !runtime(sel) && len >= MIN)
                    .sort((a, b) => b[1] - a[1]);
  const bytes = dead.reduce((n, [, l]) => n + l, 0);
  console.log(`${pages.length} page(s), ${sheet.length} rules`);
  for (const [sel, len] of dead) console.log(`  ${String(len).padStart(5)}B  ${sel.slice(0, 96)}`);
  console.log(`\n${dead.length} unreachable selector(s), ${(bytes / 1024).toFixed(1)} KB`);
  console.log("Runtime states are exempt; see RUNTIME in this file before deleting anything.");
} finally {
  try { ws?.close(); } catch {}
  reap();
}
