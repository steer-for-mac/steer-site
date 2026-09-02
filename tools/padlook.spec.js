/* Look at the pads. The curb's own ladder puts "rendered, or executed" above
   "the symbol exists"; every judgement about this art has to start here.
   Writes scratch/pads/<pad>-<theme>.png at 2x. Asserts nothing. */
import { mkdirSync } from "node:fs";
import { test } from "@playwright/test";

const OUT = "scratch/pads";
const PADS = ["ps", "xb", "sw", "mf"];

for (const theme of ["light", "dark"]) {
  test(`pad plates, ${theme}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/index.html");
    await page.waitForFunction(() => document.fonts.status === "loaded");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);

    for (const pad of PADS) {
      /* the label, not the attribute: setPad dispatches `steerpad`, and the
         glyph/copy swaps listen for it (tools/shots.spec.js records this) */
      await page.locator(`label[for="hp-${pad}"]`).click();
      await page.waitForTimeout(400);
      const plate = page.locator(`.plate:visible`).first();
      await plate.screenshot({ path: `${OUT}/${pad}-${theme}.png`, scale: "device" });
    }
  });
}
