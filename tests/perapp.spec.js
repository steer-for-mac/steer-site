/* The homepage's per-app band: the controller switcher swaps the photo and
   relabels every chip to that family's names, and the default follows the
   pad the demo saw. The names are pad-family.js's; these are the few that
   differ by family, checked against ButtonDefs.swift's schemes. */
import { expect, test } from "@playwright/test";
import { press, stubPad } from "./pad.js";

test.beforeEach(async ({ page }) => { await page.goto("/index.html"); });

const panel = "#pa-browser";
/* The image transform renames every src, so a photo is known by its height:
   cut-ps.png 778, cut-xb.png 758, cut-sw.png 732. */
const FAM = {
  ps: { h: "778", hold: "L1", cross: "Cross" },
  xb: { h: "758", hold: "LB", cross: "A" },
  sw: { h: "732", hold: "L", cross: "B" },
};

for (const [fam, want] of Object.entries(FAM)) {
  test(`the ${fam} switch shows its own pad and names`, async ({ page }) => {
    await page.locator("#pa-tab-browser").click();
    await page.locator(`label[for="pa-pad-${fam}"]`).filter({ visible: true }).click();
    const imgs = page.locator(`${panel} .pa-slot img`);
    await expect(imgs.filter({ visible: true })).toHaveCount(1);
    await expect(imgs.filter({ visible: true })).toHaveAttribute("height", want.h);
    /* the held chip heading the group, and the pressed chip in "L1 + Cross" */
    await expect(page.locator(`${panel} .pa-hold .py-g`).filter({ visible: true }).first()).toHaveText(want.hold);
    const row = page.locator(`${panel} .pa-key li[data-c="cross"]`);
    const face = row.locator(".py-g-face").filter({ visible: true });
    if (fam === "ps") await expect(face).toHaveText("Cross");     // the shape, named for a screen reader
    else await expect(face).toHaveText(want.cross);
    /* the hold is said once, by the header: the rows do not repeat it */
    await expect(page.locator(`${panel} .pa-key li .py-g[data-b="l1"]`).filter({ visible: true })).toHaveCount(0);
  });
}

test("an Xbox pad's default layout puts the ring on the right stick", async ({ page }) => {
  await page.locator('label[for="pa-pad-xb"]').filter({ visible: true }).click();
  const ring = page.locator("#pa-default .pa-key li", { hasText: "app launcher" }).filter({ visible: true });
  await expect(ring).toHaveCount(1);
  await expect(ring).toHaveAttribute("data-c", "r3");
});

/* Every row lights a part of the photo, on every pad: a button's outline, or
   a trigger's pill filled, so no binding points at nothing. */
test("every row lights its part of the pad, on every pad", async ({ page }) => {
  for (const fam of ["ps", "xb", "sw"]) {
    await page.locator(`label[for="pa-pad-${fam}"]`).filter({ visible: true }).click();
    for (const id of ["default", "media", "browser", "finalcut", "mail"]) {
      await page.locator(`#pa-tab-${id}`).click();
      const rows = page.locator(`#pa-${id} .pa-key li`).filter({ visible: true });
      for (let i = 0; i < await rows.count(); i++) {
        const row = rows.nth(i);
        await row.hover();
        const lit = page.locator(`#pa-${id} .pa-lights .pa-f-${fam} :is(path.is-on, .pp-t[style*="--v: 1"], .pp-t[style*="--v:1"])`);
        await expect(lit, `${fam} ${id} ${await row.getAttribute("data-b")}`).not.toHaveCount(0);
      }
    }
  }
});

test("pointing at or focusing a row lights its part and marks the row", async ({ page }) => {
  const on = page.locator("#pa-default .pa-lights .pa-f-ps path.is-on");
  await page.locator("#pa-default .pa-key li[data-c='circle']").hover();
  await expect(on).toHaveAttribute("data-c", "circle");
  await expect(page.locator("#pa-default .pa-key li.is-hot")).toHaveAttribute("data-c", "circle");

  await page.mouse.move(0, 0);
  await page.locator("#pa-default .pa-key li[data-c='r1']").focus();
  await expect(on).toHaveAttribute("data-c", "r1");
});

test("pointing at a part of the photo marks every row that uses it", async ({ page }) => {
  const stick = page.locator('#pa-default .pa-lights .pa-f-ps path[data-c="ls"]');
  await stick.scrollIntoViewIfNeeded();
  await stick.hover();
  await expect(page.locator("#pa-default .pa-key li.is-hot")).toHaveCount(2);   // move the pointer, and the app launcher
  await expect(page.locator("#pa-default .pa-key li.is-hot").first()).toContainText("Move the pointer");
});

/* Captures freeze the page (html.still); a visitor does not. */
test("left alone in view, the band walks its rows", async ({ page }) => {
  await page.evaluate(() => document.documentElement.classList.remove("still"));
  await page.locator("#apps").scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const hot = page.locator("#pa-default .pa-key li.is-hot");
  await expect(hot).toHaveCount(1);
  const first = await hot.getAttribute("data-b");
  await expect.poll(() => hot.getAttribute("data-b"), { timeout: 5000 }).not.toBe(first);
});

test("the switcher defaults to the pad the demo saw", async ({ page }) => {
  await stubPad(page);
  await page.addInitScript(() => {
    /** @type {any} */ (window).__pad.id = "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)";
  });
  await page.goto("/index.html");
  await press(page, "options");
  await expect(page.locator("#pa-pad-xb")).toBeChecked();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("no keyboard instructions, and one line to send the page to a Mac", async ({ page }) => {
    await expect(page.locator("#pyKeys")).toBeHidden();
    await expect(page.locator(".py-acts")).toBeHidden();
    await expect(page.locator(".l2-share")).toBeVisible();
    await expect(page.locator(".l2-share")).toContainText("Try it with a controller on your Mac");
    await expect(page.locator(".l2-share-go")).toBeVisible();
    await expect(page.locator("#pyText")).toHaveJSProperty("readOnly", true);
  });
});

test("on a desktop the share line stays out of the way", async ({ page }) => {
  await expect(page.locator(".l2-share")).toBeHidden();
  await expect(page.locator("#pyKeys")).toBeVisible();
});

/* Every tile, not one: the automation tile was added without this check.
   The count guards the list itself, so a tile added later fails here until
   it is named. */
test("feature captures follow the page theme", async ({ page }) => {
  const tiles = [".l2-tile-help", ".l2-tile-auto"];
  await expect(page.locator(".l2-more .l2-tile")).toHaveCount(tiles.length);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    for (const tile of tiles) {
      await page.locator(tile).scrollIntoViewIfNeeded();
      await expect(page.locator(`${tile} img.l2-${theme}`)).toBeVisible();
      await expect(page.locator(`${tile} img.l2-${theme === "light" ? "dark" : "light"}`)).toBeHidden();
    }
  }
});

/* Two different controls never share a chip label within a layout, on any
   pad: the Switch once printed the right stick and the R shoulder both as R. */
test("no two controls in a layout print the same chip, on any pad", async ({ page }) => {
  for (const fam of ["ps", "xb", "sw"]) {
    await page.locator(`label[for="pa-pad-${fam}"]`).filter({ visible: true }).click();
    const clash = await page.$$eval(".pa-panel", (panels) => panels.flatMap((p) => {
      /** @type {Map<string, string>} */
      const seen = new Map();
      const out = [];
      for (const g of p.querySelectorAll(".pa-legend .py-g")) {
        if (!(/** @type {HTMLElement} */ (g)).offsetParent) continue;
        /* what the eye reads: a PlayStation shape's text is its hidden name */
        const label = (g.textContent || "").trim();
        const b = g.getAttribute("data-b") || "";
        if (seen.has(label) && seen.get(label) !== b) out.push(`${p.id}: "${label}" is ${seen.get(label)} and ${b}`);
        seen.set(label, b);
      }
      return out;
    }));
    expect(clash, fam).toEqual([]);
  }
});

/* The picker is the pads themselves along the stage's foot: three cut-outs,
   named, the chosen one marked, and still a radio group underneath, so the
   arrow keys move it and the focus ring shows on the pad you are on. */
test("the controller picker is the three pads, driven by the arrow keys", async ({ page }) => {
  const pick = page.locator(".pa-pick").filter({ visible: true });
  await expect(pick).toHaveCount(1);
  await expect(pick.locator("img")).toHaveCount(3);
  await expect(pick.locator("label")).toHaveText(["PlayStation", "Xbox", "Switch"]);
  const line = (f) => pick.locator(`.pa-pick-${f} span`).evaluate((el) => getComputedStyle(el).borderBottomColor);
  expect(await line("ps")).not.toBe(await line("xb"));

  /* by the keyboard, from the tab row */
  await page.locator("#pa-tab-default").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#pa-pad-ps")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#pa-pad-xb")).toBeChecked();
  await expect(page.locator("#pa-pad-xb")).toBeFocused();
  expect(await pick.locator(".pa-pick-xb").evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  await expect(page.locator(".pa-slot img").filter({ visible: true }).first()).toHaveAttribute("height", "758");
  await expect(page.getByRole("radiogroup", { name: "Your controller" }).getByRole("radio")).toHaveCount(3);
});

test("a row under a held shoulder gives the light bar that layer's colour", async ({ page }) => {
  await page.locator("#pa-tab-finalcut").click();
  const lights = page.locator("#pa-finalcut .pa-lights");
  const lb = () => lights.evaluate((e) => /** @type {HTMLElement} */ (e).style.getPropertyValue("--pp-lb"));
  await page.locator("#pa-finalcut .pa-key li[data-hold='r2']").first().hover();
  await expect.poll(lb).toBe("rgb(160,80,255)");
  await page.locator("#pa-finalcut .pa-key li[data-hold='l1']").first().hover();
  await expect.poll(lb).toBe("rgb(255,165,0)");
});
