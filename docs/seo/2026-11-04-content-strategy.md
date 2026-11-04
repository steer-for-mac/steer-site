# Content strategy for search, 2026-11-04

Rule: one page per real question, no page per keyword. The brief's eight
intents collapse onto pages that already exist plus one new one.

## Intents to pages

| Intent | Page that answers it | State |
|---|---|---|
| Control Mac with a game controller | `/` (title, description, the four questions) | Exists |
| Use a PS5 controller as a Mac mouse | `/`, `compatibility.html` (DualSense row) | Exists |
| Use an Xbox controller as a Mac mouse | `/`, `compatibility.html` (Xbox rows) | Exists |
| Use a controller as a keyboard on macOS | `/` "Can I really type with a controller?", `help.html#on-screen-keyboard` | Exists; Help is new |
| Navigate macOS with a gamepad | `features.html`, `help.html` (controls, radial menu, menu palette, Window Snap) | Help is new |
| Control a Mac from the couch | `/` hero ("On the sofa") | Exists |
| Use the DualSense touchpad on a Mac | `compatibility.html`, `help.html#touchpad` | Help is new |
| Gamepad mouse and keyboard mapping on Mac | `help.html` (changing what a button does, layers, per-app) | Help is new |
| Alternatives to InputConfig / free remappers | nothing yet | Gap, see below |

## Pages created or changed today

- **help.html** (new). The app's own Help, rendered at build time from
  `src/public/llms-full.txt` by `src/_data/help.js`: 30 sections, about 4,900
  words, setup through troubleshooting. Verified by construction: it is the
  text the app ships. The JSON action list and the settings schema stay in the
  .txt only. Old versions stay as `docs/<version>/llms-full.txt`, never HTML,
  so there is one canonical Help page.
- Footer: "Help & contact" split into **Help** and **Contact**.
- support.html: "Help guide" now links help.html.
- compatibility.html: "the touchpad" and "tilt-to-aim" in the lead link their Help sections.

## Internal links still worth adding

- `/` "Is it fiddly to set up?" band → `help.html#getting-started`.
- `features.html` "What else is in there?" list → the matching Help sections.

Each is one anchor in an existing sentence; no new copy.

## Gaps

1. **A comparison against the free field.** Searches for alternatives are
   answered from AlternativeTo and InputConfig's own README. A page comparing
   Steer with InputConfig, JoyMapper, ConMapper, Recontrol and Controlly would
   target that, but it is a positioning change and design-rules require a
   source per row, so it is **not built**. Two facts are verified enough to
   lead it: no rival listing mentions an on-screen keyboard, and InputConfig
   is free and open source (say so plainly). Whether rivals ship working
   defaults needs each one installed.
2. **No App Store listing.** The single biggest source in the baseline. A
   distribution decision, not a page; recorded so it is weighed.
3. Support's "Activation isn't final yet" is stale since sales opened.
