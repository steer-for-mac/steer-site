/* The homepage's proof surfaces: the recording with its chapter chips, and the
   grid of captures. Each claim these make is a file that has to exist in both
   themes and a time that has to fall inside the take; a chip pointing past the
   end, or a dark twin that 404s, ships silently otherwise. */
import { expect, test } from "@playwright/test";

test("the chapter chips fall inside the take and seek it", async ({ page }) => {
  await page.goto("/index.html");
  const video = page.locator(".lg-video");
  await expect(video).toHaveCount(1);
  const duration = await video.evaluate((el) => new Promise((resolve) => {
    const v = /** @type {HTMLVideoElement} */ (el);
    if (v.readyState >= 1) return resolve(v.duration);
    v.addEventListener("loadedmetadata", () => resolve(v.duration), { once: true });
    v.load();
  }));
  expect(duration).toBeGreaterThan(10);

  const chips = page.locator(".lg-chapter");
  const times = await chips.evaluateAll((els) =>
    els.map((e) => parseFloat(/** @type {HTMLElement} */ (e).dataset.t ?? "")));
  expect(times.length).toBeGreaterThanOrEqual(3);
  expect(times[0]).toBe(0);
  for (let i = 1; i < times.length; i++) expect(times[i] ?? NaN).toBeGreaterThan(times[i - 1] ?? NaN);
  const last = times[times.length - 1] ?? NaN;
  expect(last).toBeLessThan(duration - 1);

  /* A click lands the playhead on the chip's time and marks it current. */
  const chip = chips.last();
  await chip.click();
  await expect(chip).toHaveAttribute("aria-current", "true");
  const t = await video.evaluate((el) => /** @type {HTMLVideoElement} */ (el).currentTime);
  expect(Math.abs(t - last)).toBeLessThan(1.5);
});

test("every capture in the grid resolves, in both themes", async ({ page, request }) => {
  await page.goto("/index.html");
  const imgs = page.locator(".lg-thumb img");
  expect(await imgs.count()).toBe(12);
  const srcs = await imgs.evaluateAll((els) => els.map((e) => {
    const i = /** @type {HTMLImageElement} */ (e);
    return i.currentSrc || i.src;
  }));
  for (const src of srcs) {
    expect(src, "a built image, not a source png").toMatch(/\/img\/.+\.(avif|webp|png)$/);
    const r = await request.get(src);
    expect(r.status(), src).toBe(200);
  }
  /* Six named surfaces, each with a light and a dark file. */
  const names = await page.locator(".lg-grid h3").allTextContents();
  expect(names).toEqual(["On-Screen Keyboard", "Radial Menu", "Help Overlay", "Menu bar", "Import review", "Presets"]);
});
