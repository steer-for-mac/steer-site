/* play.html is driven by a controller, which no headless browser has. So the
   Gamepad API is stubbed with a standard-mapping DualSense whose buttons and
   axes the test sets, and the page is judged on what Steer's defaults say a
   press does: L3 opens the app ring, L1 + R3 opens the keyboard, and a face
   button types the letter in its slot (DaisyWheelLayout: north cluster is
   b c d a in [N, E, S, W], so north + Square is "a"). */
import { expect, test } from "@playwright/test";
import { chordKeyboard, press, stick, stubPad } from "./pad.js";

/* Each pad step waits a real frame; Linux WebKit runs about one a second. */
test.describe.configure({ timeout: 120_000 });

test.beforeEach(({ page }) => stubPad(page));

test.describe("play.html", () => {
test.beforeEach(({ page }) => page.goto("/play.html").then(() => {}));

test("a pad takes over, L3 opens the app ring and Circle cancels it", async ({ page }) => {
  const ring = page.locator("#pyRing");
  await expect(ring).toBeHidden();
  await press(page, "l3");
  await expect(page.locator("#pyModeText")).toHaveText("DualSense Wireless Controller");
  await expect(ring).toBeVisible();
  await expect(ring.locator(".py-item")).toHaveCount(9);
  await expect(ring.locator(".py-item").first()).toHaveText("Safari");

  /* Aim east: the band centred on Music, third clockwise from Safari. */
  await stick(page, [0.95, 0, 0, 0]);
  await expect(ring.locator(".py-item.is-aim")).toHaveText("Music");
  await stick(page, [0, 0, 0, 0]);
  await press(page, "circle");
  await expect(ring).toBeHidden();
});

test("L1 + R3 opens the keyboard and a face button types its letter", async ({ page }) => {
  const text = page.locator("#pyText");
  /* Options is Mission Control: a job only the Mac can do, so taking over
     with it changes nothing on the desk. */
  await press(page, "options");             // take over; the still frame's sentence clears
  await expect(text).toHaveValue("");

  await chordKeyboard(page);
  await expect(page.locator("#pyOsk")).toBeVisible();

  await stick(page, [0, -0.95, 0, 0]);      // north: b c d a
  await page.waitForTimeout(80);
  await press(page, "square");
  await expect(text).toHaveValue("a");

  await stick(page, [0.7, -0.7, 0, 0]);     // north-east: f g h e, Cross is south
  await page.waitForTimeout(80);
  await press(page, "cross");
  await expect(text).toHaveValue("ah");

  /* In the dead zone a face press types nothing (DaisyWheel.commitKey). */
  await stick(page, [0, 0, 0, 0]);
  await page.waitForTimeout(80);
  await press(page, "cross");
  await expect(text).toHaveValue("ah");

  /* The first real press is what earns the call to action. */
  await expect(page.locator(".py-cta-go")).toBeVisible();
});
});

/* The same markup and script, embedded as a band of the homepage. */
test("the homepage's demo band opens the ring and types a letter", async ({ page }) => {
  await page.goto("/index.html");
  const ring = page.locator(".l2-demo #pyRing");
  await press(page, "l3");
  await expect(ring).toBeVisible();
  await stick(page, [0.95, 0, 0, 0]);
  await expect(ring.locator(".py-item.is-aim")).toHaveText("Music");
  await expect(page.locator("#pyRingName")).toHaveText("Music");
  await stick(page, [0, 0, 0, 0]);
  await press(page, "circle");
  await expect(ring).toBeHidden();

  await chordKeyboard(page);
  await expect(page.locator(".l2-demo #pyOsk")).toBeVisible();
  await stick(page, [0, -0.95, 0, 0]);
  await page.waitForTimeout(80);
  await press(page, "square");
  await expect(page.locator("#pyText")).toHaveValue("a");
});
