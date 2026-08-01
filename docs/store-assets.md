# Store assets (Lemon Squeezy product images)

Lemon Squeezy renders the product images in the dark left panel of the hosted
checkout, in the email receipt, and in share previews. It recommends
**1600 x 1200 (4:3)**, up to 10MB each. With none set, that panel is a large
empty black rectangle, which is what the checkout shipped as on 2026-07-24.

## The bar: it has to read at 440px

The checkout panel renders a product image at roughly **440px wide**. That,
not the 1600px master, is the size the buyer sees. It is the whole design
constraint and it is easy to skip:

```python
Image.open(card).resize((440, 330), Image.LANCZOS).save(proof)   # then LOOK at it
```

The first attempt at this set failed that test. It centre-cropped the 16:10
demo frames in `screenshots/*.jpg` to 4:3, which is geometrically clean and
perceptually useless: those frames are composed to be watched full-screen,
where the settings-pane detail is the point. At 440px the help-overlay frame
collapsed into grey mush and the gyro frame was a small window adrift in
wallpaper. Only `slot-10-radial` survived, because it is the one frame with a
single large high-contrast subject.

Rule that follows: **one subject, filling the frame, one line of type.** Dense
panes and small floating windows do not survive the downscale, however good
they look at full size.

## Source

`store-cards.html` in the repo root, the same idiom as `og.html`: one file,
1600 x 1200, variant per URL hash, tokens mirroring `styles.css` (the hero's
radial gradient, accent `#0A84FF`, SF Pro stack, SF Mono pill).

| # | hash | card | caption |
|---|---|---|---|
| 1 | `#pad` | the site's own DualSense art, via `scripts/make-pad-card.py` | A mouse needs a desk. Your controller doesn't. |
| 2 | `#grammar` | three input-to-result rows | Point, click, scroll. No desk. |
| 3 | `#radial` | live capture, radial over a real desktop | Aim the stick. Press to launch. |
| 4 | `#typing` | live capture, daisy wheel over a real document | Type without a keyboard. |
| 5 | `#deal` | coverage grid and controller families | Everything, from the pad in your hand. |
| 6 | `#identity` | icon, wordmark, tagline, requirements pill | (none) |

Upload in that order. The first image carries most of the weight and few people
scroll a whole gallery, so the recognizable object and the thesis lead. That
also avoids the mistake the direct competitor makes: its gallery opens on its
app icon and then shows four screenshots of its own mapping UI, which reads as
"settings app" at thumbnail size.

The identity card is last rather than cut: it is the sane fallback for the email
receipt and share preview, where an image travels alone with no context.
`#menubar` is retired. Its visible items were Preferences, Verbose Logging and
Quit, which sells a debug menu.

## Live captures (cards 3 and 4)

The radial and the daisy wheel are **real screen captures**, not composites: the
dev build was driven by injected controller frames while `screencapture`
recorded the screen, so the translucency, the lit selection, and the desktop
behind them are all genuine. Sources: `assets/desk-radial.jpg`,
`assets/desk-typing.jpg`.

Worth the trouble because the shipped overlay screenshots have no selection
state, so a composite could only ever show a wheel aimed at nothing. The thing
worth capturing is the app mid-action.

Five things that cost time:

1. **Frame paths resolve against the container's `Data/`, not `Data/tmp/`.**
   Write frames to `~/Library/Containers/dev.seanfloyd.steer.dev/Data/tmp/` and
   pass `file=tmp/<name>.json`. A bare filename fails silently; the reason
   appears only in the app's log.
2. **Emit one frame per tick.** The replayer plays a frame per tick regardless
   of timestamps, so a 6 second hold is about 750 frames. A short file ends the
   session before the capture fires and the overlay drops its aim.
3. **Every injection TOGGLES a modal overlay.** `.radialMenu` and the daisy
   wheel are toggles (`EventLoop.swift`, `case .radialMenu`), so if the overlay
   is already open your capture run closes it. Cycle close-then-open.
4. **The overlay draws at the cursor**, so compose the crop around wherever the
   pointer was, rather than expecting it centred.
5. **The backdrop must cover the entire screen.** Anything uncovered lands in
   the capture, including the terminal you are working in. A dark-mode Finder
   window on `/Applications` in icon view fills the frame with generic,
   non-personal content and matches the card's dark surface.

Restore afterwards: `steer://debug/disconnect`, set the appearance back, close
the windows you opened.

**Privacy check before shipping a capture:** `desk-radial.jpg` shows a real
`/Applications` listing, so it publishes which apps are installed on this Mac.
At full size a few third-party app names are readable (a VPN client, Tailscale,
WhatsApp, ChatGPT, Claude). That is a software inventory rather than an
identifier, and Sean cleared it, but it IS closer to the line than "nothing
sensitive" suggests. Re-read any re-shoot at full size, and never capture a
Finder window pointed at a personal folder.

## The causation problem, and the one move that solves it

Every asset the project owns shows Steer controlling *Steer*: the cursor
gliding down Steer's own sidebar, the radial on a void, the wheel typing into
nothing. The product claim is "control your whole Mac". Capturing Steer driving
a third-party app does NOT fix this: a cursor over a Safari link contains no
evidence that a controller moved it. A cursor is just a cursor.

What does fix it is the **button prompt chip**. A glyph in a rounded keycap is
a vocabulary every controller owner already reads without being taught, and it
was designed to be legible at keycap size, which is exactly what survives the
440px downscale. The `#grammar` card is built on that: physical input on the
left, Mac result on the right, arrow between. It is the only card that states
what you get rather than what the app looks like.

Hard rule: **every chip must match the shipped default binding.** Check
`SteerCore/Defaults.swift` (`soloLayer`) before drawing one. As of 2026-07-24
the honest set is Cross to left click, Circle to right click, left stick to
cursor, right stick to scroll, and L1 held plus R3 for the daisy wheel. Note the
radial's trigger is NOT universal: `ProfileDefaults` moves it from L3 to R3 on
pads without a gyro (Xbox, MFi), because L3 there takes Mission Control. The
`#grammar` card draws only stick, stick and Cross for that reason: those three
are true on every family. A chip showing a binding the app does not ship is a lie in a
place a buyer will test within five minutes.

Accept the limit too: no static frame proves causation, not even a photograph
of hands would. The site sells the reason, the gallery proves the coverage, and
the demo video is where causation actually lives. Do not ask a card to do the
video's job.

## Render

Render at 2x and downscale, so type and the 512px icon stay crisp:

```bash
cd ~/Developer/steer-site && python3 -m http.server 8933 &
SB=~/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
# NB: `pad` is NOT a store-cards.html variant, it comes from
# scripts/make-pad-card.py (it needs the hero's live CSS). Render it separately.
for v in grammar radial typing deal identity; do
  "$SB" --headless --disable-gpu --force-device-scale-factor=2 --hide-scrollbars \
    --window-size=1600,1200 --screenshot="/tmp/raw-$v.png" \
    "http://localhost:8933/store-cards.html#$v"
done
# then: Image.open(raw).convert("RGB").resize((1600,1200), LANCZOS).save(out, optimize=True)
```

A `file://` URL also works; the local server just avoids any file-scheme image
loading surprises. Output belongs in `scratch/store-cards/` (gitignored);
these are upload artifacts, not site assets. Regenerate, do not archive.

## Two traps already paid for

**Alpha overlays are not windows.** `menubar-dropdown-dark.png` and
`radial-menu-dark.png` are alpha PNGs of translucent overlays that already
carry their own corner radius. A `box-shadow` traces the element *box*, so it
draws a rectangle around a round radial menu and reads as a flat grey card.
Use `filter: drop-shadow(...)`, which traces the alpha, and never add
`border-radius` or a hairline to `.shot`.

**Dense app UI does not shrink.** `assets/dark/settings-*.png`,
`onboarding-test-buttons.png`, and `daisy-wheel-dark.png` are all unusable
here for the same reason: their content is 8-11pt type that disappears below
about 900px wide. They are fine on the site at full width; they are not
product images.

## Excluded: `slot-01-controller`

Its caption ("Your controller, your Mac.") is the best of the four demo
frames, but the frame shows the Settings > Controller pane with the
**Bluetooth MAC address of a real DualSense** legible in the Serial row at
full resolution. Low risk on its own, but a store hero is a worse place for a
device identifier than an unreferenced file.

The source is also already publicly fetchable at
`https://steer.seanfloyd.dev/screenshots/slot-01-controller.jpg` (verified 200
on 2026-07-24). Nothing links to it, but GitHub Pages serves every committed
path. If that matters, delete the frame or re-shoot the pane with a controller
whose identifier you don't mind publishing.

## The coverage card must stay qualified

`#deal` lists only capabilities every supported pad has: cursor, scroll,
shortcuts, app launcher, typing, window snap. Gyro aim, haptics and adaptive
triggers sit on a separate qualified line because they are hardware-conditional,
verified against `SteerCore/ControllerCapabilities.swift`: adaptive triggers are
DualSense alone, gyro is DualSense / DualShock 4 / Switch Pro, and MFi's base set
is battery only. An earlier draft put all nine in one grid directly above the
five family names, which promised an Xbox buyer two things his pad cannot do, on
the image the checkout renders. If you add a row, check the capability set first.

## Light-mode variants

Only dark captures exist. The site's screenshot carousel pairs `assets/light/*`
with `assets/dark/*`, so these two are NOT in it; they are store assets. A light
pair needs a capture round with the appearance verified BEFORE shooting: reading
a background pixel back from a throwaway `screencapture` is the check, because a
restore issued moments earlier had not applied and produced a dark image sitting
in a light-named file.

## The store-card backdrop crop

`src/store-cards.html` composites the overlays over a real desktop rather than a
void, because that is the state the software actually draws.

The backdrop is a clean region of `screenshots/slot-10-radial.jpg`, the
project's own marketing wallpaper, so the card matches the site and the demo
video. Source is 2880x1800.

**The trap:** that frame has its own radial centred at about x1440, extending to
roughly x1900, so the obvious right-hand quadrant (x1680 onward) still catches
its edge. The genuinely clean region is x1900..2880, y820..1555 — 980x735,
exactly 4:3.

Scaled by 1600/980 = 1.63265:

    background-size:     2880*1.63265 x 1800*1.63265 = 4702 x 2939
    background-position: -1900*1.63265, -820*1.63265 = -3102px, -1339px

Recompute these if the source frame is ever replaced, and *look* at the result:
the intrusion is invisible in a thumbnail and obvious at full size.
