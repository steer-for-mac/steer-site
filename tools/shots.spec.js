/* Section screenshots, so "does it look bland" stops being a matter of memory.
   The curb (docs/design-rules.md) ends with by-eye checks; this is the looking. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";

const SECTIONS = { hero: ".chero", padstrip: ".padstrip", numstrip: ".numstrip",
  gap: "#gap", uses: "#uses", feel: "#feel", capabilities: "#capabilities",
  trust: "#trust", pricing: "#pricing" };

const OUT = process.env.SHOTS_OUT || "scratch/shots";
const PAD = process.env.SHOTS_PAD || "";
const THEME = process.env.SHOTS_THEME || "";
/* `serve` defaulted cleanUrls on and scripts/serve.js does not, so a bare
   SHOTS_PAGE=features 404s. Normalising is half the fix: only index.html
   carries these SECTIONS, so a wrong page shot zero files and still exited 0. */
const RAW = process.env.SHOTS_PAGE || "index.html";
const PAGE = RAW.endsWith(".html") ? RAW : `${RAW}.html`;

for (const width of [1440, 375]) {
  test(`render every section at ${width}px`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width, height: width < 500 ? 812 : 900 });
    const res = await page.goto(`/${PAGE}`);
    if (!res?.ok()) throw new Error(`${PAGE} -> ${res?.status()}`);
    await page.waitForFunction(() => document.fonts.status === "loaded");
    /* The label, not the attribute: the glyph and copy swaps listen for the
       `steerpad` event that setPad dispatches, so setting html[data-pad] alone
       leaves every label on PlayStation and renders a half-swapped page. */
    if (PAD) await page.locator(`label[for="hp-${PAD}"]`).click();
    if (THEME) await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), THEME);

    let shot = 0;
    for (const [name, selector] of Object.entries(SECTIONS)) {
      const el = page.locator(selector);
      if (!await el.count()) continue;
      /* instant, both: scroll-behavior is smooth, so an animated scrollIntoView
         leaves the scrollBy computing from a stale offset. -70 clears the nav. */
      const box = await el.evaluate((node) => {
        node.scrollIntoView({ block: "start", behavior: "instant" });
        window.scrollBy({ top: -70, behavior: "instant" });
        const r = node.getBoundingClientRect();
        return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height };
      });
      /* fullPage is what the clip is measured against, not "shoot everything".
         animations is inert: home.js adds .still under webdriver, so these
         frames are the static state whatever is asked for. */
      writeFileSync(join(OUT, `${name}-${width}.png`),
        await page.screenshot({ clip: box, fullPage: true, animations: "allow", scale: "css" }));
      shot += 1;
    }
    /* Zero is the silent failure this tool had: a page without these sections
       skipped every one of them and still passed. */
    if (!shot) throw new Error(`no section matched on ${PAGE}`);
  });
}
