import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

/* 768 is not a breakpoint the sheets use; it is between the two that are. */
const WIDTHS = [1440, 768, 375];

/* Fixed-size canvases screenshotted into store and social imagery at one size.
   Not responsive, and not meant to be. */
const CANVASES = new Set(["og.html", "store-cards.html"]);

const PAGES = readdirSync("dist").filter((f) => f.endsWith(".html") && !CANVASES.has(f)).sort();

for (const page of PAGES) {
  for (const width of WIDTHS) {
    test(`${page} does not scroll sideways at ${width}px`, async ({ page: p }) => {
      await p.setViewportSize({ width, height: width < 500 ? 812 : 900 });
      await p.goto(`/${page}`);
      /* Polled, not read once: a single read races the stylesheet under a
         parallel run and reports the unstyled width as an overflow. A page that
         really does overflow still fails, it just takes the timeout to say so.
         documentElement, not body: body can be exactly viewport-wide while a
         child sticks out of it and the page still scrolls. */
      await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
        .toBeLessThanOrEqual(0);
    });
  }
}
