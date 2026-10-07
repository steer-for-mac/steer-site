/* The sub-pages after the October 2026 app redesign: each app picture has
   both themes, and the app's retired words stay retired
   (steer/docs/2026-10-02-plain-language.md). */
import { expect, test } from "@playwright/test";

for (const { path, pictures } of [{ path: "features.html", pictures: 7 }, { path: "accessibility.html", pictures: 1 }]) {
  test(`${path}: every app picture has a light and a dark capture`, async ({ page }) => {
    await page.goto(`/${path}`);
    await expect(page.locator("main img.h-lt")).toHaveCount(pictures);
    await expect(page.locator("main img.h-dk")).toHaveCount(pictures);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await expect(page.locator("main img.h-lt").first()).toBeHidden();
    await expect(page.locator("main img.h-dk").first()).toBeVisible();
  });
}

const RETIRED = [/pinned overlay/i, /settings pane/i, /Sticks pane/i, /needs Rectangle/i, /Always-on/i, /\bMail\b.*setups?/i, /35 languages/i];
for (const path of ["features.html", "trust.html", "accessibility.html", "agents.html", "vs.html", "support.html"]) {
  test(`${path}: no retired names`, async ({ page }) => {
    await page.goto(`/${path}`);
    const text = await page.locator("main").innerText();
    for (const word of RETIRED) expect(text, String(word)).not.toMatch(word);
  });
}
