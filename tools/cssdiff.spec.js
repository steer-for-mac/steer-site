/* Every computed property of every element, across the gates the pages hide
   behind attributes. A rename is only safe if this output is unchanged, and a
   screenshot cannot show an off-screen band or a hover-only rule.
   CSSDIFF_OUT names the file; run it before a change and after, then diff. */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { test } from "@playwright/test";

const OUT = process.env.CSSDIFF_OUT || "scratch/css-dump.json";
const PAGES = readdirSync("dist").filter((f) => f.endsWith(".html")).sort();
const dump = {};

test.describe.configure({ mode: "serial" });

for (const page of PAGES) {
  for (const theme of ["light", "dark"]) {
    test(`${page} ${theme}`, async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.goto(`/${page}`);
      await p.waitForFunction(() => document.fonts.status === "loaded");
      await p.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
      await p.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      /* Force every reveal: the IntersectionObserver only adds .on to what has
         been scrolled past, so without this the vignette rules go ungraded. */
      await p.evaluate(() => document.querySelectorAll(".vg,.dgs,.lay-fig").forEach((e) => e.classList.add("on")));
      dump[`${page}-${theme}`] = await p.evaluate(() => {
        const out = [];
        let i = -1;
        for (const el of document.querySelectorAll("*")) {
          i++;
          if (el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
          const cs = getComputedStyle(el);
          /* Sorted: getComputedStyle does not enumerate custom properties in a
             stable order between runs, so an unsorted join reports thousands of
             diffs that are the same values shuffled. */
          const props = [];
          for (const n of cs) props.push(`${n}:${cs.getPropertyValue(n)}`);
          props.sort();
          const r = el.getBoundingClientRect();
          /* Keyed on position and geometry, deliberately NOT on class name:
             the whole point is to survive a rename. */
          out.push(`${i}|${el.tagName}|${[r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100)}|${props.join(";")}`);
        }
        return out;
      });
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, JSON.stringify(dump));
    });
  }
}
