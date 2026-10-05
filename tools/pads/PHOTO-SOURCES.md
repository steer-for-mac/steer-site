# Photo sources for the per-app band's controller cutouts

The sources `scripts/pad-cut.py` reads live in `tools/pads/given/`. They were
generated, so nothing can re-download them. The script remakes their Vision
masks when missing (byte-identical on macOS 27). Recorded here per the brief:
source, licence, resolution, date, for each image actually installed, plus superseded and
rejected candidates and why.

## Installed

### DualSense (white), Xbox Elite Series 2 (black), Switch Pro (black) -> `dualsense-src.png`, `xbox elite wireless controller series 2-src.png`, `swpro-src.png`

- **Source:** generated, not photographed. Codex CLI image generation,
  2026-09-27, one 1536x1024 image per pad.
- **Licence:** none needed; no third party's photo or scan.
- **Prompt (summarised, one per pad, DualSense/Elite 2/Switch Pro swapped
  in):** official studio product photograph of a white Sony DualSense
  controller, straight-on front view, flat mid-grey background, accurate
  layout.
- **Notes:** Studio-style, front-on, flat grey backdrop, no cable, no hand.
  Cut with Vision's foreground mask (`subject.swift`) and `scripts/pad-cut.py`
  exactly as the Commons photos were; each mask reported a single instance.
  No grey fringe from the backdrop survives on the site's `#222325` stage,
  checked at 500% on all four edges of each cutout. Cut pads: DualSense
  1202x778, Xbox 1142x757, Switch Pro 1126x732.
  The Xbox source was corrected on 2026-09-28 by a second Codex image edit of
  the first one, which had a Share button the real Elite Series 2 lacks and
  only four ticks round the d-pad. The edit, given the image and a text list
  of the real details (no manufacturer photo), swapped Share for the blank
  profile button, added the pairing pinhole between View and Menu, sixteen
  ticks round the disc, and the three profile lights. Everything else moved
  less than a pixel (phase correlation, <= 0.6 px per part), so the control
  outlines carried over.
  The Switch Pro image is the original 2017 controller (opaque black shell,
  correct face-button glyphs), unlike the Switch 2 Pro stand-in it replaces.

### Xbox Wireless Controller, Series X|S (Carbon Black), DualShock 4 v2 (black) -> `xbox series-src.png`, `dualshock4-src.png`

- **Source:** generated, not photographed. Codex CLI image generation
  (`codex exec`, built-in image tool, codex-cli 0.159.3), 2026-10-04, one
  1536x1024 image per pad. Prompts, logs and the pre-edit Xbox image are in
  the gitignored `scratch/aiimg/pads/gen-2026-10-04/`.
- **Licence:** none needed; no third party's photo or scan.
- **Prompt (summarised):** official studio product photograph of a black
  Xbox Wireless Controller, 2020 Series X|S model / a black DualShock 4 second
  version (CUH-ZCT2), straight-on front view, flat mid-grey background,
  accurate layout, each part listed by position and colour as the checklist
  below names it. Unlike the 2026-09-27 Elite prompt, nothing the real pad
  lacks was asked for.
- **Gate:** each image was checked against a written list of the real pad's
  front details before cutting.
  Sources: Xbox Series from xbox.com's product page
  (https://www.xbox.com/en-US/accessories/controllers/xbox-wireless-controller:
  Share button, hybrid D-pad, textured grip on the triggers, bumpers and
  back-case) and the Carbon Black Commons photo already in `ref/`
  (`xb-carbon.png`, LICENCES.md); DualShock 4 from Sony's parts list
  (https://manuals.playstation.net/document/en/ps4/basic/pn_controller.html),
  SIE's 2016-09-08 release for the v2's touch-pad light strip
  (https://www.sie.com/en/corporate/release/2016/160908d.html) and a Commons
  top view (`ref/commons/ds4-black-top.jpg`, LICENCES.md; a v1, so it has no
  strip).
  - Xbox Series: View, Share and Menu in the centre, Share between and below
    the other two (pass); Xbox button with the logo, top centre (pass); hybrid
    D-pad, a cross over a round faceted dish (pass); ABXY black caps with Y
    yellow top, X blue left, B red right, A green bottom (pass); knurled
    stick rims (pass); bumpers along the top edge (pass; their texture can't
    be seen from straight above, nor in the reference photo); no paddles, no
    profile button, lights or pinhole (pass); top faces of the grips smooth,
    since the dot texture is on the back-case only (**failed** on the first
    image, because the prompt asked for "dot-textured grips"; fixed, below).
  - DualShock 4 v2: light visible as a thin strip along the top edge of the
    touchpad; the bar on the controller's top edge isn't seen from above
    (pass); touchpad, top centre (pass); Share upper-left and Options
    upper-right of it with their small printed labels, legible (pass); PS
    button with the logo between the sticks (pass); speaker grille between
    touchpad and PS button (pass); D-pad of four separate arrow buttons with
    the embossed triangles round them (pass); green triangle, red circle,
    blue cross, pink square (pass); concave sticks (pass); no Create, mute or
    mic (pass). Not quite right: the bottom lip shows one slot where the real
    pad has the EXT port and a headset jack side by side.
- **Edit (Xbox):** a second Codex image edit of the first image removed the
  dot texture from the grips' top faces, keeping everything else. Phase
  correlation per part (sticks, D-pad, ABXY, View/Share/Menu, Xbox button,
  bumpers) moved at most 0.74 px. The DualShock 4 needed no edit.
- **Cut:** `scripts/pad-cut.py xs ds4`. Each Vision mask reported a single
  instance. Cut pads: Xbox Series 1514x1006 native -> 1142x759, DualShock 4
  1525x963 native -> 1202x759. Fringe on `#222325` at 500%: no backdrop
  survives. The DualShock 4's outer edge reads a little brighter than just
  inside it, but that is the image's own ~5 px rim highlight (source row
  across the left grip: backdrop 146, mix 92, rim 68-71, body 46-50). The
  share of soft-edge pixels brighter than the pad just inside them by >15
  levels is 2.9% (Series) and 4.5% (DS4), against 1.6-5.9% for the three
  installed pads. A copy with grey left in the soft edge scored 75%, so the
  count does catch a fringe.
- **Silhouette IoU** (`bin/silcmp.py`, bbox-registered, against real photos
  that are themselves shot slightly off-axis): Xbox Series vs `xb-carbon`
  0.951 (the Elite cut scores 0.935 against it); DualShock 4 vs the Commons
  DS4 0.964 (the DualSense cut scores 0.955 against it, so this metric only
  weakly separates the two PlayStation shells; the Series cut scores 0.869).
- **Outlines:** `scripts/pad-controls.py xs ds4` from `controls/xs.json` and
  `controls/ds4.json`, judged on the overlays in `scratch/controls/`.

## Superseded

### DualSense (white) -> was `dualsense-src.png` (installed 5a41a9d, 2026-09-27)

- **Source:** Wikimedia Commons, [File:KontrolerDualSense.jpg](https://commons.wikimedia.org/wiki/File:KontrolerDualSense.jpg)
- **Licence:** CC BY-SA 4.0 (own work, uploader Xephuwu)
- **Resolution:** 4000 x 3000 (original upload)
- **Uploaded:** 2023-07-26
- **Notes:** Front-on, face-up, white DualSense. A small unrelated object
  (a keychain) sat in the bottom-left corner of the frame, outside the
  controller's silhouette; flat-filled with the sampled background colour
  before running Vision's foreground mask, so `subject.swift` reports a single
  instance rather than merging a second object into the cutout. Cut pad was
  1202 x 812 (>2400px source width before the alpha crop). Sharp, but shot at
  a slight skew and visibly scuffed; replaced by the generated studio photo
  above.

### Xbox Elite Wireless Controller Series 2 (black) -> was `xbox elite wireless controller series 2-src.png` (installed 5a41a9d, 2026-09-27)

- **Source:** Wikimedia Commons, [File:Xbox One Elite Wireless Controller Series 2 (Model 1797).jpg](https://commons.wikimedia.org/wiki/File:Xbox_One_Elite_Wireless_Controller_Series_2_(Model_1797).jpg)
- **Licence:** CC BY-SA 2.0 (uploader mliu92)
- **Resolution:** 4032 x 3024 (original upload)
- **Uploaded:** 2020-11-19
- **Notes:** Genuinely front-on and symmetric, on a plain warm-grey backdrop;
  Vision's mask lifted it cleanly in one instance. Matched the drawn product
  (Elite Series 2). Cut pad was 1142 x 806. Sharp, but visibly scuffed and
  shot at a slight skew; replaced by the generated studio photo above.

### Nintendo Switch Pro Controller -> was `swpro-src.png` (Switch 2 Pro stand-in, unchanged until this pass)

No compliant photo source was found that is simultaneously (a) the original
2017 black Pro Controller -- not the Switch 2 Pro Controller the old source
wrongly was -- and (b) front-on/face-up/straight-on, and (c) >=2400px wide at
the pad. Checked, in the brief's preference order:

1. **Nintendo official.** `nintendo.com/us/store/products/pro-controller/`
   serves its own Cloudinary-hosted product photography (`...-angle`,
   `-back`, `-package`, `-amiibo`) capped at 1200x675 regardless of URL
   transform -- below the resolution floor even before the "front-on" test.
   The support diagram page's controller graphic is served from a
   different, signed Cloudinary path (`csassets.nintendo.com`) that 401s
   without a session; not pursued, since it is a labelled diagram (callouts
   burned in) rather than a clean product photo in any case. The Xbox
   Elite Series 2 press page (`news.xbox.com/.../media/...`) was checked for
   the same reason and is capped at 1080x607 -- also too small, which is why
   Xbox was sourced from Commons instead, per the brief's stated fallback.
2. **Wikimedia Commons.** The only high-resolution (4500x3500, PD,
   Evan Amos/Vanamo Media, 2017) photos of the correct product --
   [File:Nintendo-Switch-Pro-Controller-FL.jpg](https://commons.wikimedia.org/wiki/File:Nintendo-Switch-Pro-Controller-FL.jpg)
   and its BR/-2 siblings -- are all shot as a 3/4 hero angle (the convention
   Amos uses for Wikipedia infoboxes), not face-up. A trial cut (Vision mask
   + `pad-cut.py`, no code changes) confirmed this: the result was visibly
   skewed, with one grip reading larger/closer than the other, unlike the
   flat, symmetric DualSense and Xbox cutouts installed at the time. Fitting
   it would have needed a full projective un-warp, out of scope for the two
   tools named in that brief (`pad-cut.py`'s deskew step only corrects small
   in-plane rotation, not 3D perspective) and would have visibly broken the
   picker's consistency with the other two pads either way.
   The only other correct-product, non-angled Commons candidate,
   [File:Nintendo.Swtich.Pro.Controller.Black.jpg](https://commons.wikimedia.org/wiki/File:Nintendo.Swtich.Pro.Controller.Black.jpg)
   (CC0, 3024x4032, 2024), is a phone snapshot on a couch, itself shot at an
   angle, with visible fabric background and uneven focus -- not an
   improvement.
   The PlayStation Blog's Flickr DualSense photos were also checked as the
   brief's named official channel for that pad; the specific reveal photo
   found (`flickr.com/photos/playstationblog/51177281140/`) is marked
   "All rights reserved," so it was not used in favour of the clearly
   CC-licensed Commons photo installed at the time.

That search is superseded: the site now uses a generated studio image of the
original 2017 Pro Controller (above) rather than any Switch 2 Pro stand-in or
angled photo.
