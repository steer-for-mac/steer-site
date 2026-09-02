/* Store-card renderer. shots.spec.js knows the homepage's bands and nothing
   else, and store-cards.html is a hash-switched canvas rather than a page of
   sections, so it needs its own tool. Asserts nothing: it writes files for a
   person to look at, which is why it lives in tools/ and not tests/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";

const OUT = process.env.CARDS_OUT || "scratch/cards";
const CARDS = (process.env.CARDS || "grammar,radial,typing,deal,identity").split(",");

/* 2x then downscale, the same reason docs/store-assets.md renders at 2x: the
   512px icon and the mono fine print both fall apart shot at 1x. */
test.use({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });

test("render every store card, full size and at the 440px checkout size", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  for (const card of CARDS) {
    await page.goto(`/store-cards.html#${card}`);
    /* The hash script runs once at parse time, so a same-document hash change
       would leave the previous card showing. Reload rather than trust it. */
    await page.reload();
    await page.waitForFunction(() => document.fonts.status === "loaded");
    const full = await page.screenshot({ scale: "device" });
    writeFileSync(join(OUT, `${card}.png`), full);

    /* Downscaled by the browser's image resampler rather than by rendering at
       0.275 device scale: rendering small draws type at small size, which is
       crisper than the buyer will ever see and flatters a card that would
       actually mush. Resampling a finished 3200px raster is what LANCZOS does
       in the doc's recipe. */
    await page.setContent(
      `<body style="margin:0;background:#000">
         <img src="data:image/png;base64,${full.toString("base64")}"
              style="display:block;width:440px;height:330px">
       </body>`);
    writeFileSync(join(OUT, `${card}-440.png`),
      await page.screenshot({ clip: { x: 0, y: 0, width: 440, height: 330 }, scale: "css" }));
  }
});
