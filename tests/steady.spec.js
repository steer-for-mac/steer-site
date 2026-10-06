/* The homepage's two stateful bands must hold one height whatever state they
   are in, or the page below them jumps while a visitor scrolls past. The demo
   changes its side pane with every mode and overlay; the per-app band swaps
   panels with legends of different lengths, and relabels them for three
   controllers whose chips differ in width. Each band is measured in every
   state and must not move by more than a pixel. */
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
      await page.goto("/index.html");
    });

    test("the demo band holds its height while it plays, and on the desk, ring, keyboard and help", async ({ page }) => {
      const band = ".l2-demo";
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
      if (await page.locator("#sd-osk").isVisible()) await press(page, "r3");
      await expect(page.locator("#sd-osk")).toBeHidden();
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

    test("the per-app band holds its height on every tab", async ({ page }) => {
      const band = ".l2-apps";
      const tabs = page.locator('.pa-tabs [role="tab"]');
      await expect(tabs.first()).toBeVisible();
      const base = await height(page, band);
      const n = await tabs.count();
      expect(n).toBeGreaterThan(1);
      /* The row scrolls sideways on a phone and never up and down. */
      const row = await page.$eval(".pa-tabs", (el) => [el.scrollHeight, el.clientHeight]);
      expect.soft(row[0], "the tab row overflows vertically").toBe(row[1]);
      for (let i = 0; i < n; i++) {
        await tabs.nth(i).click();
        await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
        const h = await height(page, band);
        expect.soft(Math.abs(h - base), `${await tabs.nth(i).textContent()} is ${h}px, the first tab is ${base}px`).toBeLessThanOrEqual(1);
      }
    });
    test("the per-app band holds its height for every controller on every tab", async ({ page }) => {
      const band = ".l2-apps";
      const tabs = page.locator('.pa-tabs [role="tab"]');
      await expect(tabs.first()).toBeVisible();
      const base = await height(page, band);
      for (const fam of ["xb", "sw", "ps"]) {
        await page.locator(`label[for="pa-pad-${fam}"]`).filter({ visible: true }).click();
        for (let i = 0; i < await tabs.count(); i++) {
          await tabs.nth(i).click();
          const h = await height(page, band);
          expect.soft(Math.abs(h - base), `${fam}, ${await tabs.nth(i).textContent()}: ${h}px against ${base}px`).toBeLessThanOrEqual(1);
        }
      }
    });
  });
}
