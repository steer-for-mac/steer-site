import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

/* Same two widths layout.spec.js uses, for the same reason: the sheets change
   behaviour between them and text that fits at one can shrink at the other. */
const WIDTHS = [1440, 375];

/* 11px is not a taste call. It is the smallest type the site deliberately sets
   anywhere -- `.eyebrow`, on nine pages -- measured across every rendered text
   node in dist/. Nothing else on any live page goes below it, so a floor here
   passes the site as built and bites only drift.
   The number that made this a gate: the hero's controller annotations size off */
const FLOOR = 11;

/* Fixed-size render canvases, not responsive pages -- same exclusion, and the
   same reason, as layout.spec.js. The hero-*.html files are unlinked, noindex
   comps kept for comparison; they are not the site and several deliberately set
   10.5px spec tags on placeholder blocks. */
const SKIP = (f) => ["og.html", "store-cards.html"].includes(f) || f.startsWith("hero-");

const PAGES = readdirSync("dist").filter((f) => f.endsWith(".html") && !SKIP(f)).sort();

for (const page of PAGES) {
  for (const width of WIDTHS) {
    test(`${page} sets no visible text below ${FLOOR}px at ${width}px`, async ({ page: p }) => {
      await p.setViewportSize({ width, height: width < 500 ? 812 : 900 });
      await p.goto(`/${page}`);
      await p.waitForFunction(() => document.fonts.status === "loaded");
      const small = await p.evaluate((floor) => {
        const out = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const text = n.nodeValue ?? "";
          if (!text.trim()) continue;
          const el = n.parentElement;
          if (!el) continue;
          const cs = getComputedStyle(el);
          /* offsetParent alone is not enough: the three unselected controllers
             are visibility:hidden, which keeps a layout box and a non-null
             offsetParent. Their annotations are real text a reader can reach by
             pressing the picker, so they are checked, not skipped -- only
             display:none subtrees are genuinely absent. */
          if (cs.display === "none" || cs.visibility === "collapse") continue;
          /* Decoration is not reading. The face-button letters and the plate
             caption are drawn ON the controller, at the drawing's scale, and
             macros/pad.njk marks them aria-hidden for exactly that reason:
             "part of the drawing, not of the reading". A real photo of a pad
             has 3px letters on it too. Gating them would fire ~100% false and */
          if (el.closest('[aria-hidden="true"]')) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          const px = parseFloat(cs.fontSize);
          if (px >= floor) continue;
          out.push(`${px.toFixed(2)}px ${el.tagName.toLowerCase()}.${el.className} "${text.trim().slice(0, 30)}"`);
        }
        return [...new Set(out)];
      }, FLOOR);
      expect(small, `${small.length} text node(s) under ${FLOOR}px:\n  ${small.join("\n  ")}`).toEqual([]);
    });
  }
}
