/* The three-state theme toggle: System -> Light -> Dark -> System.
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
  const vis = (n) => {
    const e = t && t.querySelector("." + n);
    return !!e && getComputedStyle(e).display !== "none";
  };
  let stored = null;
  try { stored = localStorage.getItem("steer-theme"); } catch { /* private mode */ }
  return {
    pref: r.getAttribute("data-theme-pref"),
    theme: r.getAttribute("data-theme"),
    stored,
    label: t && t.getAttribute("aria-label"),
    glyph: ["auto", "sun", "moon"].filter(vis),
  };
});

for (const page_ of ["features.html", "index.html"]) {
  test.describe(page_, () => {
    // A visitor who has never chosen, on a dark Mac. Each test gets a fresh
    // context, so "never chosen" needs no clearing step.
    test.use({ colorScheme: "dark" });

    test("first visit follows the OS and says so", async ({ page }) => {
      await page.goto(page_);
      await expectState(page).toMatchObject({
        pref: "system", theme: "dark", stored: null, glyph: ["auto"],
        label: "Theme: System, activate for Light",
      });
    });

    test("cycles System -> Light -> Dark -> System, and the third press clears the key", async ({ page }) => {
      await page.goto(page_);
      const toggle = page.locator("#themeToggle");

      await toggle.click();
      await expectState(page).toMatchObject({
        pref: "light", theme: "light", stored: "light", glyph: ["sun"],
        label: "Theme: Light, activate for Dark",
      });

      await toggle.click();
      await expectState(page).toMatchObject({
        pref: "dark", theme: "dark", stored: "dark", glyph: ["moon"],
      });

      // The point of the whole change: a way back to following the OS.
      await toggle.click();
      await expectState(page).toMatchObject({
        pref: "system", theme: "dark", stored: null, glyph: ["auto"],
      });
    });

    test("an OS change lands live while on System, and is ignored once forced", async ({ page }) => {
      await page.goto(page_);
      await page.emulateMedia({ colorScheme: "light" });
      await expectState(page).toMatchObject({ pref: "system", theme: "light" });

      await page.locator("#themeToggle").click();   // -> light, forced
      await page.locator("#themeToggle").click();   // -> dark, forced

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
      await page.locator("#themeToggle").click();
      await page.locator("#themeToggle").click();   // -> dark, forced
      await page.goto(page_);
      /* The label is asserted HERE and not on first load. On first load the
         expected string is byte-identical to the one hard-coded in nav.html, so
         that assertion passes whether or not the script ever writes it --
         deleting the write scored a full pass until this existed. After a reload
         carrying a forced preference the two differ. */
      await expectState(page).toMatchObject({
        pref: "dark", theme: "dark", glyph: ["moon"],
        label: "Theme: Dark, activate for System",
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
        pref: "system", theme: "light", label: "Theme: System, activate for Light",
      });

      await page.locator("#themeToggle").click();
      await expectState(page).toMatchObject({ pref: "light", stored: "light" });
    });
  });
}
