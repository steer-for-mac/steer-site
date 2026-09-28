/* The demo's controller is a photo of the pad in hand that lights what is held
   (macros/pad-photo.njk, scripts/pad-photo.js). The Gamepad API is stubbed; a
   press takes the demo over from its replay, so every check below reads the
   state a real pad drives. */
import { expect, test } from "@playwright/test";
import { hold, stick, stubPad } from "./pad.js";

test.describe.configure({ timeout: 120_000 });

/** @param {import("@playwright/test").Page} page @param {string} [id] a pad's Gamepad API id */
async function open(page, id) {
  await stubPad(page);
  if (id) await page.addInitScript((i) => { /** @type {any} */ (window).__pad.id = i; }, id);
  await page.goto("/play.html");
}
const XBOX = "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)";
const lit = (page, fam) => page.locator(`.pp-f[data-fam="${fam}"] path.is-on`);

test("every family has an outline for each control Steer binds", async ({ page }) => {
  await open(page);
  for (const c of ["cross", "circle", "square", "triangle", "l1", "r1", "ls", "rs",
    "up", "down", "left", "right", "create", "options", "home"]) {
    await expect(page.locator(`.pp .pad-controls path[data-c="${c}"]`)).toHaveCount(3);
  }
});

test("a held button lights on the pad shown and goes out on release", async ({ page }) => {
  await open(page);
  await hold(page, "cross", true);
  await expect(page.locator(".pp")).toHaveAttribute("data-fam", "ps");
  await expect(lit(page, "ps")).toHaveAttribute("data-c", "cross");
  await hold(page, "cross", false);
  await expect(lit(page, "ps")).toHaveCount(0);
});

test("the photo follows the pad that takes over", async ({ page }) => {
  await open(page, XBOX);
  await hold(page, "cross", true);
  await expect(page.locator(".pp")).toHaveAttribute("data-fam", "xb");
  await expect(page.locator('.pp-f[data-fam="xb"] img')).toBeVisible();
  await expect(page.locator('.pp-f[data-fam="ps"] img')).toBeHidden();
});

test("a trigger fills its pill as far as it is pulled, and its layer colours the light bar", async ({ page }) => {
  await open(page);
  await hold(page, "cross", true);
  await hold(page, "cross", false);
  await page.evaluate(() => { /** @type {any} */ (window).__pad.buttons[7] = { pressed: true, touched: true, value: 0.6 }; });
  await expect(page.locator('.pp-f[data-fam="ps"] .pp-t[data-t="r2"]')).toHaveAttribute("style", /--v: ?0\.6/);
  const lb = () => page.locator(".pp").evaluate((e) => /** @type {HTMLElement} */ (e).style.getPropertyValue("--pp-lb"));
  await expect.poll(lb).toBe("rgb(160,80,255)");
  await page.evaluate(() => { /** @type {any} */ (window).__pad.buttons[7] = { pressed: false, touched: false, value: 0 }; });
  await hold(page, "l1", true);
  await expect.poll(lb).toBe("rgb(255,165,0)");
  await hold(page, "l1", false);
  await expect.poll(lb).toBe("rgb(0,91,255)");
});

test("a tilted stick slides its cap over a black hole, and centring it brings the cap back", async ({ page }) => {
  await open(page);
  await hold(page, "cross", true);
  await hold(page, "cross", false);
  const cap = page.locator('.pp-f[data-fam="ps"] g:has(> path[data-c="rs"])');
  const hole = page.locator('.pp-f[data-fam="ps"] .pp-hole').nth(1);
  await stick(page, [0, 0, 1, 0]);
  await expect(cap).toHaveAttribute("transform", /^translate\([1-9]/);
  await expect(hole).toHaveCSS("opacity", "1");
  await stick(page, [0, 0, 0, 0]);
  await expect(cap).toHaveAttribute("transform", "translate(0 0)");
  await expect(hole).toHaveCSS("opacity", "0");
});

test("a diagonal lights the Elite's corner zone alone", async ({ page }) => {
  await open(page, XBOX);
  await hold(page, "up", true);
  await hold(page, "right", true);
  await expect(lit(page, "xb")).toHaveAttribute("data-c", "up-right");
  await expect(lit(page, "xb")).toHaveCount(1);
  await hold(page, "up", false);
  await expect(lit(page, "xb")).toHaveAttribute("data-c", "right");
});

test("a diagonal lights both arms of a cross d-pad", async ({ page }) => {
  await open(page);
  await hold(page, "up", true);
  await hold(page, "right", true);
  await expect(lit(page, "ps")).toHaveCount(2);
});
