import { readdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/* best-practice is not garnish: heading-order and landmark-one-main carry that
   tag rather than a wcag one, so a wcag-only list runs green over a broken
   heading level. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const PAGES = readdirSync("dist").filter((f) => f.endsWith(".html")).sort();

/* axe's colour rules read painted pixels, so the width decides which nodes
   exist to grade. 1440 is the layout with the most on screen. */
test.use({ viewport: { width: 1440, height: 900 } });

for (const page of PAGES) {
  for (const theme of ["light", "dark"]) {
    test(`${page} has no axe violations (${theme})`, async ({ page: p }) => {
      await p.goto(`/${page}`);
      await p.waitForFunction(() => document.fonts.status === "loaded");
      /* Freeze before flipping, or the flip is what gets graded: shared.css
         transitions body's background over .3s and html's not at all, so for
         300ms the text sits on a half-blended surface and axe read 1.1:1 on
         eight nodes that pass at rest. */
      await p.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
      await p.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      const { violations } = await new AxeBuilder({ page: p }).withTags(TAGS).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}
