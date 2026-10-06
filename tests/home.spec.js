/* The homepage's `{% if home %}` block: the script tag and the launch dialog.
   An async filter inside an included band once rendered empty and took the
   rest of that block with it -- no JS on the homepage, build exit 0, every
   other gate green, because nothing asserted the block was there at all. */
import { expect, test } from "@playwright/test";

test("the homepage loads its behaviour, and the nav CTA opens the launch list", async ({ page }) => {
  const missing = [];
  page.on("requestfailed", (r) => missing.push(r.url()));
  await page.goto("/index.html");

  await expect(page.locator("script[src='home.js']")).toHaveCount(1);
  await expect(page.locator("meta[name='robots']")).toHaveCount(0);
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", "https://steer.seanfloyd.dev/");
  /* Every CTA falls back to #pricing, so the anchor has to exist and hold the form. */
  await expect(page.locator("#pricing form.ml-form")).toHaveCount(1);

  const dialog = page.locator("#mlDialog");
  await expect(dialog).toBeHidden();
  await page.locator(".nav a[data-ml]").click();
  await expect(dialog).toBeVisible();
  expect(missing, "no request failed").toEqual([]);
});

/* What the October 2026 homepage promises (docs/design/2026-10-06-site-system-design.md). */
test("the first screen has the promise, a working form and the demo", async ({ page }) => {
  await page.goto("/index.html?from=hn");
  const hero = page.locator(".h-hero");
  await expect(hero.locator("h1")).toHaveText("Hand it a controller.");
  await expect(hero.locator("form.ml-form input[type=email]")).toBeVisible();
  await expect(hero.locator(".sd[data-steer-demo]")).toHaveCount(1);
  /* Every sign-up carries the link's source tag. */
  await expect(page.locator(".ml-from").first()).toHaveValue("hn");
  await expect(page.locator("main form.ml-form")).toHaveCount(2);
});

test("every app picture has a light and a dark capture, and only the theme's shows", async ({ page }) => {
  await page.goto("/index.html");
  const lt = page.locator(".h-does img.h-lt"), dk = page.locator(".h-does img.h-dk");
  await expect(lt).toHaveCount(6);
  await expect(dk).toHaveCount(6);
  await expect(lt.first()).toBeVisible();
  await expect(dk.first()).toBeHidden();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("the visitor can send the page to their Mac", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("[data-share]")).toBeVisible();
  });
});

test("on a desktop the send-to-Mac button is on the page but hidden", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator("[data-share]")).toHaveCount(1);
  await expect(page.locator("[data-share]")).toBeHidden();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the page reads, the demo shows its still frame, and the form posts", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator(".h-hero h1")).toHaveText("Hand it a controller.");
    await expect(page.locator("#sd-field")).toHaveText(/Hello, Mac/);
    const form = page.locator("#pricing form.ml-form");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", /steer-mailing-list/);
  });
});
