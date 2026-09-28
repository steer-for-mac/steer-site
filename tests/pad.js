/* A stubbed standard-mapping DualSense for pages driven by the Gamepad API,
   which no headless browser has. The test sets its buttons and axes. */

/** @typedef {import("@playwright/test").Page} Page */

export const IDX = ["cross", "circle", "square", "triangle", "l1", "r1", "l2", "r2",
  "create", "options", "l3", "r3", "up", "down", "left", "right", "home", "touchpad"];

/** @param {Page} page */
export const stubPad = (page) => page.addInitScript(() => {
  const w = /** @type {any} */ (window);
  w.__pad = {
    id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)",
    index: 0, connected: true, mapping: "standard", timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })),
  };
  navigator.getGamepads = () => [w.__pad, null, null, null];
});

/** @param {Page} page @param {string} name @param {boolean} down */
export const hold = (page, name, down) => page.evaluate(([i, d]) => {
  /** @type {any} */ (window).__pad.buttons[i] = { pressed: d, touched: d, value: d ? 1 : 0 };
}, /** @type {[number, boolean]} */ ([IDX.indexOf(name), down]));

/* Held across several animation frames so the page's poll cannot miss it. */
/** @param {Page} page @param {string} name */
export async function press(page, name) {
  await hold(page, name, true);
  await page.waitForTimeout(100);
  await hold(page, name, false);
  await page.waitForTimeout(100);
}

/** @param {Page} page @param {number[]} axes */
export const stick = (page, axes) => page.evaluate((a) => { /** @type {any} */ (window).__pad.axes = a; }, axes);

/* L1 held, R3 pressed: Steer's default chord for the on-screen keyboard. */
/** @param {Page} page */
export async function chordKeyboard(page) {
  await hold(page, "l1", true);
  await page.waitForTimeout(80);
  await press(page, "r3");
  await hold(page, "l1", false);
}
