/* Drop a generated pad SVG into the live hero and shoot it, so url(#bodyGrad)
   and every var(--pa-*) resolve against the real defs and tokens. Reading the
   file standalone renders it flat grey and proves nothing. */
import { mkdirSync, readFileSync } from "node:fs";
import { test } from "@playwright/test";

const SVG = process.env.PAD_SVG;
if (!SVG) throw new Error("set PAD_SVG to the pad you want previewed");
const OUT = process.env.PAD_OUT || "scratch/pads/preview.png";

test("preview a generated pad in the hero", async ({ page }) => {
  mkdirSync("scratch/pads", { recursive: true });
  const svg = readFileSync(SVG, "utf8").replace(/<\?xml[^>]*\?>/g, "");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/index.html");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  for (const theme of ["dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.evaluate((markup) => {
      const plate = document.querySelector(".plate");
      if (plate) plate.innerHTML = markup;
    }, svg);
    await page.waitForTimeout(250);
    await page.locator(".plate").first()
      .screenshot({ path: OUT.replace(/\.png$/, `-${theme}.png`) });
  }
});
