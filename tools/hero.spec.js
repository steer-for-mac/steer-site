/* Renders ONE hero direction from its own page. Replaces re-rendering seven
   lab variants to look at one: HERO=capture picks src/hero-<name>.html. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";
const NAME = process.env.HERO || "capture";
const OUT = "scratch/hero";
for (const width of [1440, 375]) {
  test(`hero ${NAME} at ${width}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width, height: width < 500 ? 812 : 900 });
    await page.goto(`/hero-${NAME}.html`);
    await page.waitForFunction(() => document.fonts.status === "loaded");
    await page.waitForFunction(() => document.querySelectorAll("img").length === 0
      || [...document.images].every((i) => i.complete));
    /* The hero band fades .stage in from opacity 0 with a delayed entrance
       animation. Waiting only on fonts screenshots the pad mid-fade, which
       reads as "the art is broken" rather than "the shot was early" -- it cost
       one wrong diagnosis already. Settle every running animation instead of
       guessing a duration. */
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => {
      /* finish() throws InvalidStateError on an infinite effect, and the light
         bar's breathe loop is infinite by design. Skip those: they have no end
         state to settle to, and the frame is valid at any point in the cycle. */
      try { a.finish(); } catch { return null; }
      return a.finished.catch(() => {});
    })));
    writeFileSync(join(OUT, `${NAME}-${width}.png`), await page.screenshot({ scale: "css" }));
  });
}
