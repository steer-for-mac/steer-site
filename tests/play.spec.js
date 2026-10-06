/* The demo (bands/play/demo.html), driven through a stubbed standard-mapping
   DualSense, judged on what Steer's defaults say a press does. It opens on the
   still frame: the split keyboard over Notes with "Hello, Mac" typed. */
import { expect, test } from "@playwright/test";
import { press, stick, stubPad } from "./pad.js";

/* Each pad step waits a real frame; Linux WebKit runs about one a second. */
test.describe.configure({ timeout: 120_000 });

test.beforeEach(({ page }) => stubPad(page));

test.describe("play.html", () => {
  test.beforeEach(({ page }) => page.goto("/play.html").then(() => {}));

  test("R3 closes the keyboard, L3 opens your apps, east lights Music, Circle cancels", async ({ page }) => {
    await expect(page.locator("#sd-osk")).toBeVisible();
    await press(page, "r3");
    await expect(page.locator("#sd-osk")).toBeHidden();

    const ring = page.locator("#sd-ring");
    await press(page, "l3");
    await expect(ring).toBeVisible();
    await expect(ring.locator(".sd-item")).toHaveCount(9);
    await expect(ring.locator(".sd-item").first()).toContainText("Safari");

    await stick(page, [0.95, 0, 0, 0]);
    await expect(ring.locator(".sd-item.on")).toContainText("Music");
    await stick(page, [0, 0, 0, 0]);
    await press(page, "circle");
    await expect(ring).toBeHidden();
  });

  test("each stick aims at its half and the triggers type", async ({ page }) => {
    const field = page.locator("#sd-field");
    await expect(field).toHaveText("Hello, Mac");
    await expect(page.locator(".sd-key.lit")).toHaveText(["fL2", "jR2"]);

    await stick(page, [0, 0, 0.95, 0]);       // right stick east: J to K
    await stick(page, [0, 0, 0, 0]);
    await press(page, "r2");
    await expect(field).toHaveText("Hello, Mack");

    await press(page, "l2");                  // the left cursor is still on F
    await expect(field).toHaveText("Hello, Mackf");
    await press(page, "square");
    await expect(field).toHaveText("Hello, Mack");
  });

  test("Create shows the help card, Options makes it a table, Create closes it", async ({ page }) => {
    await press(page, "r3");
    const help = page.locator("#sd-help");
    await press(page, "create");
    await expect(help).toBeVisible();
    await press(page, "options");
    await expect(page.locator("#sd-helptable")).toBeVisible();
    await press(page, "create");
    await expect(help).toBeHidden();
  });

  test("the launch form is on the page a shared link lands on", async ({ page }) => {
    await expect(page.locator(".py-join form.ml-form input[type=email]")).toBeVisible();
  });
});

test.describe("when nobody is driving", () => {
  test("it plays itself, and any press hands it over", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
    await page.goto("/play.html");
    const stop = page.locator("#sd-stop");
    await expect(stop).toBeVisible();
    await expect(page.locator("#sd-field")).toContainText("hel", { timeout: 15_000 });
    await expect(page.locator("#sd-ghost")).toHaveClass(/on/);

    await press(page, "options");             // the press stops the loop, and still counts
    await expect(page.locator("#sd-ghost")).not.toHaveClass(/on/);
    await expect(stop).toBeHidden();
  });

  test("under reduced motion it stays on the still frame", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
    await page.goto("/play.html");
    await page.waitForTimeout(2000);
    await expect(page.locator("#sd-field")).toHaveText("Hello, Mac");
    await expect(page.locator("#sd-stop")).toBeHidden();
  });
});

/* The same band, embedded in the homepage. */
test("the homepage's demo opens your apps", async ({ page }) => {
  await page.goto("/index.html");
  await press(page, "r3");
  await press(page, "l3");
  await expect(page.locator("#sd-ring")).toBeVisible();
  await press(page, "circle");
  await expect(page.locator("#sd-ring")).toBeHidden();
});
