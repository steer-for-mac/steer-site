/* Drive a headless Chrome over CDP against a local server rooted at _site/.
 *
 * Extracted at the third copy, not the second: scripts/cssdiff.mjs and
 * scripts/shots.mjs each grew their own findChrome/serve/session, and by the
 * time scripts/theme-check.mjs and scripts/pad-check.mjs wanted the same three
 * things the duplication was the thing most likely to rot. Those two use this;
 * cssdiff and shots still carry their own copies and can be moved over when
 * something needs changing in them, which is cheaper than a flag day across
 * four gates that are currently green.
 *
 * `session.eval` is CDP Runtime.evaluate, NOT JavaScript eval. It ships a string
 * written in this repo to a browser this process spawned, pointed at a loopback
 * server serving this repo's own _site/. No caller-supplied or network input
 * reaches it.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SITE = resolve(ROOT, "_site");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [];
  const cache = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  if (existsSync(cache)) for (const rev of readdirSync(cache)) cands.push(
    join(cache, rev, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
    join(cache, rev, "chrome-headless-shell-mac-x64", "chrome-headless-shell"));
  cands.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const hit = cands.find((p) => existsSync(p));
  if (!hit) { console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  return hit;
}

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".xml": "application/xml", ".txt": "text/plain", ".ico": "image/x-icon" };

/* Rooted at _site/ and path-checked: the <use href="assets/svg/...#s"> symbols
   are blocked over file://, so these gates cannot just open the file. */
export const serveSite = () => new Promise((res) => {
  const s = createServer((req, rs) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
    const f = join(SITE, rel);
    if (!f.startsWith(SITE) || !existsSync(f)) { rs.writeHead(404).end(); return; }
    rs.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
    rs.end(readFileSync(f));
  });
  s.listen(0, "127.0.0.1", () => res(s));
});

class Session {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.p = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data); const p = this.p.get(m.id); if (!p) return;
      this.p.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.p.set(id, { resolve: res, reject: rej }));
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result?.value;
  }
}

/* Returns { session, url, close }. url() builds an address for a page in _site/. */
export async function launch(extraArgs = []) {
  const chrome = spawn(findChrome(), ["--headless", "--disable-gpu", "--hide-scrollbars",
    "--no-first-run", "--remote-debugging-port=0", ...extraArgs, "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] });
  const reap = () => { try { chrome.kill(); } catch { /* already gone */ } };
  process.on("exit", reap);
  process.on("SIGINT", () => { reap(); process.exit(130); });

  const server = await serveSite();
  const endpoint = await new Promise((res, rej) => {
    let buf = ""; const t = setTimeout(() => rej(new Error("no devtools endpoint")), 15000);
    chrome.stderr.on("data", (d) => {
      buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(t); res(m[1]); }
    });
  });
  const origin = new URL(endpoint.replace(/^ws:/, "http:")).origin;
  const target = (await (await fetch(`${origin}/json/list`)).json()).find((t) => t.type === "page");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("attach failed")), { once: true });
  });
  const session = new Session(ws);
  await session.send("Page.enable"); await session.send("Runtime.enable");
  const port = server.address().port;
  return {
    session,
    url: (page) => `http://127.0.0.1:${port}/${page}`,
    close: () => { try { ws.close(); } catch { /* already closed */ } server.close(); reap(); },
  };
}

/* Shared assertion reporter, so every gate here reads the same in CI output. */
export function reporter() {
  let pass = 0, fail = 0;
  const ok = (name, got, want) => {
    const good = JSON.stringify(got) === JSON.stringify(want);
    good ? pass++ : fail++;
    console.log(`${good ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}`);
    if (!good) console.log(`       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`);
  };
  const done = (label) => {
    console.log(`\n${label}: ${pass} passed, ${fail} failed.`);
    process.exit(fail ? 1 : 0);
  };
  return { ok, done };
}
