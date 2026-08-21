// The server is scripts/serve.js; the backlog scar that used to live here
// moved with it. Do not drop WebKit: the popover menu was unclosable in Safari
// while every Chromium test passed.

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // axe reads the computed cascade and the accessibility tree, so a second
    // engine reports the same violation twice rather than finding new ones.
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /a11y\.spec\.js/ },
  ],

  webServer: {
    command: `bun scripts/serve.js dist ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
