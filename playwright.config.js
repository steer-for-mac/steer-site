// End-to-end config. These tests replaced ~410 lines of hand-rolled CDP
// driving: scripts/theme-check.mjs, scripts/pad-check.mjs and the
// scripts/lib/cdp.mjs harness they shared, plus scripts/pngdiff.mjs, which had
// no callers at all. Every one of those was reimplementing something shipped
// here -- browser discovery and lifecycle, a runner, assertions with retry,
// prefers-color-scheme emulation, screenshot diffing.
//
// The one thing Playwright does not bring is a static server. `python3 -m
// http.server` was the first choice, being stdlib and dependency-free, and it
// is measurably not up to this: socketserver's listen backlog is 5, so six
// parallel workers each pulling a 15MB homepage got ERR_CONNECTION_RESET on
// site.css, home.css and home.js, and three of six loads never ran home.js at
// all. That does not fail loudly -- it fails as a wrong assertion about the
// page. Capping workers to 1 would have hidden it rather than fixed it.
// `serve` is Vercel's, 4M downloads a week, and holds up.
//
// `make up` is not usable here: that serves through nginx in Docker, which is
// right for a production-shaped check and wrong for a test that must start in a
// second and run on a machine with no Docker.
//
// Chromium only, deliberately. These assert behaviour the platform owns
// (radio-group arrow keys, prefers-color-scheme change events), not rendering,
// so a second engine would buy repetition rather than coverage. The rendering
// checks that WOULD justify one still live in scripts/shots.mjs.

import { defineConfig, devices } from "@playwright/test";

const PORT = 8393;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,          // nothing here is timing-dependent; a retry would hide it if it were
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Serves _site/, not the working tree: <use href="assets/svg/...#s"> is
  // blocked over file://, and the built page is what ships.
  webServer: {
    command: `npx serve --listen tcp://127.0.0.1:${PORT} --no-clipboard _site`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
