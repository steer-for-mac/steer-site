// Do not swap `serve` for a stdlib server: a listen backlog of 5 drops requests
// under parallel workers, and it surfaces as a wrong assertion, not an error.
// Do not drop WebKit: the popover menu was unclosable in Safari while every
// Chromium test passed.

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
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

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
