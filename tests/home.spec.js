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
