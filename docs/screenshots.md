# Screenshots and the gallery

State of the app screenshots and what the gallery should become. Written
2026-07-19. Regeneration mechanics live in the auto-memory
`screenshot-regen-workflow`; this file is the editorial argument.

## The problem: the gallery argues against the page

All seven gallery slides are **settings panes**. Every one. Meanwhile the
Capabilities heading now claims *"It works the moment you plug in... no setup to
finish first."* A skeptic opens the gallery and sees a configuration project.

User research over this category was blunt about it: *"a good default that works
in the first sixty seconds is worth more than a deep settings panel. Ship the
panel, but do not lead with it."* The gallery leads with it seven times.

The gallery's job should be to answer doubts in the order a buyer has them, not
to tour the preferences window.

## Proposed order

| slide | proves |
|---|---|
| menubar dropdown | it is a menu-bar app, not a window |
| onboarding, Test Buttons | it works on plug-in |
| **daisy wheel** | you can actually type, the biggest doubt |
| radial menu | a ring of your apps |
| buttons | and you can change anything |
| profiles | it follows you between apps |
| haptics | the feel |
| **import review** | anything risky is shown first |
| scripting | there if you want it |

The two in bold are worth more than the rest combined. Typing is the category's
number one abandonment cause and the daisy wheel is what users ask for by name.
The import-review dialog is the **only possible evidence** for the strongest
trust claim on the site, which is currently prose with nothing behind it.

## What exists today

Current matched set, `assets/light/` and `assets/dark/`, 2026-07-18,
2000x1760: 15 settings panes in both themes, plus `overlay-help.png` and
`overlay-wizard-welcome.png` in **light only** (a light-only image breaks the
gallery, whose JS picks `data-dark` when the theme is dark).

Unused, `assets/` root, 2026-07-16, mixed sizes and aspect ratios:
`daisy-wheel`, `radial-menu`, `menubar-dropdown`, `import-review` (all with dark
twins), and `onboarding-test-buttons` (light only). These are the only captures
of the app *in use* rather than being configured.

`settings-radialMenu` exists in the current set in both themes and is unused.
Note it is the radial menu's **settings pane**, not the overlay.

## Blockers and gotchas

- **`scripts/refresh-design-shots.sh:24` still points `DEV_APP` at `Steer.app`**
  and the dev app is now `Steer Dev.app`. Fix before any run.
- **The script already produces everything needed.** `--overlays` gives the
  daisy wheel and radial menu, `--menubar` the dropdown, `--wizard` walks
  onboarding. The 18 July run was settings-only, which is why light/dark holds
  panes and nothing else. This is a re-run, not new work.
- **The wizard walk has never produced surviving output.** There are no
  `onboarding-*` files in `marketing/design-feed/` at all. It is the most
  fragile part of the script: position-based SwiftUI clicking across up to 14
  steps. The wizard is 11 steps.
- **Onboarding needs state, not just a capture.** The existing
  `onboarding-test-buttons.png` reads `0/18 confirmed` with a dash beside every
  control, so it shows the scaffolding rather than the app recognising a
  controller. Press a dozen buttons before capturing. It also carries a stray
  blue focus ring on Skip, left by the automation, on a page that claims no
  touch-ups. **Shoot the onboarding steps by hand.**
- **Aspect ratios differ.** Settings panes are 1.136 landscape; the in-use
  captures are 0.889 and 0.795 portrait, 1.358, and 1.083. Mixing shapes in the
  lightbox is a design decision to make before shooting, not after.

## Related

- The demo video slot is already wired: drop `assets/demo.mp4` in and uncomment
  the block in the gallery. The counter follows automatically because the JS
  counts `.shots-item`.
- The daisy-wheel screenshot partially de-risks the video, since typing is the
  claim most likely to be disbelieved and that shot answers it statically. It
  carries the app's own caption, *"left stick aims, face button commits"*, so it
  explains itself without marketing copy.
- The `.vg-type` vignette was built from `DaisyWheelLayout`; the screenshot
  independently confirms it (a and c really do share the north cluster).
