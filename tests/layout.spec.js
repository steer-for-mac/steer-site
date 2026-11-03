import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

/* 768 is not a breakpoint the sheets use; it is between the two that are. */
const WIDTHS = [1440, 768, 375];

/* Fixed-size canvases screenshotted into store and social imagery at one size.
   Not responsive, and not meant to be. */
const CANVASES = new Set(["og.html", "store-cards.html"]);

const PAGES = readdirSync("dist").filter((f) => f.endsWith(".html") && !CANVASES.has(f)).sort();

/* One load per page, resized through the widths: overflow is a property of the
   layout at a width, not of how the page was loaded, and three loads per page
   per engine was most of this file's cost. */
for (const page of PAGES) {
  test(`${page} does not scroll sideways at ${WIDTHS.join(", ")}px`, async ({ page: p }) => {
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.goto(`/${page}`);
    for (const width of WIDTHS) {
      await p.setViewportSize({ width, height: width < 500 ? 812 : 900 });
      /* documentElement, not body: body can be exactly viewport-wide while a
         child sticks out of it and the page still scrolls. Polled: a resize
         reflows on the next frame, and a single read races it. */
      try {
        await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
          .toBeLessThanOrEqual(0);
      } catch {
        /* This fired once in roughly twenty runs and did not reproduce in
           fourteen; a retry would have buried it, so the failure names the
           widest element and whether the sheet was even applied. */
        const why = await p.evaluate(() => {
          let el = "", max = 0;
          for (const e of document.querySelectorAll("*")) { const r = e.getBoundingClientRect(); if (r.right > max) { max = r.right; el = `${e.tagName}.${e.className}`; } }
          return { over: document.documentElement.scrollWidth - window.innerWidth, widest: `${el} @${Math.round(max)}px`, sheets: document.styleSheets.length };
        });
        throw new Error(`${page} scrolls sideways at ${width}px: ${JSON.stringify(why)}`);
      }
    }
  });
}
