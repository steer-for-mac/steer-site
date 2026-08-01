/* The homepage's `{% if home %}` block: the script tag and the gallery dialog.
   An async filter inside the included band once rendered empty and took the
   rest of that block with it -- no JS on the homepage, build exit 0, every
   other gate green, because nothing asserted the block was there at all. */
import { expect, test } from "@playwright/test";

test("the homepage loads its behaviour and carries the gallery", async ({ page }) => {
  const missing = [];
  page.on("requestfailed", (r) => missing.push(r.url()));
  await page.goto("/index.html");

  await expect(page.locator("script[src='home.js']")).toHaveCount(1);
  await expect(page.locator("#shotsDialog")).toHaveCount(1);
  await expect(page.locator("#shotsOpen")).toBeVisible();
  /* Every slide resolves to a built file, not the source png the transform
     never saw: the attributes are what the gallery hydrates into src. */
  const slides = await page.locator("#shotsDialog img[data-light]").all();
  expect(slides.length).toBeGreaterThan(0);
  for (const s of slides) {
    expect(await s.getAttribute("data-light")).toMatch(/^\/img\/.+\.webp$/);
    expect(await s.getAttribute("data-dark")).toMatch(/^\/img\/.+\.webp$/);
  }
  expect(missing, "no request failed").toEqual([]);
});
