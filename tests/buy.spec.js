/* /buy.html is compiled into every shipped binary as the Buy button's target,
   so what it forwards to is the whole purchase path. */
import { expect, test } from "@playwright/test";

const LIVE = "https://steer-for-mac.lemonsqueezy.com/checkout/buy/c175b493-e381-405a-a267-a96092650fff";

test("buy.html forwards to the live checkout", async ({ page }) => {
  let landed = "";
  await page.route(/lemonsqueezy\.com/, (r) => { landed = r.request().url(); return r.fulfill({ status: 200, body: "checkout" }); });
  await page.goto("/buy.html");
  await expect.poll(() => landed).toBe(LIVE);
});

test("a post's ?from= tag reaches the checkout, from buy.html or from the page the visit landed on", async ({ page }) => {
  const landed = [];
  await page.route(/lemonsqueezy\.com/, (r) => { landed.push(r.request().url()); return r.fulfill({ status: 200, body: "checkout" }); });
  await page.goto("/buy.html?from=thread-a");
  await expect.poll(() => landed.at(-1)).toBe(`${LIVE}?checkout%5Bcustom%5D%5Bfrom%5D=thread-a`);
  /* A tag cut mid-emoji must not stop the forward: 39 letters, then a pair. */
  await page.goto(`/buy.html?from=${"x".repeat(39)}%F0%9F%98%80`);
  await expect.poll(() => landed.at(-1)).toBe(`${LIVE}?checkout%5Bcustom%5D%5Bfrom%5D=${"x".repeat(39)}%F0%9F%98%80`);
  await page.goto("/index.html?from=thread-b");
  await page.goto("/buy.html");
  await expect.poll(() => landed.at(-1)).toBe(`${LIVE}?checkout%5Bcustom%5D%5Bfrom%5D=thread-b`);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the meta refresh and the visible link both name the live checkout, never the test one", async ({ page }) => {
    await page.route(/lemonsqueezy\.com/, (r) => r.fulfill({ status: 204 }));
    await page.goto("/buy.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("meta[http-equiv='refresh']")).toHaveAttribute("content", `0; url=${LIVE}`);
    await expect(page.locator("main a.btn")).toHaveAttribute("href", LIVE);
    expect(await page.content()).not.toContain("bac9a17c");
  });
});
