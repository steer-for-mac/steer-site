#!/usr/bin/env node
/* Section screenshots, so "does it look bland" stops being a matter of memory.
 *
 * The curb (docs/design-rules.md) ends with by-eye checks: renders with JS off,
 * renders under reduced motion, no horizontal overflow at 375/768/1440.
 * curb-check.mjs mechanized the copy rules; this mechanizes the looking.
 *
 *   node scripts/shots.mjs                          every section, 1440 and 375
 *   node scripts/shots.mjs --only feel,pricing      just those
 *   node scripts/shots.mjs --pad xb --theme dark    drive the gates
 *   node scripts/shots.mjs --page vs.html --out scratch/shots/vs
 *
 * Exits non-zero on horizontal overflow, an unknown --only name, or a run that
 * captured nothing, so it can gate a commit the way curb-check.mjs does.
 *
 * Dependency-free on purpose, the same way curb-check.mjs is: it speaks CDP to
 * Chrome's headless shell over the WebSocket that ships in Node itself. No
 * puppeteer, no npm install, no lockfile to rot.
 *
 * Each frame is clipped to the section's own box rather than to a viewport, so
 * a band that grew taller does not silently crop; and the page is scrolled to
 * the section first, so the IntersectionObserver has fired and the vignettes
 * are captured mid-loop rather than in their static frame.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* Built output, not the working tree: the page is assembled by Eleventy and
   the sheets by Lightning CSS, so the repo root has no index.html to serve. */
const SITE = resolve(ROOT, "_site");

/* Selector per frame, in scroll order. */
const SECTIONS = [
  ["hero", ".chero"],
  ["padstrip", ".padstrip"],
  ["numstrip", ".numstrip"],
  ["uses", "#uses"],
  ["feel", "#feel"],
  ["capabilities", "#capabilities"],
  ["trust", "#trust"],
  ["pricing", "#pricing"],
];

const VIEWPORTS = [1440, 375];
const OVERFLOW_WIDTHS = [1440, 768, 375];

function findChrome() {
  /* CHROME_PATH first, because in the CI container the browser is at
     /usr/bin/chromium and none of the host paths below exist. */
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [];
  const cache = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  if (existsSync(cache)) {
    for (const rev of readdirSync(cache)) {
      candidates.push(
        join(cache, rev, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
        join(cache, rev, "chrome-headless-shell-mac-x64", "chrome-headless-shell"),
      );
    }
  }
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) die("No Chrome found. `npx @puppeteer/browsers install chrome-headless-shell@stable`");
  return hit;
}

const die = (msg) => {
  console.error(msg);
  process.exit(2);
};

const argv = process.argv.slice(2);
/* A trailing `--only` used to hand `undefined` to .split(); a missing value is
   a typo, not a request for the default. */
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) die(`--${name} needs a value`);
  return v;
};
const only = flag("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const pad = flag("pad", "");
const theme = flag("theme", "");
const page = flag("page", "index.html");
const outDir = resolve(ROOT, flag("out", "scratch/shots"));

const known = new Set(SECTIONS.map(([n]) => n));
const unknown = only.filter((n) => !known.has(n));
if (unknown.length) die(`--only: no such section: ${unknown.join(", ")}\nknown: ${[...known].join(", ")}`);

/* BASE_URL points the checks at an already-running server (make up), so CI
   exercises the same nginx that production behaviour comes from: try_files,
   extensionless URLs, real MIME types. Unset, each script serves the repo
   itself, which keeps a bare `node scripts/shots.mjs` self-contained. */
const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "") || null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The SVG symbols live in assets/svg/ and are pulled in with
   <use href="…svg#s">, which browsers refuse to resolve over file://. So the
   renderer serves _site/ in-process rather than pointing
   Chrome at a path. Same reason a gate that rendered file:// would silently
   show every pad missing. */
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".xml": "application/xml", ".txt": "text/plain", ".ico": "image/x-icon" };
function serveRepo() {
  const server = createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/").replace(/^\/+/, "") || "index.html";
    const file = join(SITE, rel);
    if (!file.startsWith(SITE) || !existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  /* Not JS eval: this is CDP Runtime.evaluate, running literals we wrote inside
     a browser we spawned ourselves, pointed at a local file. No outside input. */
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  }
}

/* Port 0 lets the OS pick a free one and Chrome prints it. Guessing a port
   meant a leftover browser on the same number got driven instead of the one we
   spawned, and then killed the innocent child while the hijacked one lived on. */
const chrome = spawn(findChrome(), [
  "--headless",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--remote-debugging-port=0",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

/* Any throw below still has to take the browser with it, or the next run finds
   an orphan holding a port and four child processes. */
const reap = () => { try { chrome.kill(); } catch {} };
process.on("exit", reap);
process.on("SIGINT", () => { reap(); process.exit(130); });

let ws;
const httpServer = BASE_URL ? null : await serveRepo();
try {
  const endpoint = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("Chrome never printed a DevTools endpoint")), 15000);
    chrome.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    chrome.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Chrome exited (${code})`)); });
  });

  /* The endpoint Chrome prints is the browser target; the origin it sits on is
     what /json/list answers, and that is guaranteed to be the process we just
     spawned because it chose the port itself. */
  const origin = new URL(endpoint.replace(/^ws:/, "http:")).origin;
  const target = (await (await fetch(`${origin}/json/list`)).json()).find((t) => t.type === "page");
  if (!target) throw new Error("Chrome came up with no page target");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("could not attach to the page target")), { once: true });
  });
  const s = new Session(ws);

  await s.send("Page.enable");
  await s.send("Runtime.enable");

  mkdirSync(outDir, { recursive: true });
  const origin_ = BASE_URL || `http://127.0.0.1:${httpServer.address().port}`;
  const url = `${origin_}/${page}`;
  const wanted = SECTIONS.filter(([name]) => !only.length || only.includes(name));
  let count = 0;

  /* Page.navigate resets the DOM, so the gates have to be re-applied after
     every one of them. The overflow pass used to skip this and silently
     measured the default pad in light theme however the flags were set. */
  const load = async (width, height) => {
    await s.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await s.send("Page.navigate", { url });
    await sleep(900);
    /* click the real picker: the label/glyph swap listens for the `steerpad`
       event that setPad dispatches, so setting the attribute alone moves the
       CSS-only .pd-* gates and leaves every [data-ps] label on PlayStation.
       label[for], not .tab[data-pad] -- the picker is native radios and .tab is
       the <label>.
       The attribute fallback is GONE on purpose. It set html[data-pad] while
       leaving .chero[data-pad] alone, and the hero plate and .only-* swaps gate
       on the latter, so a failed lookup rendered a frame that was half Xbox and
       half PlayStation -- less useful than either, and it returned a false
       nobody read. Fail loudly instead. */
    if (pad) await s.eval(`(() => { const t = document.querySelector('label[for="hp-' + ${JSON.stringify(pad)} + '"]'); if (!t) throw new Error('no picker label for pad ' + ${JSON.stringify(pad)}); t.click(); })()`);
    if (theme) await s.eval(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
    if (pad || theme) await sleep(200);
  };

  for (const width of VIEWPORTS) {
    await load(width, width < 500 ? 812 : 900);
    for (const [name, selector] of wanted) {
      const box = await s.eval(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        /* instant, both of them: site.css sets scroll-behavior:smooth, so the
           scrollIntoView is animated and a scrollBy on the next line computes
           its target from the still-at-zero offset, retargets to -70, clamps to
           0 and cancels the scroll outright. Every frame was shot at the top of
           the page with the IntersectionObserver never having fired. */
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
        /* the sticky nav paints at the viewport top, which is exactly where a
           block:'start' scroll parks the section, so it landed inside the clip
           and covered the first 52px of every frame. Drop the section clear. */
        window.scrollBy({ top: -70, behavior: 'instant' });
        const r = el.getBoundingClientRect();
        return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height };
      })()`);
      if (!box) { console.warn(`  ${name}: no ${selector} on this page`); continue; }
      await sleep(700); /* let the IntersectionObserver loops start */
      const { data } = await s.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { ...box, scale: 1 },
      });
      writeFileSync(join(outDir, `${name}-${width}.png`), Buffer.from(data, "base64"));
      count++;
    }
  }

  /* Horizontal overflow is a gate in the curb, so it fails the run rather than
     printing a line someone has to notice. */
  let overflowed = false;
  for (const width of OVERFLOW_WIDTHS) {
    await load(width, 900);
    const over = await s.eval("document.documentElement.scrollWidth - innerWidth");
    if (over > 0) {
      console.error(`  ERROR overflow at ${width}px: ${over}px`);
      overflowed = true;
    }
  }

  console.log(`${count} frames → ${outDir}`);
  if (!count) die("captured nothing");
  if (overflowed) process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  try { httpServer?.close(); } catch {}
  reap();
}
