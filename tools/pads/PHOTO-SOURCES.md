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
  The generated Xbox pad shows a share button (the small upload-arrow glyph
  between the View and Menu buttons) that the real Elite Series 2 does not
  have. It is left undrawn in the render's chip legend: no `perapp.json`
  control targets it, and no chip mark was placed on or near it.
  The Switch Pro image is the original 2017 controller (opaque black shell,
  correct face-button glyphs), unlike the Switch 2 Pro stand-in it replaces.

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
