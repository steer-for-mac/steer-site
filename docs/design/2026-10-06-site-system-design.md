# Site system design: the October 2026 rework

2026-10-06. Stale by default. Requirements, then the message, then the design,
then the build. It supersedes the 2026-09-27 doc in this folder, whose 3D
pipeline and homepage were both abandoned.

Why now: the app was redesigned between 2026-09-29 and 2026-10-05. The site
still shows the circle keyboard, the old ring, the old help table, retired
presets (Mail, Figma, Browser) and retired words ("profile", "Solo", "App
ring"). The mockups and three review rounds behind this doc are at
https://claude.ai/artifact/S92qvki3ppc9hCAZracQBJ (the plan page records each
round).

## 1. Requirements

### The job

The site is the bottom of a funnel with no traffic. It cannot create visitors.
It turns the ones a post, a video or a search sends into launch-list sign-ups,
and hands them one thing worth sharing. Pre-launch until the trial opens.

### Who arrives

"Already owns a controller" is how people find Steer, not who they are. Couch
use is what Mac people ask for unprompted; the work uses earn the price
(pricing brief, 2026-09-27). Breadth beat a single wedge twice, and the
comfort and RSI angle was cut by evidence (`steer/docs/marketing-strategy.md`
§1). Do not lead with either.

| Visitor | Arrives from | First question | Answered by |
|---|---|---|---|
| Mac on the TV | r/macapps, "ps5 controller as mouse mac" | Will my controller work, and can I type? | Hero, controller line under the form, the keyboard |
| Video and photo editors | YouTube shorts, editor forums | Does it know my app? | Gallery cell, the rooms band |
| Developers, AI-agent users | Show HN, agents.html | Can I script it? What leaves my Mac? | Private and Scriptable cells, FAQ |
| Presenters, teachers | Word of mouth | Slides and a pointer? | Rooms band, Gallery |
| Phone visitors (any of the above) | Any link, on the go | Can I see it without a controller? | The demo plays itself; "Send it to my Mac" |

### Functional requirements

- **F1. Say what it is in five seconds.** Pain, then fix: "Your Mac only
  listens to a keyboard and a mouse. Hand it a controller."
- **F2. Prove it on the first screen.** The live demo is the hero picture. It
  plays itself (types with both thumbs, opens the ring of apps, shows the help
  card) until the visitor presses anything, then hands over.
- **F3. One working sign-up in the first screen and at the close.** The real
  form (`ml-form`, `seanfloyd.dev/api/steer-mailing-list`), never `href="#"`.
- **F4. Three reasons to pay, one picture each.** It already works (help
  card), it types (split keyboard), it learns your apps (Gallery, apps only).
- **F5. Depth without duplication.** Ring of apps, Window Snap, how it feels.
  Every app picture appears once on the page.
- **F6. Answer the objections where they arise.** Controller support, setup,
  "my phone is a remote", permissions and what goes online, subscription, why
  this one.
- **F7. A phone visitor has a path.** "Send it to my Mac" (Web Share, or copy
  the link).
- **F8. The demo page travels.** `play.html` has the same demo and its own
  sign-up, so a shared link converts.

### Non-functional requirements

- **N1. Every claim is consumed in the app's source** (`design-rules.md`,
  "Verifying a capability claim"). The claims audit of 2026-10-06 is §5.
- **N2. WCAG 2.2 AA.** Motion that runs over 5 s has a visible stop control
  and does not start under reduced motion (2.2.2). Everything works by
  keyboard. Text over the photo clears 4.5:1 against the lightest 5% of the
  pixels behind it.
- **N3. Plain language.** Sleek and clear to grandma. A control is named in
  plain words where it first appears ("the right trigger types").
- **N4. Hard gates vs house style.** Hard: reduced motion honoured, AA
  contrast, axe clean in both themes, the 11 px floor, no horizontal overflow,
  and JavaScript that degrades gracefully (the page reads and the form posts
  without it). House style, changeable when the design needs it (Sean,
  2026-10-06): the colour and radius tokens, the curb check's lists and
  PurgeCSS. Change the rule or config in the same commit, with the reason.
- **N5. Real pictures, current build.** Captures come from the dev app via
  `just agent` routes, never from a window that names the dev build or the
  user's own apps.
- **N6. Honest pre-launch.** "€19.99 once when it ships"; the trial wording
  follows `TrialCalculator`.

### What happens when

- **A visitor has no controller.** The demo plays itself; the keyboard keys
  drive it too, behind "No controller? Use your keyboard".
- **A visitor is on a phone.** The demo plays as a picture of the app working,
  the form sits above it, and "Send it to my Mac" replaces "Try it".
- **Reduced motion.** The demo shows its still frame (keyboard open, a word
  typed) and never moves by itself.
- **JavaScript is off.** The still frame and both forms still work (the form
  posts natively).
- **A visitor presses a key while it plays.** It stops at once, says "You're
  driving", and the press counts.
- **The app changes a default.** The demo's mapping cites its source lines;
  the claims check runs again before the copy changes.
- **The launch date is set.** It goes next to the form ("One email, the day
  the trial opens: <month>").
- **Sean picks a launch-list price.** It replaces the reassurance line under
  the form, and nowhere else.

## 2. What the page says, in order

1. **Promise:** Your Mac only listens to a keyboard and a mouse. Hand it a
   controller.
2. **Proof:** the demo, playing itself; a chip under each press says the
   button in plain words.
3. **Sign up:** the form, then "Works with DualSense, Xbox, Switch Pro and
   300+ others. One email, the day the trial opens."
4. **Who it's for:** From the sofa to the desk. Three rooms, each with the job
   and the button.
5. **Three reasons:** It already works. It types. It learns your apps.
6. **Getting around:** your apps in a ring; windows where you want them.
7. **Feel it, then make it yours.**
8. **Pay once, keep it:** €19.99 once when it ships, private, your
   controller, scriptable.
9. **Questions.**
10. **Close:** the form again.

## 3. Design

- **Type.** SF Pro only. The playful word in a headline is set in the accent
  colour, not a second face: New York falls back to Georgia off Apple devices
  and the owner doubted it (round 3).
- **Hero.** A night field in both themes with the sofa photo behind the
  promise, under a shade deep enough that every line clears 4.5:1; the demo
  rises over the photo's edge in a dark frame.
- **The ruled frame.** Sections below the hero hang on one hairline grid:
  a label row, a large heading, then cells. No eyebrows, no numbering.
- **Pictures.** Real captures at 2x, light and dark pairs, swapped by theme.
  One job each:

| Picture | Job | Where |
|---|---|---|
| The live demo | Try it before you trust it | Hero, play.html |
| Room photos | Who and where | Rooms band only |
| Help card | Every button has a job | Pillar one, the only controller picture |
| Split keyboard | It types | Pillar two |
| Gallery, apps only | It learns your apps | Pillar three |
| Ring of apps | Switch apps | Getting around |
| Window Snap | Windows where you want them | Getting around |
| Controls tiles | How it feels | Feel |

## 4. Build

Slices, each green on `make ci`, on `redesign/oct-2026`, not pushed:

1. This doc.
2. Captures into `src/assets/app/`, light and dark, with their routes.
3. The demo: `src/scripts/steer-demo.js` and `bands/play/demo.html` replace
   `pad-demo.js` and the circle keyboard, on `play.html` and the homepage.
4. The homepage: new bands under `bands/home/`, the logi2 bands and their
   scripts and tests retired.
5. `design-rules.md` amended where this design deliberately departs from it.

## 5. Claims, checked 2026-10-06

Verified in source unless marked. Paths are under `steer/Steer/Sources/`. Base buttons `SteerCore/Defaults.swift:49-69`.
Keyboard `Steer/EventLoop+OnScreenKeyboard.swift:51-96`, cursors on F and J
`SteerCore/SplitKeyboard.swift:282-286`. Ring apps
`SteerCore/RadialMenuDefaults.swift:60-70`. Window Snap engines
`WindowManagerPresets.swift:102`. Trial `Purchase/TrialCalculator.swift:4`.
Licence check sends the key, a fixed name and an instance id
(`Purchase/DirectLicensing.swift:212-233`). Updates only when asked
(`SUEnableAutomaticChecks=false`). 315 SDL controller entries.

Cut, pending proof:

- **"Every Mac you use".** Terms allow it (`src/terms.html:13`), but each Mac
  activates against the store's activation limit, which nobody has checked.
- **"No private APIs".** `SteerCore/AppleTermsRuntime.swift:36` reads a string
  table from a private framework's resources. Not a private API call, but the
  absolute needs an audit.
- **"Works fully" on every pad.** Switch Pro has no light colour or trigger
  resistance (`ControllerCapabilities`).
- **"History keeps every change".** It keeps restore points.

## 6. Decisions for Sean

- A launch date or window for the line under the form.
- A launch-list price, e.g. €14.99 for the first week (costs about €3.84 a
  sale against €19.99 net; untested).
- The store's activation limit, before "every Mac you use" returns.
- A private-API audit, before "no private APIs" returns.
