/* The nav spans the homepage's grid on every page, so its edge lines up with
   the content of any page built on that grid. Sean, 2026-10-06: the bar read
   weaker than the page under it and stopped short of its edges. */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

for (const path of ["index.html", "features.html", "support.html"]) {
  test(`${path}: the nav sits on the 1392px grid`, async ({ page }) => {
    await page.goto(`/${path}`);
    const box = await page.locator(".nav .brand").boundingBox();
    expect(box?.x).toBe((1440 - 1392) / 2 + 24);
  });
}

test("the nav lines up with the homepage's first heading", async ({ page }) => {
  await page.goto("/index.html");
  const brand = await page.locator(".nav .brand").boundingBox();
  const h1 = await page.locator("h1").boundingBox();
  expect(brand?.x).toBe(h1?.x);
});

test("Pricing lands on the homepage's cost question", async ({ page }) => {
  await page.goto("/features.html");
  const href = await page.locator(".nav-links a", { hasText: "Pricing" }).getAttribute("href");
  expect(href).toBe("index.html#q-cost");
  await page.goto(`/${href}`);
  await expect(page.locator("#q-cost")).toContainText("What does it cost?");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the menu opens from the keyboard and marks the current page", async ({ page, browserName }) => {
    await page.goto("/features.html");
    const links = page.locator(".nav-links");
    await expect(links).toBeHidden();
    await page.locator(".nav-toggle").focus();
    await page.keyboard.press("Enter");
    await expect(links).toBeVisible();
    await expect(links.locator("a")).toHaveText(["Features", "Controllers", "Compare", "Accessibility", "Pricing"]);
    await expect(links.locator("a[aria-current=page]")).toHaveText("Features");
    /* WebKit's Tab skips links unless the user opts in, as Safari does. */
    if (browserName === "chromium") {
      await page.keyboard.press("Tab");
      await expect(links.locator("a").first()).toBeFocused();
    }
  });
});
