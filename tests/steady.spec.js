/* The demo must hold one height whatever it shows, or the page
   below it jumps while a visitor scrolls past: it is measured in every state
   and must not move by more than a pixel. */
import { expect, test } from "@playwright/test";
import { press, stubPad } from "./pad.js";

/* Each pad step waits a real frame; Linux WebKit runs about one a second. */
test.describe.configure({ timeout: 120_000 });

/** @param {import("@playwright/test").Page} page @param {string} sel */
const height = (page, sel) => page.$eval(sel, (el) => el.getBoundingClientRect().height);

for (const width of [1440, 375]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test.beforeEach(async ({ page }) => {
      /* Under automation the demo freezes on its still frame; the replay only
         runs for a browser that does not announce itself. */
      await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
      await stubPad(page);
      await page.goto("/play.html");
    });

    test("the demo band holds its height while it plays, and on the desk, ring, keyboard and help", async ({ page }) => {
      const band = "[data-steer-demo]";
      /** @type {Record<string, number>} */
      const seen = {};
      await page.locator(band).scrollIntoViewIfNeeded();   // it starts playing once in view
      await expect(page.locator("#sd-stop")).toBeVisible();
      for (let i = 0; i < 6; i++) {
        seen[`playing ${i}`] = await height(page, band);
        await page.waitForTimeout(700);
      }

      await press(page, "options");             // take over
      await expect(page.locator("#sd-stop")).toBeHidden();
      /* Where the loop stopped is luck: close whatever it left open, then
         require the bare desk before measuring it. */
      if (await page.locator("#sd-ring").isVisible()) await press(page, "circle");
      if (await page.locator("#sd-help").isVisible()) await press(page, "create");
      if (await page.locator("#sd-osk").isVisible()) await press(page, "r3");
      for (const id of ["#sd-osk", "#sd-ring", "#sd-help"]) await expect(page.locator(id)).toBeHidden();
      seen.desk = await height(page, band);

      await press(page, "l3");
      await expect(page.locator("#sd-ring")).toBeVisible();
      seen.ring = await height(page, band);
      await press(page, "circle");
      await expect(page.locator("#sd-ring")).toBeHidden();

      await press(page, "r3");
      await expect(page.locator("#sd-osk")).toBeVisible();
      seen.keyboard = await height(page, band);
      await press(page, "r3");

      await press(page, "create");
      await expect(page.locator("#sd-help")).toBeVisible();
      seen.help = await height(page, band);

      const base = seen.desk ?? 0;
      for (const [state, h] of Object.entries(seen)) {
        expect.soft(Math.abs(h - base), `${state} is ${h}px, the desk is ${base}px`).toBeLessThanOrEqual(1);
      }
    });
  });
}
