# How a page gets made: stages and gates

2026-10-06. Stale by default. Written after the story homepage (128c6fd) passed
every automated gate and still sucked: CI checks that a page works, not that
anyone would be proud of it. Nothing below replaces `make ci`; it is what runs
before it.

## Borrowed from

- The agency sequence: brief, concepts, copy and wireframe, visual design,
  build, polish. Each ends in a review the work can fail
  (centricdxb.com/insights/centric-landing-page-process).
- Julian Shapiro's landing page check, asked of every draft: would you sign up
  now? Interest, 1 to 10? What is still unclear? What can go? What makes you
  doubt it? Test with outsiders for comprehension and insiders for
  difference (julian.com/guide/startup/landing-pages).
- Harry Dry's three tests for each line of copy: can I picture it, can I prove
  it false, could only Steer say it (marketingexamples.com).
- Anthropic's frontend-design skill: commit to one aesthetic direction and
  defend it before writing CSS; generic is a failure, not a safe default.
- Pixar's Braintrust: the panel names problems, never fixes; the maker decides.

## The panel

Fresh agents, Opus, each given only the screenshots and the brief, never the
maker's reasoning. Each answers as its role, scores "proud to put my name on
it" from 1 to 10, and lists blockers.

| Role | Asks |
|---|---|
| Creative director | Is there one idea? Is it memorable? Would this stand next to getartcraft.com and Apple? |
| Copywriter | Dry's three tests per line; Sean's voice; what can go |
| Mac-on-TV user, never heard of Steer | Five seconds: what is it, do I want it, what do I do? |
| Video editor at a desk | Does it know my apps? Is it serious enough to pay for? |
| HN sceptic | What smells fake, AI-made or overclaimed? |
| Accessibility lead | Would this pass for someone on a screen reader, with low vision, or with motion turned off? |

## The gates

| Stage | Made | Passes when |
|---|---|---|
| 0. Brief | One page: who, pain, the one idea, the one action, what is true (`2026-10-06-site-system-design.md` §1 to §2) | Already agreed |
| 1. Concepts | Three different directions, built as the first screen and one scroll, screenshotted at 1440 and 390 | Panel median 7+, one direction chosen; then Sean sees the winner and the two losers |
| 2. Copy and wireframe | Every line of the chosen page, grey boxes | Every line passes Dry's tests; outsider gets it in five seconds |
| 3. Visual design | The page at 1440, 768, 390, both themes, real assets | Panel median 8+, no blocker; then Sean |
| 4. Build | Production code | `make ci` green |
| 5. Polish | Screenshots of the built page, scrolled so lazy images load | Panel median 8+, no blocker; then Sean |

At most three rounds per gate. If it still fails, Sean gets the disagreement,
not another round.
