/* The homepage (round 13): the couplet, three places, a stranger's
   questions, the form twice. The `{% if home %}` block once rendered empty
   with every other gate green, hence the script and dialog checks. */
import { expect, test } from "@playwright/test";

test("the homepage loads its behaviour, and the nav CTA opens the launch list", async ({ page }) => {
  const missing = [];
  page.on("requestfailed", (r) => { if (!r.url().endsWith(".mp4")) missing.push(r.url()); });
  await page.goto("/index.html");
  await expect(page.locator("script[src='home.js']")).toHaveCount(1);
  await expect(page.locator("meta[name='robots']")).toHaveCount(0);
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", "https://steer.seanfloyd.dev/");
  /* Every CTA falls back to #pricing, so the anchor has to hold the form. */
  await expect(page.locator("#pricing form.ml-form")).toHaveCount(1);
  const dialog = page.locator("#mlDialog");
  await expect(dialog).toBeHidden();
  /* Beside the hero's own form the nav button steps aside, then returns. */
  await expect(page.locator(".nav a[data-ml]")).toBeHidden();
  await page.locator("#q-setup").scrollIntoViewIfNeeded();
  await page.locator(".nav a[data-ml]").click();
  await expect(dialog).toBeVisible();
  expect(missing, "no request failed").toEqual([]);
});

test("the first screen has the couplet, a working form and three pinned places", async ({ page }) => {
  await page.goto("/index.html?from=hn");
  await expect(page.locator("h1")).toHaveText("Your keyboard is over there. Your controller is right here.");
  await expect(page.locator(".hero form.ml-form input[type=email]")).toBeVisible();
  const places = page.locator(".places figure");
  await expect(places).toHaveCount(3);
  for (const fig of await places.all()) {
    await expect(fig.locator(".pin.there")).toHaveText("over there");
    await expect(fig.locator(".pin.here")).toHaveText("right here");
  }
  /* Both forms post, and carry the link's source tag. */
  const forms = page.locator("main form.ml-form");
  await expect(forms).toHaveCount(2);
  await expect(page.locator("main form.ml-form input[name=from]")).toHaveCount(2);
  await expect(page.locator(".ml-from").first()).toHaveValue("hn");
});

test("each question is a heading, and every app picture has both themes", async ({ page }) => {
  await page.goto("/index.html");
  for (const q of ["Can I really type with a controller?", "Is it fiddly to set up?", "Will it work with my apps?",
    "Will my controller work?", "Is it safe?", "Why not a free remapper?", "How much is it?"]) {
    await expect(page.getByRole("heading", { name: q })).toHaveCount(1);
  }
  await expect(page.locator(".cards .crop")).toHaveCount(4);
  await expect(page.locator("main img.h-lt")).toHaveCount(5);
  await expect(page.locator("main img.h-dk")).toHaveCount(5);
  await expect(page.locator(".c-help img.h-lt")).toBeVisible();
  await expect(page.locator(".c-help img.h-dk")).toBeHidden();
});

test("every loop has a pause control, and it pauses", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
  await page.goto("/index.html");
  await expect(page.locator("figure:has(video[data-loop])").first()).toBeAttached();
  await expect(page.locator("figure:has(video[data-loop]):not(:has(.ctl))")).toHaveCount(0);
  const loops = page.locator("video[data-loop]");
  const btn = page.locator(".q-type .ctl");
  await btn.scrollIntoViewIfNeeded();
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute("aria-label", /^(Pause|Play) Steer's split keyboard/);
  /* WebKit builds without H.264 refuse to play; the control then says Play. */
  const video = loops.first();
  await expect.poll(() => video.evaluate((v) => !(/** @type {HTMLVideoElement} */ (v).paused))).toBe(true).catch(() => {});
  if (await btn.textContent() === "Pause") {
    await btn.click();
    await expect(btn).toHaveText("Play");
    expect(await video.evaluate((v) => /** @type {HTMLVideoElement} */ (v).paused)).toBe(true);
  }
});

test("the keyboard loop follows the theme, keeps a Pause across it, and fetches only its own take", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
  const fetched = [];
  page.on("request", (r) => { if (r.url().includes("/loops/keyboard-")) fetched.push(r.url()); });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/index.html");
  const video = page.locator(".q-type video[data-loop]");
  const btn = page.locator(".q-type .ctl");
  await btn.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("src", /keyboard-light\.mp4$/);
  const paused = () => video.evaluate((v) => /** @type {HTMLVideoElement} */ (v).paused);
  /* WebKit builds without H.264 refuse to play; the control then says Play. */
  await expect.poll(async () => !(await paused())).toBe(true).catch(() => {});
  if (await btn.textContent() === "Pause") await btn.click();
  await expect(btn).toHaveText("Play");
  expect(fetched.filter((u) => u.includes("keyboard-dark")), "light fetched nothing of the dark take").toEqual([]);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(video).toHaveAttribute("src", /keyboard-dark\.mp4$/);
  await page.waitForTimeout(400);
  expect(await paused(), "the dark take stays paused").toBe(true);
  await expect(btn).toHaveText("Play");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(video).toHaveAttribute("src", /keyboard-light\.mp4$/);
  await page.waitForTimeout(400);
  expect(await paused()).toBe(true);
  await expect(btn).toHaveText("Play");
});

test("a dark first visit fetches no light take", async ({ page }) => {
  const fetched = [];
  page.on("request", (r) => { if (r.url().includes("/loops/keyboard-light")) fetched.push(r.url()); });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/index.html");
  await page.locator(".q-type .ctl").scrollIntoViewIfNeeded();
  await expect(page.locator(".q-type video[data-loop]")).toHaveAttribute("src", /keyboard-dark\.mp4$/);
  await page.waitForTimeout(500);
  expect(fetched).toEqual([]);
});

test.describe("under reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("nothing moves by itself and everything shows", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
    await page.goto("/index.html");
    await expect(page.locator("#hero")).not.toHaveClass(/drawing/);
    await expect(page.locator("html")).not.toHaveClass(/arm/);
    const btn = page.locator(".q-type .ctl");
    await btn.scrollIntoViewIfNeeded();
    await expect(btn).toHaveText("Play");
    await page.waitForTimeout(500);
    expect(await page.locator("video[data-loop]").first().evaluate((v) => /** @type {HTMLVideoElement} */ (v).paused)).toBe(true);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the page reads, the drawings show, and the form posts", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("h1 .pain")).toHaveText("Your keyboard is over there.");
    await expect(page.locator(".sofa img")).toBeVisible();
    const form = page.locator("#pricing form.ml-form");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", /steer-mailing-list/);
  });
});
