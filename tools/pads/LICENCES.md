# Mesh and reference provenance

2026-09-27. Every file was downloaded anonymously. The sha256 values are for the files in `dl/`;
`fetch.py` holds the same pins with each file's URL and downloads them again.

The site treats the Xbox and DualSense shells as CC BY-SA (below), so a render made from them is
shared under CC BY-SA too and must credit the authors wherever it ships. None ships today: the
per-app band's `src/assets/pads/cut-*.png` are generated studio images (510dbae), not renders.

## Used

| pad | model | author | source | licence | commercial use | sha256 |
|---|---|---|---|---|---|---|
| xb | Xbox Series X\|S Controller | TimHanewich | https://www.thingiverse.com/thing:6497183 (thing zip) | CC BY-SA (Thingiverse "cc-sa"; the version isn't stated in the zip) | Yes, with attribution. ShareAlike: a render is arguably an adaptation, so the renders are released under CC BY-SA (decided 2026-09-27). | zip `9d51313041a82d2770c8710c2264274b191bb6a05782b3947af6e587b69d5ced` |
| ps | Dualsense PS5 scan | Pprk31 | https://www.printables.com/model/1508424 | CC0 per Printables; treated as CC BY-SA (see the warning below) | Yes, with attribution | 3mf `9913550849b0931b642baff7602032087a66fdf3d72fe2ddae848f7feb65a957`; `dualsense.stl` is converted from it by `fetch.py` |
| sw | Switch Pro Controller Scan (Front, Back, Back Cover, Grip) | Andrei Azoitei | https://www.printables.com/model/531537 | CC0 | Yes | Front `af260c33b4265822229ad7f20f97755d03abf89b287ef8002311735464a2db00`, Back `db00c4873fe6f8716c93a8a7e9017dbf82beadcc8cbfccd6f47a67ed00c121e8`, Back Cover `90427d076e0a07b3ef0f2ebb04c9cb9ce0a8ebf500bcd00c9918c69b8c56022c`, Grip `5739ec1c346222fc0c0b576e327667b081250fd3771a83bbdea01aa33f583702` |

Warning on ps: the Pprk31 CC0 mesh has the same bounding box (159.7 × 105.7 × 65.8 mm) as
Thingiverse 6978614 by Pheloptir, which is CC BY-SA. That points to a shared origin, possibly a
re-upload under a different licence. I haven't verified it, so the site treats the ps shell as CC BY-SA
and credits Pprk31, until someone compares the two meshes vertex by vertex.

All controls (buttons, sticks, d-pads, bumpers) are authored in `scene.py` and are not taken from
these meshes. The brand marks carried by the meshes are pressed flat: the Xbox guide logo and the
back "XBOX" text, the PS logo button, and the Nintendo oval on the Switch back cover.

## Scoring references (never shipped, never tracked)

`labels/*.json` and `bin/gripfit.py` read these from `ref/`, which is gitignored. Fetch them by hand
from the sources below to run the feature diff; the render itself does not need them.

| file | source | licence |
|---|---|---|
| `ref/cut-{ps,xb,sw}.png` | the site's current cutouts (manufacturer images); recover with `git show 66bcf2b~1:src/assets/pads/cut-PAD.png` | not ours; used for measurement only. `cut-ps` and `cut-xb` (an Elite Series 2, which the xb pad now renders) are the geometry and colour references and the perceptual gate's targets; `bin/psmasks.py` and `bin/xbgrip.py` trace masks off them |
| `ref/swpro-zelda.jpg` | https://commons.wikimedia.org/wiki/File:Nintendo_Switch_Pro_Controller_Zelda.jpg, TaurusEmerald | CC BY-SA 4.0 |
| `ref/swpro-commons.jpg`, `ref/sw-black.png` (rotated, cut out) | https://commons.wikimedia.org/wiki/File:Nintendo.Swtich.Pro.Controller.Black.jpg, LordBirdWord | CC0. The Switch geometry reference since 2026-09-27 (the original 2017 Pro; `cut-sw` is a Switch 2 Pro) |
| `ref/commons/xb-lunar.jpg`, `ref/xb-lunar.png` | https://commons.wikimedia.org/wiki/File:Xbox_Series_Controller_Lunar_Shift.jpg, DirtLover03 | CC BY-SA 4.0. The Series geometry reference until the pad became the Elite Series 2 (2026-09-27); no longer read by `labels/` |
| `ref/commons/xb-carbon.jpg`, `ref/xb-carbon.png` | https://commons.wikimedia.org/wiki/File:Xbox_Series_Controller_Carbon_Black.jpg, UKER | CC BY-SA 4.0. The Series colour reference until 2026-09-27; no longer read by `labels/` |
| `ref/commons/sw-fl.jpg` | https://commons.wikimedia.org/wiki/File:Nintendo-Switch-Pro-Controller-FL.jpg, Evan-Amos | Public domain. Switch colour reference (studio shot) |
| `ref/commons/sw-fl2.jpg` | https://commons.wikimedia.org/wiki/File:Nintendo-Switch-Pro-Controller-FL-2.jpg, Evan-Amos | Public domain. Looked at, not scored |
| `ref/commons/ds4-black-top.jpg` | https://commons.wikimedia.org/wiki/File:Sony_DualShock_4_wireless_controller_for_PlayStation_4_(black)_-_top_view.jpg, ITEagle Europe - Sebastiaan Broekhoven | CC BY-SA 4.0. The DualShock 4 silhouette and detail reference for the generated `dualshock4-src.png` (PHOTO-SOURCES.md, 2026-10-04); a v1, so no touch-pad light strip |
| `ref/commons/ds-png.png` | https://commons.wikimedia.org/wiki/File:Playstation_DualSense_Controller.png, Alex Cochrane | CC BY-SA 4.0. The three-quarter check for the DualSense's black/white split |
| `ref/commons/xb-lunar.jpg` etc. | all fetched anonymously with a generic browser User-Agent | |

## Rejected

| model | source | licence | reason |
|---|---|---|---|
| DualSense PS5 Controller Model, Pheloptir | thingiverse.com/thing:6978614 | CC BY-SA | Wrong button layout: face buttons on both sides |
| Xbox series x/s Controller scan, roucelee | thingiverse.com/thing:6375820 | CC BY-SA | Noisy scan with a blobby surface |
| DualSense PS5 Controller, Referentiel | printables.com/model/678413 | CC BY-NC-ND | NC and ND licence: unusable |
| High-res Switch Pro Controller Scan, FabTech | printables.com/model/1257060 | CC BY | It's a PDP third-party pad, not the Nintendo one |
| Xbox controller scan, Dadudos | printables.com/model/1749309 | CC0 | PDP third-party pad, with holes |
| PS5 controller scan, Kabliga | printables.com/model/407609 | CC BY-NC-SA | NC licence: unusable |
| Xbox Controller 3D Scan, cartesiancrafts | printables.com/model/292323 | CC BY-NC-ND | NC licence: unusable |
| Nintendo Switch Pro Controller 3D Scan, Fr4nc3 | thingiverse.com/thing:5805593 | ? | The zip endpoint returned HTML; not retrieved |
