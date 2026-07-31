#!/usr/bin/env node
/* Dump getComputedStyle for every element on index.html, across the gates the
 * page hides behind attributes, so a cascade change that a screenshot cannot
 * show (an off-screen band, a hover-only rule, a pad the shot never selects)
 * still turns up as a text diff.
 *
 *   node scratch/cssdiff.mjs scratch/css-before.json
 *
 * Same transport as scripts/shots.mjs: CDP over Node's own WebSocket, own
 * in-process static server, rooted at _site/ (the <use href=...svg#s> symbols
 * need one).
 *
 * s.eval below is CDP Runtime.evaluate, not JS eval: it runs string literals
 * written in this file inside a browser this process spawned, pointed at a
 * loopback server serving this repo. No outside input reaches it.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* the built site, not the working tree: index.html only exists in _site/ */
const SITE = resolve(ROOT, "_site");
const OUT = process.argv[2] || "scratch/css-dump.json";

/* width x theme x pad. 861 sits either side of the nav breakpoint that
   shared.css uses to undo the over-hero link colour. */
const CASES = [];
for (const width of [1440, 900, 860, 375]) {
  for (const theme of ["light", "dark"]) {
    for (const pad of ["ps", "xb", "sw", "mf"]) {
      if (pad !== "ps" && width !== 1440) continue;   // pads only at 1440
      if (theme === "dark" && ![1440, 375].includes(width)) continue;
      CASES.push({ width, theme, pad });
    }
  }
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [];
  const cache = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  if (existsSync(cache)) for (const rev of readdirSync(cache)) cands.push(
    join(cache, rev, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
    join(cache, rev, "chrome-headless-shell-mac-x64", "chrome-headless-shell"));
  cands.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const hit = cands.find((p) => existsSync(p));
  if (!hit) { console.error("no chrome"); process.exit(2); }
  return hit;
}

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".xml": "application/xml", ".txt": "text/plain", ".ico": "image/x-icon" };
const serve = () => new Promise((res) => {
  const s = createServer((req, rs) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
    const f = join(SITE, rel);
    if (!f.startsWith(SITE) || !existsSync(f)) { rs.writeHead(404).end(); return; }
    rs.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
    rs.end(readFileSync(f));
  });
  s.listen(0, "127.0.0.1", () => res(s));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data); const p = this.p.get(m.id); if (!p) return;
      this.p.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.p.set(id, { resolve: res, reject: rej })); }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result?.value;
  }
}

const chrome = spawn(findChrome(), ["--headless", "--disable-gpu", "--hide-scrollbars",
  "--no-first-run", "--remote-debugging-port=0", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const reap = () => { try { chrome.kill(); } catch {} };
process.on("exit", reap);
process.on("SIGINT", () => { reap(); process.exit(130); });

const server = await serve();
let ws;
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
  const url = `http://127.0.0.1:${server.address().port}/index.html`;

  const dump = {};
  for (const { width, theme, pad } of CASES) {
    await s.send("Emulation.setDeviceMetricsOverride", { width, height: width < 500 ? 812 : 900, deviceScaleFactor: 1, mobile: width < 500 });
    await s.send("Page.navigate", { url });
    await sleep(900);
    await s.eval(`(()=>{const t=document.querySelector('.tab[data-pad="${pad}"]');if(t)t.click();
                   document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)});})()`);
    /* the IntersectionObserver only adds .on to what has been scrolled past;
       force it everywhere so vignette rules are exercised in every case */
    await s.eval(`document.querySelectorAll('.vg,.dgs,.lay-fig').forEach(e=>e.classList.add('on'))`);
    await sleep(350);
    const rows = await s.eval(`(() => {
      const els = [...document.querySelectorAll('*')];
      const out = [];
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
        const cs = getComputedStyle(el);
        const props = [];
        for (let k = 0; k < cs.length; k++) { const n = cs[k]; props.push(n + ':' + cs.getPropertyValue(n)); }
        const r = el.getBoundingClientRect();
        out.push(i + '|' + el.tagName + '.' + (el.getAttribute('class') || '') +
          '|' + [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100).join(',') +
          '|' + props.join(';'));
      }
      return out;
    })()`);
    dump[`${width}-${theme}-${pad}`] = rows;
    console.log(`${width} ${theme} ${pad}: ${rows.length} elements`);
  }
  mkdirSync(dirname(resolve(ROOT, OUT)), { recursive: true });
  writeFileSync(resolve(ROOT, OUT), JSON.stringify(dump));
  console.log(`wrote ${OUT}`);
} finally {
  try { ws?.close(); } catch {}
  try { server.close(); } catch {}
  reap();
}
