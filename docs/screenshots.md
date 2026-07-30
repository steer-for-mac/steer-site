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

## Why nothing new went in the page (2026-07-30)

The homepage below the hero shows no product image at all on the default
controller pick, and still does: the one in-flow shot is gated to the Nintendo
pad and the other seven panes sit behind a button. Panes were tried in the Feel
band and closing Capabilities, and pulled back out, for two reasons that this
file mostly already predicted.

1. **They read as configuration.** In the page, a settings pane says "you can
   configure this", which argues against the section it sits under.
2. **Every capture is PlayStation-labelled** and the page re-labels itself per
   pad. The Haptics pane's trigger presets read "L2 / R2", `daisy-wheel` shows
   L1/L2/R1/R2/R3, `radial-menu` shows PS face glyphs. Showing any of them to an
   Xbox owner is a wrong claim; gating them back to one pad is what left the
   Feel band empty in the first place. **The unblocking work is a per-pad
   re-shoot**, which makes the blockers below the critical path for the
   homepage's visual density, not just for the gallery's ordering.

`import-review` remains the largest unspent asset: the Trust band's strongest
claim, "anything risky is shown to you first", is prose with nothing behind it,
and that dialog is the only possible evidence for it. It is also the one capture
with no controller glyphs in it, so it is the only one shippable today. Note it
carries an em-dash in the app's own title string.

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
