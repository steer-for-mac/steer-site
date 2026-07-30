---
title: A line filter over a structured format is silently wrong in a way a parser cannot be
date: 2026-07-30
category: best-practices
module: CSS and HTML tooling (styles/, parts/, bin/build)
problem_type: silent_regression
severity: high
applies_when:
  - about to remove or rewrite rules in a stylesheet with sed, awk, or a Python line loop
  - a "quick" regex edit to HTML or CSS is faster than finding the right tool
  - the same edit has now failed twice and the third attempt is a better regex
  - a diff looks right and the render does not
tags: [css, html, regex, tooling, stylelint, lightningcss, purgecss, refactoring]
---

## The claim

For any format with nesting or continuation, a line-oriented edit is not a
riskier version of the parser-based one. It is a different operation that
happens to agree on simple input. Reach for the ecosystem's parser first, even
when the edit looks like one line.

## The evidence

Removing "dead" `.uc-*` rules from a 98KB stylesheet, three times, each time
with a better filter. Every one broke the page, and never at the rule I touched:

```css
.foo,
.uc-lead { ... }
```

Dropping the line that matches `.uc-lead` leaves `.foo,` dangling, which
swallows the *next* rule into its selector list. The diff reads as one deleted
line. The render loses an entire band. `git diff` cannot show you this, because
the damage is in what the remaining lines now mean.

Two more instances the same day, same shape:

- A regex that inserted `type="button"` into every `<button>` matched tags that
  already carried `type="submit"` later in the attribute list. HTML takes the
  first, so the launch-list form silently stopped submitting. The markup looked
  fine; the attribute order was the bug.
- A regex replacing an SVG glyph, anchored on the *first* match and scanning
  forward to a lookahead, consumed three sibling `<button>` elements between
  them. The pad picker rendered one tab instead of four.

What finally worked was not a better regex. It was Lightning CSS for bundling
(it parses, so it cannot produce a dangling comma), stylelint for finding
duplicates, PurgeCSS for reachability, html-validate for markup. All four found
real defects within minutes of being installed, including a `<button>` set that
had been defaulting to `submit` for months.

## The measurement worth keeping

The hand-rolled reachability checker reported **18.6KB of dead CSS**. PurgeCSS,
which also scans the JS so runtime-applied classes are found, reported **1.9%**
of the same file. An order of magnitude apart, and the hand-rolled number was
the one about to be acted on.

## The shape

Recognise it by the shape of the fix rather than the format:

- You are matching *lines* in something whose grammar spans lines.
- Your filter has an exception list that keeps growing (`.uc-tag` is live,
  `::after` never matches `querySelector`, `.on` is applied by script).
- Each failure produces a more specific regex rather than a different approach.

That growing exception list is the tell. It is a parser being reimplemented one
special case at a time, and the special cases you have not hit yet are the ones
that will bite.

What to do instead: install the tool. The five minutes spent on `npm i -D` is
less than one revert. And if the format has no tool, parse it properly — brace
counting with string and comment awareness is thirty lines and cannot make this
class of mistake.

## Related

- [[validate-the-oracle-before-you-trust-the-measurement]] — the same failure at
  the measurement layer rather than the edit layer
- [[a-default-reference-sweep-skips-hidden-and-ignored-files]]
