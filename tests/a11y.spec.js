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

/* One load per page, both themes graded on it. Flipping the attribute and
   re-running axe costs a call; a second test costs a whole navigation, and the
   page is identical either side of the flip. */
for (const page of PAGES) {
  test(`${page} has no axe violations`, async ({ page: p }) => {
    await p.goto(`/${page}`);
    await p.waitForFunction(() => document.fonts.status === "loaded");
    /* Freeze before flipping: body's background transitions and html's does
       not, so mid-flip the text sits on neither palette's surface. */
    await p.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
    const found = [];
    for (const theme of ["light", "dark"]) {
      await p.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      const { violations } = await new AxeBuilder({ page: p }).withTags(TAGS).analyze();
      found.push(...violations.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`));
    }
    expect(found).toEqual([]);
  });
}
