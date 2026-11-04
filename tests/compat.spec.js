/* The controller lookup on compatibility.html: three tiers and an unknown, all
   answered from data the build inlined. Each case is one a reader will type. */
import { expect, test } from "@playwright/test";

test.describe("controller lookup", () => {
  /* Nothing leaves the page: any request after load is a regression. */
  let fetched;
  test.beforeEach(async ({ page }) => {
    await page.goto("/compatibility.html");
    fetched = [];
    page.on("request", (r) => fetched.push(r.url()));
  });
  test.afterEach(() => { expect(fetched).toEqual([]); });

  const box = (page) => page.getByRole("combobox", { name: "Look up your controller" });
  const out = (page) => page.locator("#pad-out");

  test("is a labelled combobox wired to a list of names", async ({ page }) => {
    await expect(box(page)).toBeVisible();
    await expect(box(page)).toHaveAttribute("list", "pad-names");
    expect(await page.locator("#pad-names option").count()).toBeGreaterThan(5);
    await expect(out(page)).toBeEmpty();
  });

  test("a tested pad says so, by name or by nickname", async ({ page }) => {
    await box(page).fill("DualSense");
    await expect(out(page).locator(".pad-tier")).toHaveText("Tested on hardware");
    await box(page).fill("ps5 controller");
    await expect(out(page).locator(".pad-name")).toHaveText("DualSense");
  });

  test("the longer name wins inside a longer query", async ({ page }) => {
    await box(page).fill("my Sony DualSense Edge");
    await expect(out(page).locator(".pad-name")).toHaveText("DualSense Edge");
    await expect(out(page).locator(".pad-tier")).toHaveText("Expected to work");
  });

  test("an expected pad names what Steer cannot do on it", async ({ page }) => {
    await box(page).fill("PS4");
    await expect(out(page).locator(".pad-tier")).toHaveText("Expected to work");
    await expect(out(page).locator(".pad-note")).toContainText("No triggers that push back");
  });

  test("a prefix waits while typing, then answers on Enter", async ({ page }) => {
    await box(page).fill("stad");
    await expect(out(page)).toBeEmpty();
    await box(page).press("Enter");
    await expect(out(page).locator(".pad-name")).toHaveText("Stadia Controller");
  });

  test("an ambiguous prefix asks the reader to pick", async ({ page }) => {
    await box(page).fill("xbox");
    await box(page).press("Enter");
    await expect(out(page)).toContainText("Pick one from the list");
  });

  test("a pad in the beta list says beta, never confirmed, and asks for results", async ({ page }) => {
    await box(page).fill("8BitDo Pro 2");
    await expect(out(page).locator(".pad-tier")).toHaveText("In the beta list");
    await expect(out(page).locator(".pad-note")).toContainText("never been confirmed on real hardware");
    await expect(out(page).getByRole("link", { name: "tell us how it goes" })).toHaveAttribute("href", "suggest.html");
  });

  test("a name in both lists keeps the named pad's tier", async ({ page }) => {
    await box(page).fill("PS5 Controller");
    await expect(out(page).locator(".pad-tier")).toHaveText("Tested on hardware");
    await box(page).fill("Nintendo Switch Pro Controller");
    await expect(out(page).locator(".pad-tier")).toHaveText("Expected to work");
  });

  test("suggestions stay a short list while typing, and come back when cleared", async ({ page }) => {
    const options = page.locator("#pad-names option");
    const initial = await options.count();
    await box(page).fill("8bitdo");
    await expect(options).toHaveCount(8);
    await box(page).fill("hori");
    expect(await options.count()).toBeLessThanOrEqual(8);
    await expect(options.first()).toHaveAttribute("value", /hori/i);
    await box(page).fill("");
    await expect(options).toHaveCount(initial);
  });

  test("an unknown pad gets a link to tell us, and clearing the field clears the answer", async ({ page }) => {
    await box(page).fill("Zorblax 9000");
    await expect(out(page).locator(".pad-name")).toHaveText("Not on the list");
    await expect(out(page).getByRole("link", { name: "Tell us which one" })).toHaveAttribute("href", "suggest.html");
    await box(page).fill("");
    await expect(out(page)).toBeEmpty();
  });
});

test("without JavaScript the lookup stays hidden and the table still answers", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/compatibility.html");
  await expect(page.locator("#pad-lookup")).toBeHidden();
  await expect(page.locator("table.matrix")).toBeVisible();
  await ctx.close();
});
