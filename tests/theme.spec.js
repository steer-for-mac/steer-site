/* The appearance control: a trigger showing the resolved appearance, and a
 * popover menu offering System / Light / Dark.
 *
 * Every other gate in this repo grades a document holding still -- html-validate
 * parses it, axe walks it, PurgeCSS asks what it can reach. None of them can
 * press a button, which is how a two-state toggle shipped on fourteen pages
 * with no way back to "follow my Mac" and every check green.
 *
 * emulateMedia is the honest way to test "keeps following the OS": it changes
 * what prefers-color-scheme reports to the LIVE page, which is the event the
 * matchMedia listener exists to catch. Asserting on a stub would only prove the
 * stub works.
 *
 * Both a sub-page and the homepage, because the handler used to exist twice --
 * once in home.js and once in the layout for the other thirteen pages -- and
 * the regression worth guarding is precisely one page behaving differently.
 */
import { test, expect } from "@playwright/test";

/* expect.poll, not a bare expect on a single read. These assertions describe
   state the page settles into after an event -- a click, or a
   prefers-color-scheme change that reaches the page as a matchMedia event --
   and reading once races that. Polling is also what lets the suite run
   fullyParallel against one static server: a slow asset delays the settle
   rather than failing the run. It replaces the hand-placed sleeps the CDP
   version needed, which were guesses that happened to hold on this machine. */
const expectState = (page) => expect.poll(() => read(page), { timeout: 5000 });

/* Everything one press is supposed to move, read in a single evaluate so the
   assertion cannot catch a half-applied state. */
const read = (page) => page.evaluate(() => {
  const r = document.documentElement;
  const t = document.getElementById("themeToggle");
  let stored = null;
  try { stored = localStorage.getItem("steer-theme"); } catch { /* private mode */ }
  return {
    pref: r.getAttribute("data-theme-pref"),
    theme: r.getAttribute("data-theme"),
    stored,
    label: t && t.getAttribute("aria-label"),
    /* The button carries two facts and they are asserted separately: the glyph
       is the appearance in force, the dot is whether that was inherited from
       the OS or chosen. Asserting only the glyph would let System and a forced
       choice look identical to the test, which is the very confusion the dot
       exists to remove. */
    /* The trigger carries the appearance in force; the menu carries which of
       the three modes was chosen. Both are asserted, because the whole point of
       splitting them is that one glyph could not say both. */
    glyph: ["sun", "moon"].filter((n) => {
      const e = t && t.querySelector("." + n);
      return !!e && getComputedStyle(e).display !== "none";
    }),
    menuPick: (document.querySelector('input[name="theme-pref"]:checked') || {}).value,
    menuOpen: !!document.getElementById("themeMenu")?.matches(":popover-open"),
    /* PAINTED, not just "open". These are different facts and the difference
       shipped: a bare display:flex on .theme-menu beat the UA sheet's
       [popover]:not(:popover-open){display:none}, so the menu was drawn over
       every page permanently while :popover-open stayed honestly false. An
       assertion on menuOpen alone could never fail on that, and did not. */
    menuPainted: getComputedStyle(document.getElementById("themeMenu")).display !== "none",
  };
});

/* Open the menu and choose a mode. Native popover, so opening is the browser's
   job via popovertarget -- clicking the trigger is the whole of it. */
async function choose(page, mode) {
  await page.locator("#themeToggle").click();
  await page.locator(`label[for="tm-${mode}"]`).click();
}

for (const page_ of ["features.html", "index.html"]) {
  test.describe(page_, () => {
    // A visitor who has never chosen, on a dark Mac. Each test gets a fresh
    // context, so "never chosen" needs no clearing step.
    test.use({ colorScheme: "dark" });

    test("first visit follows the OS, and the menu is not on the page", async ({ page }) => {
      await page.goto(page_);
      await expectState(page).toMatchObject({
        menuOpen: false, menuPainted: false,
        pref: "system", theme: "dark", stored: null, glyph: ["moon"],
        menuPick: "system", label: "Appearance: System",
      });
    });

    test("each mode is reachable by name, and System clears the key", async ({ page }) => {
      await page.goto(page_);

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

    test("the menu opens on the trigger and closes once a mode is picked", async ({ page }) => {
      await page.goto(page_);
      await page.locator("#themeToggle").click();
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
    test("clicking the trigger again closes the menu", async ({ page }) => {
      await page.goto(page_);
      await page.locator("#themeToggle").click();
      await expectState(page).toMatchObject({ menuOpen: true, menuPainted: true });
      await page.locator("#themeToggle").click();
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system" });
    });

    test("clicking away closes the menu", async ({ page }) => {
      await page.goto(page_);
      await page.locator("#themeToggle").click();
      await expectState(page).toMatchObject({ menuOpen: true, menuPainted: true });
      await page.locator("h1").first().click({ force: true });
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system" });
    });

    /* ArrowUp, not Down or Right: System is the last of the three in DOM order,
       and WebKit's radio groups do not wrap while Chromium's do. Up moves to
       Dark in both, so the assertion is about our behaviour rather than the
       engine's edge case. */
    test("arrows preview without committing the menu shut", async ({ page }) => {
      await page.goto(page_);
      await page.locator("#themeToggle").click();
      await page.keyboard.press("ArrowUp");
      // the theme follows live, and the menu STAYS so you can keep browsing --
      // the first press used to apply, close, and move focus to the trigger.
      await expectState(page).toMatchObject({ menuOpen: true, pref: "dark", menuPick: "dark" });
      await page.keyboard.press("ArrowUp");
      await expectState(page).toMatchObject({ menuOpen: true, pref: "light", menuPick: "light" });
    });

    test("Enter confirms the previewed option and closes", async ({ page }) => {
      await page.goto(page_);
      await page.locator("#themeToggle").click();
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Enter");
      // Enter had no effect at all before: no form to submit, and dismissal
      // lived on `change`, which re-selecting never fires.
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "dark", stored: "dark" });
    });

    test("re-picking the mode already selected just closes", async ({ page }) => {
      await page.goto(page_);
      await page.locator("#themeToggle").click();
      // no `change` fires here, so dismissal cannot hang off it: this used to
      // leave the menu open with nothing having happened.
      await page.locator('label[for="tm-system"]').click();
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system" });
    });

    test("Escape closes the menu without changing anything", async ({ page }) => {
      await page.goto(page_);
      await page.locator("#themeToggle").click();
      await expectState(page).toMatchObject({ menuOpen: true, menuPainted: true });
      await page.keyboard.press("Escape");
      await expectState(page).toMatchObject({ menuOpen: false, menuPainted: false, pref: "system", stored: null });
    });

    test("an OS change lands live while on System, and is ignored once forced", async ({ page }) => {
      await page.goto(page_);
      await page.emulateMedia({ colorScheme: "light" });
      await expectState(page).toMatchObject({ pref: "system", theme: "light" });

      await choose(page, "dark");

      /* Re-arm to dark BEFORE flipping to light. The OS is already light from
         the step above, and re-emulating a value that is already in effect
         fires no change event at all -- so asserting after it proved nothing.
         This assertion could not fail: deleting the very guard it exists to
         protect (the `pref === 'system'` test in base.njk's listener, which is
         what stops the OS clobbering a forced choice) left every theme test
         green. The intermediate wait is load-bearing too, because back-to-back
         emulateMedia calls coalesce into no event.

         Then a real wait, not a poll: polling cannot express "stays". It passes
         on the first read, which happens before the listener could have fired,
         so a regression that DID repaint would still go green. */
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForTimeout(50);
      await page.emulateMedia({ colorScheme: "light" });
      await page.waitForTimeout(200);
      await expectState(page).toMatchObject({ pref: "dark", theme: "dark", stored: "dark" });
    });

    test("a forced choice survives navigation", async ({ page }) => {
      await page.goto(page_);
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

    test("a junk stored value falls back to System instead of bricking the control", async ({ page }) => {
      /* A value outside light|dark used to become the state: data-theme="SYSTEM"
         matched no rule, the label read "Theme: undefined", and the first click
         wrote the string "undefined" into storage, killing the only control that
         could recover it. Nothing here writes such a value, so this guards the
         guard rather than a live path. */
      await page.goto(page_);
      await page.evaluate(() => localStorage.setItem("steer-theme", "SYSTEM"));
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(page_);
      await expectState(page).toMatchObject({
        pref: "system", theme: "light", glyph: ["sun"], menuPick: "system",
        label: "Appearance: System",
      });

      await choose(page, "light");
      await expectState(page).toMatchObject({ pref: "light", stored: "light" });
    });
  });
}
