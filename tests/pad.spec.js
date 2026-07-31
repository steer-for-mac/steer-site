/* The controller picker: two native radio groups, one page-wide pad choice.
 *
 * It used to be four role="tab" buttons with a hand-written ArrowLeft/Right
 * handler and aria-selected written back onto every button on each pick. The
 * swap to radios is invisible to every other gate here -- html-validate sees
 * valid markup either way, axe sees a labelled group either way -- and neither
 * can press ArrowRight to find out whether the browser really took over.
 *
 * The two groups carry different name= values deliberately. Same-name radios
 * are ONE group document-wide, so arrow keys would walk from the strip seven
 * screens up into the hero, which is the exact bug the deleted roving-focus
 * code existed to patch. "stays inside its own group" below is what stops that
 * regressing quietly.
 */
import { test, expect } from "@playwright/test";

/* Stated, not inherited. The hero has height breakpoints (styles/bands/hero.css
   hides .ann below one of them), so the viewport is a precondition of what this
   file reads, and Desktop Chrome's default 1280x720 sits on the other side of
   it. The state read below is identical at both today -- checked rather than
   assumed -- but leaving it implicit means a future assertion about a hidden
   element would depend on a number nobody wrote down. */
test.use({ viewport: { width: 1440, height: 900 } });

/* expect.poll, not a bare expect on a single read. These assertions describe
   state the page settles into after an event -- a click, or a
   prefers-color-scheme change that reaches the page as a matchMedia event --
   and reading once races that. Polling is also what lets the suite run
   fullyParallel against one static server: a slow asset delays the settle
   rather than failing the run. It replaces the hand-placed sleeps the CDP
   version needed, which were guesses that happened to hold on this machine. */
const expectState = (page) => expect.poll(() => read(page), { timeout: 5000 });

/* Everything a pick is supposed to move: both pickers, both attributes that
   gate CSS, the visible plate, and the per-pad copy swap. */
const read = (page) => page.evaluate(() => {
  const chk = (n) => {
    const e = /** @type {HTMLInputElement|null} */ (document.querySelector(`input[name="${n}"]:checked`));
    return e && e.value;
  };
  const active = [...document.querySelectorAll(".chero .padwrap.active")]
    .map((w) => w.className.replace(/padwrap|active/g, "").trim());
  const shown = [...document.querySelectorAll('.chero [class*="only-"]')]
    .filter((e) => getComputedStyle(e).display !== "none")
    .map((e) => (e.className.match(/only-\w+/) || [""])[0]);
  return {
    html: document.documentElement.getAttribute("data-pad"),
    hero: document.querySelector(".chero")?.getAttribute("data-pad"),
    heroPick: chk("hero-pad"),
    stripPick: chk("strip-pad"),
    active,
    shown: [...new Set(shown)],
    focus: document.activeElement?.id,
  };
});

test("defaults to PlayStation, everywhere at once", async ({ page }) => {
  await page.goto("index.html");
  await expectState(page).toMatchObject({
    html: "ps", hero: "ps", heroPick: "ps", stripPick: "ps",
    active: ["ps"], shown: ["only-ps"],
  });
});

test("a hero pick moves the page and syncs the strip", async ({ page }) => {
  await page.goto("index.html");
  await page.locator('label[for="hp-xb"]').click();
  await expectState(page).toMatchObject({
    html: "xb", hero: "xb", heroPick: "xb", stripPick: "xb",
    active: ["xb"], shown: ["only-xb"],
  });
});

test("a strip pick moves the page and syncs the hero", async ({ page }) => {
  // the strip is a real picker, not a display: someone seven screens down can
  // still tell the page which pad they own.
  await page.goto("index.html");
  await page.locator('label[for="sp-sw"]').click();
  await expectState(page).toMatchObject({
    html: "sw", heroPick: "sw", stripPick: "sw", active: ["sw"],
  });
});

test("ArrowRight selects the next pad with no handler of ours", async ({ page }) => {
  await page.goto("index.html");
  await page.locator("#hp-ps").focus();
  await page.keyboard.press("ArrowRight");
  await expectState(page).toMatchObject({ html: "xb", heroPick: "xb", focus: "hp-xb" });
});

test("arrow keys stay inside the strip and never reach the hero", async ({ page }) => {
  /* Asserted from the FIRST option moving forward, not from the last wrapping
     round. Wrapping is not portable: WebKit's radio groups do not wrap, so
     ArrowRight on the last option does nothing there while Chromium returns to
     the first. Both engines agree on the thing this test is actually for --
     that focus and selection stay within one picker -- and pinning the
     unportable half made a browser difference look like a regression. */
  await page.goto("index.html");
  await page.locator("#sp-ps").focus();
  await page.keyboard.press("ArrowRight");
  const st = await page.evaluate(() => ({
    focus: document.activeElement?.id,
    strip: /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="strip-pad"]:checked'))?.value,
    hero: /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="hero-pad"]:checked'))?.value,
  }));
  expect(st.focus?.startsWith("sp-")).toBe(true);
  expect(st.strip).toBe("xb");
  expect(st.hero).toBe("xb");   // synced by us, not by the browser walking groups
});

test("#xbox deep link arrives on Xbox with both pickers agreeing", async ({ page }) => {
  // how compatibility.html hands off to the hero
  await page.goto("index.html#xbox");
  await expectState(page).toMatchObject({
    html: "xb", hero: "xb", heroPick: "xb", stripPick: "xb", active: ["xb"],
  });
});
