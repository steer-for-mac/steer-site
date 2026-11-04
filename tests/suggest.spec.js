/* /suggest.html is where the app's suggest link lands, so what it opens is the
   whole idea path. Read as served: a 0-second refresh leaves no page to query. */
import { expect, test } from "@playwright/test";

const MAIL = "mailto:steer@seanfloyd.dev?subject=Steer%20suggestion";

test("suggest.html opens a suggestion email, by refresh and by a visible link, and stays out of search", async ({ request }) => {
  const html = await (await request.get("/suggest.html")).text();
  expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${MAIL}">`);
  expect(html).toMatch(new RegExp(`<a class="btn btn-primary" href="${MAIL.replace(/[?]/g, "\\?")}">`));
  expect(html).toMatch(/<meta name="robots" content="noindex/);
  expect(html).not.toContain("github.com/steer-for-mac/steer/");
});
