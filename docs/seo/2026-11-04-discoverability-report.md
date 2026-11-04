# Discoverability report, 2026-11-04

Detail: `2026-11-04-seo-audit.md`, `2026-11-04-content-strategy.md`,
`2026-11-04-ai-discoverability.md` (beside this file).

## 1. Initial problems

- The site was never submitted to Google or Bing, and nothing pinged them.
  Indexing state is unverified; the search checks that came back empty prove
  nothing on their own.
- The sitemap was hand-written and frozen at 2026-07-17.
- The app's 4,900-word Help existed only as `llms-full.txt`, so no searchable
  page answered setup, keyboard, touchpad or troubleshooting questions.
- No structured product record.
- The public release repo described itself as "private until launch".
- No independent page anywhere names Steer. Every AI answer in the baseline is
  built from App Store listings, AlternativeTo, GitHub and old Mac press.

## 2. Changes implemented

| Change | Where |
|---|---|
| Sitemap generated from the pages, dated by last commit | 2a89043, 59b5b54 |
| IndexNow ping after every deploy (first ping: 202) | 2a89043 |
| SoftwareApplication JSON-LD on `/` (no ratings) | 2a89043 |
| `help.html`: the app's Help as a crawlable page | this commit |
| Footer Help link; support and compatibility link into Help | this commit |
| steer-dist description, homepage, topics, README | steer-dist 8a6b2fd |
| Buy link fixed after the store's subdomain moved | 08cc9af |

## 3. Before and after

| Check | Before | After |
|---|---|---|
| Sitemap URLs / dates | 12, all 2026-07-17 | 13 (adds help.html), real dates |
| Structured data on `/` | none | SoftwareApplication, valid JSON |
| Words of crawlable how-to content | 0 | ~4,900 |
| Lighthouse SEO, `/` | not run | 92 (only failure: Content-Signal line, kept) |
| Search engine notified on deploy | no | IndexNow, 202 |
| Baseline AI benchmark | - | Steer in 0 of 5 answers |
| `make ci` | - | passes (259 browser tests) |

## 4. Remaining issues

- Indexing unverified until Search Console and Bing Webmaster are set up.
- No independent references (directories, lists, press, threads).
- No comparison page against the free apps (positioning; needs approval).
- No App Store listing, the most-cited source type in the baseline.
- `play.html` (the demo) is noindex.
- No named seller, so no Organization record.
- support.html still says activation "isn't final yet".

## 5. Needs Sean

1. **Google Search Console and Bing Webmaster Tools**: verify the domain,
   submit `https://steer.seanfloyd.dev/sitemap.xml`, run URL Inspection on
   `/` and `/help.html`. Bing can import from Search Console. 15 minutes.
2. **AlternativeTo**: list Steer, and add it as an alternative to InputConfig,
   ControllerKeys, Controlly and Enjoyable. The baseline answered "alternatives
   to InputConfig" from AlternativeTo alone. Its account needs to be 7 days old
   (unverified), so start now.
3. **awesome-mac** (jaywcjlove, accepts paid apps) and **awesome-macOS**
   (iCHAIT, accepts paid apps with a trial): one PR each. Neither lists any
   controller-to-mouse app today. I can draft both PRs; you open them.
4. Decide: index `play.html`? Name the seller on terms? Build the comparison
   page? Weigh an App Store listing?
5. The launch itself (`steer-business/launch/`): Show HN, r/macapps, the
   pitches. That is what produces the independent pages AI answers cite. This
   report's work only makes sure they land on something.

## 6. Future work, by expected effect

1. The 17 Nov launch and the pitches (largest effect by far).
2. AlternativeTo and the two awesome lists (cheap, directly cited sources).
3. Replies in existing threads (Reddit is heavily cited by ChatGPT; needs
   Sean's browser).
4. The comparison page, once approved and sourced.
5. Remaining internal links (content strategy doc).

## 7. Monitoring

- **Weekly**: Search Console (indexed pages, impressions, queries, clicks)
  and Bing Webmaster (same), once set up.
- **Weekly until launch, then +1, +2, +4, +8 weeks**: the six benchmark
  prompts in `2026-11-04-ai-discoverability.md`, appended as dated tables.
- **Each deploy**: the "Ping IndexNow" step should answer 200 or 202.
- **Conversions**: buy.html forwards `?from=` into the checkout's custom data,
  so Lemon Squeezy orders show their source. The site has no analytics by
  design; do not add any without deciding to.

No ranking or indexing improvement is claimed here. None has been observed yet.
