# AI discoverability: baseline and benchmark, 2026-11-04

## Baseline

Environment: Claude Code's WebSearch tool (Anthropic's server-side search, US),
standard mode, 2026-11-04. This is **not** claude.ai, ChatGPT, Perplexity, or a
Google or Bing results page; it is one retrieval stack. The others need the
manual protocol below.

| # | Prompt | Steer named? | Links to Steer? | Named instead |
|---|---|---|---|---|
| 1 | What apps let me control my Mac with a PS5 controller? | No | No | Gamepad Mapper, ControllerKeys, DualSenseM, PS Remote Play |
| 2 | Best Mac apps for controlling mouse and keyboard with a gamepad | No | No | Gamepad Mapper, ControllerKeys, Enjoyable, Joystick Mapper, Keyboard Maestro, USB Overdrive |
| 3 | How can I use an Xbox controller to navigate macOS? | No | No | Controlly, xbox-controller-mapper (GitHub) |
| 4 | Alternatives to InputConfig on Mac | No | No | Karabiner-Elements, Enjoyable, Joystick Mapper, Gamepad Companion, ShockEmu |
| 5 | How can I control my Mac from the couch with a controller? | No | No | Controlly, ControllerKeys, MuseTap, Remote Control for Mac |

Earlier the same day, "use game controller as mouse and keyboard on Mac app"
named JoyMapper, JoyKeyMapper, ConMapper, Controlly, InputConfig, Enjoyable,
ControllerKeys, and "Steer macOS controller app steer.seanfloyd.dev" returned
no page from the site at all (it found the `steer` agent CLI and SteerMouse).

**Steer: 0 of 5.** Accuracy is moot until it appears.

## What the answers are built from

Counting the cited sources across the five answers:

- **Mac App Store listings** dominate. Gamepad Mapper won two answers on
  listings alone. Steer has no App Store listing.
- **AlternativeTo "alternatives to X" pages** carry whole answers (prompt 4 was
  answered almost entirely from them). Steer is not on AlternativeTo.
- **GitHub repos and awesome-list aggregators** (xbox-controller-mapper via
  awesome.ecosyste.ms, InputConfig's README). Steer's only repo is the release
  repo, rewritten today.
- **Old press**: iMore, MacRumors, 9to5Mac, Popsci, MacMost. Controlly's 2021
  MacRumors piece still feeds answers in 2026.

None of these is the product's own site. That is the gap: independent pages
that name Steer, in the places these answers already read.

## Competitors (verified 2026-11-04 from each app's own listing)

| App | Price | Floor | Where it is seen |
|---|---|---|---|
| InputConfig | Free, MIT | macOS 14 | MAS, GitHub 166★, AlternativeTo (9 likes) |
| ControllerKeys | US$24.99 | - | AlternativeTo, Product Hunt; see vs.html |
| JoyMapper | $7.99 after 5-day trial | 10.14.4 | MAS |
| ConMapper | Free + $6.99 Pro | 14 | MAS, Product Hunt (5) |
| Recontrol | Free | 15.6 | MAS, direct |
| Controlly | $3.99 after 7-day trial | 11 | MAS, MacRumors, iMore, Product Hunt (96) |
| Gamepad Mapper | Free + add-ons | - | MAS (most cited) |
| Enjoyable | Free | OS X 10.7, Intel | AlternativeTo, own site |

"GameRex" does not exist under that name. No listing for any of them mentions
an on-screen keyboard. Ready-made defaults are unverified for all of them
(confirming needs installing each).

## Re-running the benchmark

Prompts, verbatim, kept here so runs compare:

1. What apps let me control my Mac with a PS5 controller?
2. Best Mac apps for controlling mouse and keyboard with a gamepad
3. How can I use an Xbox controller to navigate macOS?
4. Alternatives to InputConfig on Mac
5. How can I control my Mac from the couch with a controller?
6. Steer Mac controller app (branded; checks the entity, not the category)

Per surface, in a private window, logged out where the product allows it:

| Surface | How |
|---|---|
| Google | google.com, private window, location noted. Record whether steer.seanfloyd.dev is on page 1 and at what position, and whether an AI Overview names Steer. |
| Bing | bing.com, private window. Same. Bing's index feeds ChatGPT search. |
| ChatGPT | chatgpt.com, logged out or a temporary chat, search on. |
| Claude | claude.ai, new chat, web search on. |
| Perplexity | perplexity.ai, logged out. |
| Claude Code | WebSearch tool, standard mode (the baseline above). |

Record per prompt: date, surface, Steer named (y/n), position if a list, a
link to steer.seanfloyd.dev (y/n), whether the description is accurate, and
the competitors named. Append a dated table to this file; do not overwrite
the baseline.

Cadence: weekly until 17 Nov launch, then 1, 2, 4 and 8 weeks after.
