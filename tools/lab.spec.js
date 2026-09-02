/* Renders the hero-lab directions. Removes .still and forces .on: home.js
   freezes every animation under navigator.webdriver for deterministic
   screenshots, so without this the chain's 6.2s causation loop renders as a
   dead frame and cannot be judged at all. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";
const OUT = "scratch/lab";
const VARIANTS = ["hl-depth"];
for (const width of [1440, 375]) {
  test(`hero lab at ${width}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width, height: width < 500 ? 812 : 900 });
    await page.goto("/hero-lab.html");
    await page.waitForFunction(() => document.fonts.status === "loaded");
    await page.evaluate(() => {
      document.documentElement.classList.remove("still");
      document.querySelectorAll(".vg,.dgs,.lay-fig").forEach((e) => e.classList.add("on"));
    });
    /* Mid-loop, not at t=0: the chain parks its cursor away from the target at
       the start of the cycle, so t=0 is the least informative frame of the six. */
    await page.waitForTimeout(4200);
    for (const id of VARIANTS) {
      const el = page.locator(`.${id}`);
      const box = await el.evaluate((n) => {
        n.scrollIntoView({ block: "start", behavior: "instant" });
        const r = n.getBoundingClientRect();
        return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height };
      });
      writeFileSync(join(OUT, `${id}-${width}.png`),
        await page.screenshot({ clip: box, fullPage: true, animations: "allow", scale: "css" }));
    }
  });
}
