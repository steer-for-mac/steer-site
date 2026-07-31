/* Outside the suite's testDir on purpose: these write files for a person to
   look at and assert nothing, so the gate must never pick them up. */
import { devices } from "@playwright/test";
import base from "./playwright.config.js";

export default {
  ...base,
  testDir: "tools",
  workers: 1,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
};
