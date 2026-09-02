/* Proves the playable hero is wired, without a controller in the room.

   navigator.getGamepads is stubbed before the page's own script runs, so the
   hero drives a synthetic pad exactly as it would a real one. This reaches
   rung 4 of the ladder in docs/design-rules.md ("rendered, or executed") and */
import { mkdirSync, writeFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("the hero moves its pointer from gamepad axes, and clicks a tile", async ({ page }) => {
  await page.addInitScript(() => {
    /* Cast to any throughout: a synthetic pad is deliberately NOT a complete
       Gamepad (no timestamp, no vibrationActuator), and `npx tsc` in make ci
       checks this spec like any other source file. */
    const pad = /** @type {any} */ ({
      id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)",
      index: 0, connected: true, mapping: "standard",
      axes: [0, 0, 0, 0], buttons: [{ pressed: false, value: 0 }],
    });
    /** @type {any} */ (window).__pad = pad;
    navigator.getGamepads = () => [pad];
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/hero-lab.html");
  await page.waitForFunction(() => document.fonts.status === "loaded");

  const cursor = page.locator("#lv-cursor");
  const before = await cursor.evaluate((n) => n.style.left);

  // The name must lose its developer parenthetical.
  await expect(page.locator("#lv-status"))
    .toHaveText("DualSense Wireless Controller connected. Move the left stick.");

  // A resting stick inside the deadzone must not move the pointer at all.
  await page.evaluate(() => { /** @type {any} */ (window).__pad.axes[0] = 0.1; });
  await page.waitForTimeout(300);
  expect(await cursor.evaluate((n) => n.style.left)).toBe(before);

  // Push right: the pointer travels right.
  await page.evaluate(() => { /** @type {any} */ (window).__pad.axes[0] = 1; });
  await page.waitForTimeout(400);
  const moved = await cursor.evaluate((n) => parseFloat(n.style.left));
  expect(moved).toBeGreaterThan(parseFloat(before || "50"));

  /* Steer toward the tile's measured centre instead of guessing a duration.
     The open-loop version drove the pointer into the title bar, because travel
     depends on frame rate and the y clamp, and a fixed 700ms is only correct on
     the machine it was tuned on. */
  const target = await page.evaluate(() => {
    const s = /** @type {Element} */ (document.getElementById("lv-screen")).getBoundingClientRect();
    const t = /** @type {Element} */ (document.querySelector(".hl-tile")).getBoundingClientRect();
    return { fx: (t.left + t.width / 2 - s.left) / s.width,
             fy: (t.top + t.height / 2 - s.top) / s.height };
  });
  for (let i = 0; i < 60; i++) {
    const at = await page.evaluate(() => ({
      x: parseFloat(/** @type {HTMLElement} */ (document.getElementById("lv-cursor")).style.left) / 100,
      y: parseFloat(/** @type {HTMLElement} */ (document.getElementById("lv-cursor")).style.top) / 100,
    }));
    const dx = target.fx - at.x, dy = target.fy - at.y;
    if (Math.abs(dx) < 0.012 && Math.abs(dy) < 0.012) break;
    await page.evaluate(([sx, sy]) => {
      const w = /** @type {any} */ (window);
      w.__pad.axes[0] = sx; w.__pad.axes[1] = sy;
    }, [Math.abs(dx) < 0.012 ? 0 : Math.sign(dx), Math.abs(dy) < 0.012 ? 0 : Math.sign(dy)]);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.__pad.axes[0] = 0; w.__pad.axes[1] = 0;
  });
  await page.waitForTimeout(120);
  expect(await page.locator(".hl-tile.is-over").count()).toBe(1);
  await page.evaluate(() => { /** @type {any} */ (window).__pad.buttons[0].pressed = true; });
  await page.waitForTimeout(200);
  expect(await page.locator(".hl-tile.is-over").count()).toBeGreaterThan(0);
  expect(await page.locator(".hl-tile.is-down").count()).toBeGreaterThan(0);

  mkdirSync("scratch/lab", { recursive: true });
  const box = await page.locator(".hl-live").evaluate((n) => {
    n.scrollIntoView({ block: "start", behavior: "instant" });
    const r = n.getBoundingClientRect();
    return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height };
  });
  writeFileSync("scratch/lab/hl-live-driven.png",
    await page.screenshot({ clip: box, fullPage: true, animations: "allow", scale: "css" }));
});
