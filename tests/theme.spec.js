/* The appearance control, pressed for real: every other gate grades a page
   holding still, which is how a toggle with no way back to System shipped
   green. emulateMedia flips what the LIVE page sees, the event the listener
   exists for. Interaction runs on one page (theme.js is one file); first
   load runs on both, since theme-init.js branches on the homepage. */
import { test, expect } from "@playwright/test";

/* Polled, not read once: these are states the page settles into after a
   click or a matchMedia event, and one read races that. Polling also lets the
   suite run fullyParallel: a slow asset delays the settle instead of failing. */
const expectState = (page) => expect.poll(() => read(page), { timeout: 5000 });

/* Everything one press is supposed to move, read in a single evaluate so the
   assertion cannot catch a half-applied state. */
const read = (page) => page.evaluate(() => {
  const r = document.documentElement;
  const t = document.getElementById("themeToggle");
  /** @type {string|null} */
  let stored = null;
  try { stored = localStorage.getItem("steer-theme"); } catch { /* private mode */ }
  return {
    pref: r.getAttribute("data-theme-pref"),
    theme: r.getAttribute("data-theme"),
    stored,
    label: t && t.getAttribute("aria-label"),
    // trigger = appearance in force; menu = mode chosen. Both, because one
    // glyph cannot say both.
    glyph: ["sun", "moon"].filter((n) => {
      const e = t && t.querySelector("." + n);
      return !!e && getComputedStyle(e).display !== "none";
    }),
    menuPick: /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="theme-pref"]:checked'))?.value,
    menuOpen: !!document.getElementById("themeMenu")?.matches(":popover-open"),
    /* PAINTED, not just "open". These are different facts and the difference
       shipped: a bare display:flex on .theme-menu beat the UA sheet's
       [popover]:not(:popover-open){display:none}, so the menu was drawn over
       every page permanently while :popover-open stayed honestly false. An
       assertion on menuOpen alone could never fail on that, and did not. */
    menuPainted: getComputedStyle(/** @type {Element} */ (document.getElementById("themeMenu"))).display !== "none",
  };
});

/* theme.js is deferred, and the popover opens WITHOUT it -- popovertarget is
   pure HTML. So a test could open the menu and press a key before the listener
   that key needs existed, which raced about half the time once WebKit doubled
   the parallel load. Every test goes through here. */
async function open_(page, url) {
  if (url) await page.goto(url);
  await page.locator("html[data-theme-ready]").waitFor({ state: "attached" });
}

async function openMenu(page, url) {
  await open_(page, url);
  await page.locator("#themeToggle").click();
  // Opening is not the same as ready: theme.js focuses the checked radio on the
  // popover's `toggle` event, and an arrow key landing before that does nothing
  // at all. Failed ~3 runs in 4 without this wait.
  await page.waitForFunction(() => document.activeElement?.classList.contains("tm-in"));
}

async function choose(page, mode) {
  await openMenu(page);
  await page.locator(`label[for="tm-${mode}"]`).click();
}

/* What a page opens in: theme-init.js, which branches on the homepage. */
const BOTH = ["features.html", "index.html"];
/* What the menu does once open: theme.js, the same file on every page. */
const ONE = ["features.html"];
const FIRST_LOAD = new Set([
  "first visit follows the OS, and the menu is not on the page",
  "a forced choice survives navigation",
  "a junk stored value falls back to System instead of bricking the control",
]);
const on = (page_, name) => FIRST_LOAD.has(name) || ONE.includes(page_);

for (const page_ of BOTH) {
  test.describe(page_, () => {
    const test_ = (name, fn) => (on(page_, name) ? test(name, fn) : undefined);
    // A visitor who has never chosen, on a dark Mac. Each test gets a fresh
    // context, so "never chosen" needs no clearing step.
    test.use({ colorScheme: "dark" });

    test_("first visit follows the OS, and the menu is not on the page", async ({ page }) => {
      await open_(page, page_);
      await expectState(page).toMatchObject({
        menuOpen: false, menuPainted: false,
        pref: "system", theme: "dark", stored: null, glyph: ["moon"],
        menuPick: "system", label: "Appearance: System",
      });
    });

    test_("each mode is reachable by name, and System clears the key", async ({ page }) => {
      await open_(page, page_);

      await choose(page, "light");
      await expectState(page).toMatchObject({
        pref: "light", theme: "light", stored: "light", glyph: ["sun"],
        menuPick: "light", label: "Appearance: Light", menuOpen: false, menuPainted: false,
      });

      await choose(page, "dark");
      await expectState(page).toMatchObject({
        pref: "dark", theme: "dark", stored: "dark", glyph: ["moon"], menuPick: "dark",
      });

      // The point of the whole change: a way back to following the OS.
      await choose(page, "system");
      await expectState(page).toMatchObject({
        pref: "system", theme: "dark", stored: null, glyph: ["moon"], menuPick: "system",
      });
    });

    test_("the menu opens on the trigger and closes once a mode is picked", async ({ page }) => {
      await openMenu(page, page_);
      await expectState(page).toMatchObject({ menuOpen: true, menuPainted: true });
      // opening focuses the current choice, so the radio group's arrow keys start somewhere
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("tm-system");

      await page.locator('label[for="tm-dark"]').click();
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "dark" });
    });

    /* The two ways a person actually dismisses a menu, and neither was covered:
       the suite tested closing by PICKING and by Escape, was green, and the
       control was unclosable in both Chrome and Safari. A gate that green is
       worse than no gate. */
    test_("clicking the trigger again closes the menu", async ({ page }) => {
      await openMenu(page, page_);
      await expectState(page).toMatchObject({ menuOpen: true, menuPainted: true });
      await page.locator("#themeToggle").click();
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system" });
    });

    test_("clicking away closes the menu", async ({ page }) => {
      await openMenu(page, page_);
      await expectState(page).toMatchObject({ menuOpen: true, menuPainted: true });
      await page.locator("h1").first().click({ force: true });
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system" });
    });

    /* ArrowUp, not Down or Right: System is the last of the three in DOM order,
       and WebKit's radio groups do not wrap while Chromium's do. Up moves to
       Dark in both, so the assertion is about our behaviour rather than the
       engine's edge case. */
    test_("arrows preview without committing the menu shut", async ({ page }) => {
      await openMenu(page, page_);
      await page.keyboard.press("ArrowUp");
      // the theme follows live, and the menu STAYS so you can keep browsing --
      // the first press used to apply, close, and move focus to the trigger.
      await expectState(page).toMatchObject({ menuOpen: true, pref: "dark", menuPick: "dark" });
      await page.keyboard.press("ArrowUp");
      await expectState(page).toMatchObject({ menuOpen: true, pref: "light", menuPick: "light" });
    });

    test_("Enter confirms the previewed option and closes", async ({ page }) => {
      await openMenu(page, page_);
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Enter");
      // Enter had no effect at all before: no form to submit, and dismissal
      // lived on `change`, which re-selecting never fires.
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "dark", stored: "dark" });
    });

    test_("re-picking the mode already selected just closes", async ({ page }) => {
      await openMenu(page, page_);
      // no `change` fires here, so dismissal cannot hang off it: this used to
      // leave the menu open with nothing having happened.
      await page.locator('label[for="tm-system"]').click();
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system" });
    });

    test_("Escape closes the menu without changing anything", async ({ page }) => {
      await openMenu(page, page_);
      await expectState(page).toMatchObject({ menuOpen: true, menuPainted: true });
      await page.keyboard.press("Escape");
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system", stored: null });
    });

    test_("an OS change lands live while on System, and is ignored once forced", async ({ page }) => {
      await open_(page, page_);
      await page.emulateMedia({ colorScheme: "light" });
      await expectState(page).toMatchObject({ pref: "system", theme: "light" });

      await choose(page, "dark");

      /* Re-arm to dark first: re-emulating the value already in effect fires no
         event, which once let this pass with the guard deleted. The 50ms gap
         stops the two calls coalescing; the 200ms is a real wait, because a
         poll cannot express "stays". */
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForTimeout(50);
      await page.emulateMedia({ colorScheme: "light" });
      await page.waitForTimeout(200);
      await expectState(page).toMatchObject({ pref: "dark", theme: "dark", stored: "dark" });
    });

    test_("a forced choice survives navigation", async ({ page }) => {
      await open_(page, page_);
      await choose(page, "dark");
      await page.goto(page_);
      /* The label is asserted HERE and not on first load. On first load the
         expected string is byte-identical to the one hard-coded in nav.html, so
         that assertion passes whether or not the script ever writes it --
         deleting the write scored a full pass until this existed. After a reload
         carrying a forced preference the two differ. */
      await expectState(page).toMatchObject({
        pref: "dark", theme: "dark", glyph: ["moon"], menuPick: "dark",
        label: "Appearance: Dark",
      });
    });

    test_("a junk stored value falls back to System instead of bricking the control", async ({ page }) => {
      /* A value outside light|dark used to become the state: data-theme="SYSTEM"
         matched no rule, the label read "Theme: undefined", and the first click
         wrote the string "undefined" into storage, killing the only control that
         could recover it. Nothing here writes such a value, so this guards the
         guard rather than a live path. */
      await open_(page, page_);
      await page.evaluate(() => localStorage.setItem("steer-theme", "SYSTEM"));
      await page.emulateMedia({ colorScheme: "light" });
      await open_(page, page_);
      await expectState(page).toMatchObject({
        pref: "system", theme: "light", glyph: ["sun"], menuPick: "system",
        label: "Appearance: System",
      });

      await choose(page, "light");
      await expectState(page).toMatchObject({ pref: "light", stored: "light" });
    });
  });
}
