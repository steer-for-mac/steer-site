#!/usr/bin/env node
/* Behavioural test for the three-state theme toggle. make ci proves the page
 * builds, validates and grades; it never presses the button. This does.
 *
 *   node scratch/theme-test.mjs
 *
 * Same transport as scripts/cssdiff.mjs -- CDP over Node's own WebSocket, own
 * in-process server rooted at _site/. Build first; a stale _site/ tests a page
 * that no longer exists in the working tree.
 *
 * Emulation.setEmulatedMedia is the only honest way to test "follows the OS":
 * it changes what prefers-color-scheme reports to the live page, which is
 * exactly the event the matchMedia listener exists to catch.
 *
 * s.eval below is CDP Runtime.evaluate, not JS eval -- same note as
 * scripts/cssdiff.mjs carries. It runs string literals written in this file
 * inside a browser this process spawned, pointed at a loopback server serving
 * this repo's own _site/. No outside input reaches it.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = resolve(ROOT, "_site");

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
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
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
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result?.value;
  }
}

let pass = 0, fail = 0;
const ok = (name, got, want) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  good ? pass++ : fail++;
  console.log(`${good ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}`);
  if (!good) console.log(`       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`);
};

const chrome = spawn(findChrome(), ["--headless", "--disable-gpu", "--no-first-run",
  "--remote-debugging-port=0", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const reap = () => { try { chrome.kill(); } catch {} };
process.on("exit", reap);

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

  const state = `(()=>{const r=document.documentElement,t=document.getElementById('themeToggle');
    const vis=n=>{const e=t&&t.querySelector('.'+n);return !!e&&getComputedStyle(e).display!=='none';};
    let st=null;try{st=localStorage.getItem('steer-theme');}catch(e){}
    return {pref:r.getAttribute('data-theme-pref'),theme:r.getAttribute('data-theme'),
            stored:st,label:t&&t.getAttribute('aria-label'),
            glyph:['auto','sun','moon'].filter(vis)};})()`;
  const click = `document.getElementById('themeToggle').click()`;

  /* Sub-page AND homepage: the toggle used to be two implementations, so the
     regression this guards against is precisely one page behaving differently. */
  for (const page of ["features.html", "index.html"]) {
    const url = `http://127.0.0.1:${server.address().port}/${page}`;
    const tag = page.replace(".html", "");

    // A visitor who has never chosen, on a dark Mac.
    await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    await s.send("Page.navigate", { url });
    await sleep(500);
    await s.eval(`try{localStorage.removeItem('steer-theme')}catch(e){}`);
    await s.send("Page.navigate", { url });
    await sleep(500);
    let st = await s.eval(state);
    ok(`${tag}: first visit follows the OS`, [st.pref, st.theme, st.stored, st.glyph], ["system", "dark", null, ["auto"]]);
    ok(`${tag}: label says what pressing does`, st.label, "Theme: System, activate for Light");

    // System -> Light -> Dark -> System, one press at a time.
    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: press 1 forces Light`, [st.pref, st.theme, st.stored, st.glyph], ["light", "light", "light", ["sun"]]);
    ok(`${tag}: label updates`, st.label, "Theme: Light, activate for Dark");

    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: press 2 forces Dark`, [st.pref, st.theme, st.stored, st.glyph], ["dark", "dark", "dark", ["moon"]]);

    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: press 3 RETURNS to System and clears the key`, [st.pref, st.theme, st.stored, st.glyph], ["system", "dark", null, ["auto"]]);

    // The whole point: while on System, an OS change must land live.
    await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await sleep(120); st = await s.eval(state);
    ok(`${tag}: OS flip repaints while on System`, [st.pref, st.theme], ["system", "light"]);

    // ...and must NOT, once a side is forced.
    await s.eval(click); await sleep(60);                       // -> light (forced)
    await s.eval(click); await sleep(60);                       // -> dark (forced)
    await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await sleep(120); st = await s.eval(state);
    ok(`${tag}: forced Dark ignores the OS`, [st.pref, st.theme, st.stored], ["dark", "dark", "dark"]);

    // A forced choice survives navigation, which is the reason for localStorage.
    /* The label is asserted HERE and not only on first load. On first load the
       expected string is byte-identical to the one hard-coded in nav.html, so
       that assertion passes whether or not the script ever writes it -- deleting
       the load-time apply() still scored 18/18 until this line existed. After a
       reload carrying a forced preference the two differ, which is the only
       place the write is actually observable. */
    await s.send("Page.navigate", { url });
    await sleep(400); st = await s.eval(state);
    ok(`${tag}: forced choice survives reload`, [st.pref, st.theme, st.glyph, st.label],
       ["dark", "dark", ["moon"], "Theme: Dark, activate for System"]);

    /* A value outside light|dark used to become the state: data-theme="SYSTEM"
       matched no rule, the label read "Theme: undefined", and the first click
       wrote the string "undefined" into storage, killing the only control that
       could recover it. Nothing in this repo writes such a value, so this guards
       the guard rather than a live path. */
    await s.eval(`try{localStorage.setItem('steer-theme','SYSTEM')}catch(e){}`);
    await s.send("Page.navigate", { url });
    await sleep(400); st = await s.eval(state);
    ok(`${tag}: a junk stored value falls back to System`, [st.pref, st.theme, st.label],
       ["system", "light", "Theme: System, activate for Light"]);
    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: and the control still works after one`, [st.pref, st.stored], ["light", "light"]);
  }
} finally {
  try { ws?.close(); } catch {}
  server.close(); reap();
}
console.log(`\ntheme: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
