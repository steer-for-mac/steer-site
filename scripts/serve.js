#!/usr/bin/env bun
/* Static server for the Playwright gates, and the one justified exception to
   the "serve it through nginx" rule in docs/design-rules.md -- a gate has to be
   self-contained. Bun's `dir` route is the runtime's own sendfile path, so this
   is NOT the stdlib server playwright.config.js used to warn about; the bar for
   replacing it again is `make e2e` green, all projects, fullyParallel. */
import { existsSync } from "node:fs";

/* Both arguments required rather than defaulted: playwright.config.js owns the
   port and passing it twice is how the two copies drift. */
const [dir, port] = process.argv.slice(2);
if (!dir || !port) throw new Error("usage: serve.js <dir> <port>");

// A missing dir 404s per request instead of throwing, which reaches Playwright
// as a 60s webServer timeout rather than an error naming the directory.
if (!existsSync(dir)) throw new Error(`no such directory: ${dir} (cwd ${process.cwd()})`);

const server = Bun.serve({
  port: Number(port),
  hostname: "127.0.0.1",
  routes: { "/*": { dir } },
});

console.log(`${server.url} -> ${dir}`);
