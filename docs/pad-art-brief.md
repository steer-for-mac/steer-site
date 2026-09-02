# Brief: layered controller art from manufacturer renders

Build `src/_includes/art/hero-pad-{ps,xb,sw,mf}.svg` from product renders.
Output: named groups, `var()` fills only (curb rejects hex), themeable, reusable
by the macOS app's interactive diagram. These replace the hand-drawn SVGs
entirely — do not preserve them.

**The unmet goal, stated plainly.** Parts are found and named correctly now.
What does not work is *rendering* them: a button comes out as one flat filled
circle. There is no glyph, no bezel ring, no per-part bevel, and no way to say
"this group gets this fill, that stroke, this gradient". The linework is 132
undifferentiated Canny contours. Read §7 first — the geometry you need is
already being detected and thrown away.

---

## 1. Where everything is

Pipeline (all gitignored, all `#!/usr/bin/env -S uv run --script`):

    scratch/trace/padparts.py      shared part enumeration. THE single source of
                                   truth: sam_parts(), canny_parts(),
                                   merge_parts(), iou()
    scratch/trace/label.py         parts -> numbered plate PNG + parts.json
    scratch/trace/vectorize6.py    the vectorizer (~700 lines, the main artifact)
    scratch/trace/parts_canny.py   standalone Canny probe, draws an overlay
    scratch/trace/colourdiff.py    colourway diff, bbox-aligned
    scratch/trace/subject.swift    Vision silhouette (stage 1)
    scratch/trace/view.mjs         screenshot any SVG standalone
    scratch/trace/{deskew,score,overlay,fitprim,solidify,linework,padgeom}.py

`vectorize.py`..`vectorize5.py` are superseded. Ignore them.

Inputs:

    scratch/models/mobile_sam.pt              41MB, the one that works
    scratch/given/*-src.png                   deskewed renders
    ~/Downloads/controllers/*                 raw source, incl. colourways
    scratch/ref/{ds,xbe,sw2}-mask.png         shell masks (match -src.png dims)
    scratch/ref/xbe2-{labels,parts}.json      Elite, WITH Canny parts. Current best.
    scratch/ref/{ds,sw2}-labels.json          STALE: SAM-only, pre-Canny

Site integration:

    src/_includes/art/hero-pad-{ps,xb,sw,mf}.svg   the deliverable
    src/_includes/art/hero-defs.svg                bodyGrad, bumpGrad, trigTopGrad,
                                                   padGrad, #soften. Included ONCE
                                                   per page; your SVG references it.
    src/styles/bands/hero.css                      --pa-* tokens. Dark ~L24-40,
                                                   "lightoff" ~L80-103
    src/_includes/bands/hero.html                  .padwrap/.plate, ~L74-95
    src/_includes/macros/pad.njk                   overlay() emits the letter spans
    src/_data/pads.json                            letter x/y, callouts, alt text
    tools/padlook.spec.js                          renders pads to scratch/pads/

`src/_includes/art/` is pasted in at build time. `src/assets/svg/` is fetched at
runtime. Not interchangeable.

## 2. Run it

    # 1. enumerate + number the parts
    uv run --script scratch/trace/label.py \
      "scratch/given/xbox elite wireless controller series 2-src.png" \
      scratch/ref/xbe-mask.png scratch/ref/xbe2-plate.png \
      scratch/ref/xbe2-parts.json 1200 --canny

    # 2. LOOK at xbe2-plate.png, write {id: role} into a labels.json

    # 3. vectorize. --canny MUST match step 1 or the ids mean nothing
    uv run --script scratch/trace/vectorize6.py \
      "scratch/given/xbox elite wireless controller series 2-src.png" \
      scratch/ref/xbe-mask.png scratch/ref/xbe-new.svg \
      --labels scratch/ref/xbe2-labels.json --parts scratch/ref/xbe2-parts.json \
      --canny --id-prefix xb --shade 80 --shade-band 60 \
      --shade-blend luminosity \
      --shade-light ~/Downloads/controllers/Xbox-Elite-Series-2.jpg

    # 4. look at it in page context (tokens only resolve there)
    cp scratch/ref/xbe-new.svg src/_includes/art/hero-pad-xb.svg
    make build && npx playwright test -c playwright.tools.config.js padlook
    # -> scratch/pads/xb-{light,dark}.png

    # standalone, no page: shows geometry only, tokens render black
    node scratch/trace/view.mjs src/_includes/art/hero-pad-xb.svg out.png "#8a8f99"

    # probes
    uv run --script scratch/trace/parts_canny.py RENDER MASK OUT.png 6.0 none
    uv run --script scratch/trace/colourdiff.py OUTDIR RENDER_A RENDER_B ...

## 3. Pipeline, in order. Each stage is the tool that won a head-to-head.

1. **Silhouette** — Vision `VNGenerateForegroundInstanceMaskRequest` via
   `subject.swift`. ~1s, zero install. Thresholding merges drop-shadow into the
   subject and still exits 0.
2. **Deskew** — rotate to maximise overlap with the mirror image.
3. **Outline** — Fourier descriptors (FFT the contour as complex, truncate,
   invert). Harmonic count is a real LOD dial. `approxPolyDP` + Catmull-Rom
   overshoots and self-crosses.
4. **Parts** — SAM everything-mode **union Canny closed contours**. See §5.
   SAM alone is not sufficient and never was.
5. **Naming** — by looking at the numbered plate, keyed by centroid. ~5 min/pad.
6. **Round controls** — HoughCircles. Currently vetoed by SAM; see §6.
7. **Light bar** — chroma, row by row. Corroborate with colourdiff.
8. **Form** — ONE greyscale luminance layer, `mix-blend-mode`, clipped to the
   shell. Implemented, §5. Not per-theme: see §7f, the light theme is deleted.
9. **Branding** — button glyphs STAY (PS button, Xbox guide, Switch home: they
   are bindable controls). Printed wordmarks go (the "Nintendo Switch 2" logo).

## 4. Bugs fixed. Do not reintroduce.

- **Two dedup rules.** `label.py` used IoU>0.62 + containment>0.80, `vectorize6`
  used IoU>0.8 alone: 12 parts vs 14. Now both call `padparts.sam_parts`.
  Any new detector must go in `padparts.py`, used by both.
- **A double area gate measuring two different things.** `fit()` re-applied
  `min_area` via `cv2.contourArea` while `sam_parts` counted pixels. Dropped the
  two smallest Elite face buttons (1254px, 1229px; 1279px survived) every run.
- **Amodal mirror failing open.** The guard only vetoed when the far side held a
  *comparable-area* part, so it passed when the far side held something of a
  different size — mirroring the left stick onto the face cluster and the four
  faces onto the d-pad. Now gated on `MIRROR_BY_ROLE = {bumper, trigger, grip,
  plate}`. Symmetry is a property of the role, not the pad.
- **Pairing on geometry alone.** View and Menu are symmetric about the axis and
  within 3% on area, so they became one control drawn twice. A pair now requires
  the same label.
- **Only mirrored parts got an id.** Solo/centre parts were emitted bare, so 8 of
  the Elite's 9 controls shipped with no id, role or label.
- **`clipPath` containing `<use>`** yields an *empty* clip when it fails to
  resolve, so the layer silently does not draw. Inline the path `d`.
- **Ids were `s1..s9`** and collide when four pads inline into one page. Use
  `--id-prefix`.

## 5. Measured. Do not re-derive.

**Canny is the better part detector.** CLAHE clip 6 → blur 5 → Canny 45/120 →
morph close 3x3 x2 → AND with eroded shell. It finds the complete inventory on
every pad where SAM fails, and agrees with SAM to within 0.002 where both work:

    Elite (black on black)   guide, View(0.425,0.276), Menu(0.574,0.275),
                             profile(0.499,0.352), 4 faces, 2 sticks, d-pad
    DualSense (white)        all four d-pad arms — SAM has NEVER found these
    Switch 2                 d-pad, 2 sticks, X/Y/B, Minus, Plus, Home, Capture
                             MISSES the A button. Picks up the "Switch 2" wordmark.

**SAM never returns the Elite centre cluster at any threshold.** min_area
1200/400/250 give byte-identical output. They were never segmented, not filtered.
Grid density (`points_stride`, default 32) is the untested lever — it cannot be
passed through `SAM()(...)` (rejected by the YOLO arg validator) and needs
`SAMPredictor.generate(im, points_stride=, crop_n_layers=, conf_thres=)`.
`set_image()` does not populate `.im`; it stores only `.features`. Two attempts
at the predictor path failed. **Still unverified.**

**Denoising before CLAHE is a regression**, measured on the Elite:

    none       59 contours, centre-cluster 6   keeps View + Menu
    bilateral  56 contours, centre-cluster 5   LOSES both
    median     49 contours, centre-cluster 7   loses 3 face buttons

The moulding gap around a flat glyph is itself a weak edge, so a filter tuned to
delete low-contrast variation deletes the signal. Counts also lie here: bilateral
reported *more* face-side parts purely from duplicate stick rings.

**Blend modes**, mean absolute pixel delta vs a no-shade render, Elite dark:

    soft-light band 46   2.35     soft-light band 90   3.97
    soft-light band 127  5.29     overlay band 60      3.33
    hard-light band 60   3.80     luminosity band 60  15.08  <- only real form

Soft-light's effect scales with the backdrop, so on a near-black shell it is weak
by construction. Luminosity replaces luminance outright, which is why it needs
one layer per colourway. Only the dark-shell layer ships: see §7f.

**`min_area` is not scale-invariant** — the lower bound is absolute pixels while
the upper bound is a fraction of shell area. 250px is 0.16% of the Elite's shell
(152,944px) but 0.03% of the DualSense's (826,151px), which is why DS returns 66
parts to the Elite's 28. Switch shell is 510,008px. Convert it to a fraction.

**Colourways register by bounding box, not by frame.** DualSense four colourways:
aspects 1.447–1.458, residual ≤2.40px. Elite black vs white: 3.11px. Colour-
invariant regions are the parts that stay dark: Elite → grips, d-pad, both sticks
(matching SAM centroids to 0.003). DualSense → light bar (**two strips**, not a
U), speaker grille, grip bottoms — *not* the d-pad or faces, which follow the
shell colour.

Other: DualSense aspect measures 1.450 from the colourways (an older note says
1.508 — unresolved). Elite bbox aspect 1.425. Face plates are monochrome; colour
them and you break the site's one-accent rule.

## 6. Do not attempt. Each cost hours.

- **Blender/Sketchfab → trace.** Only 12% of a pad file is bezier data; tracing
  gives geometry only, costs more bytes, and destroys the `<circle cx cy r>`
  semantics the app needs. Same objection kills **VTracer**, which is otherwise
  the right modern tool (O(n), colour, maintained) — it emits paths.
- **Geometric part classification** (position bands, size clustering, 4-fold
  rosette). Switch 2's X is larger than its B; Xbox puts the d-pad lower-left
  where PlayStation puts it upper-left.
- **MSER for linework.** Misses thin open strokes by construction. Fine for
  closed marks only. Dead code still sits in `vectorize6.py` ~L478.
- **Union of multiple Canny thresholds.** Shreds knurled sticks (897 contours).
- **Auto-classifying anything by area threshold.**
- **k-means on colour.** A d-pad is the same colour as the shell it sits in.
- **Feeding SAM a false-colour map.** The INFERNO variance map made it *worse*
  (7 parts, just left/right shell halves). SAM is trained on photographs.
- **HoughCircles for the centre cluster.** Those controls are not circles: View
  is two overlapping squares, Menu is three bars, profile is a pill. param2=50
  finds only the 3 high-contrast circles on the Elite.

## 7. The actual remaining work

**7a. Per-group shape and colour. This is the main ask.**

`vectorize6.py` emits one primitive per part and looks up a single fill in a
`ROLE` dict. That is the whole reason buttons render flat.

The geometry you need **is already detected and discarded**. On the Elite plate,
ids 20/21/25/27/28/29 are the face-button glyph and ring fragments, 22 is the
Xbox logo inside the guide button, 12-15/24 are d-pad dish segments. The label
map currently marks them `skip`.

What to build:
- A **parent relationship** in the label map, so a contour can belong *inside* a
  part: `{"20": {"role": "glyph", "parent": "11"}}`.
- Emit nested groups: `<g id="xb-face-right"><path class="pa-btn"/><path
  class="pa-glyph"/></g>` instead of one bare primitive.
- A **style map** (JSON, per role/class → fill, stroke, stroke-width, gradient
  ref) so colour is data, not a dict literal in the vectorizer. Keep it `var()`
  only.

**7b. Kill the linework pass.** 132 contours, most of the file size, stray arcs
around the sticks. It predates Canny part detection and is now doing that job
badly and twice. Per-part contours from 7a should replace it.

**7c. Recalibrate `src/_data/pads.json`.** The letter x/y were set against the
hand-drawn art, so Y/X/B/A do not land on the generated buttons — this reads as
"PS glyphs injected into the Xbox pad" and is *not* that (verified three ways:
inactive padwraps are `opacity:0;visibility:hidden`; removing them gives a
byte-identical screenshot; the SVG standalone contains zero glyphs). Derive the
coordinates from the generated centroids.

**7d. ds and sw2 have stale SAM-only label maps.** Run both through the §2 loop.
Switch also needs the A button recovered and the wordmark dropped.

**7e. `mf` has no source render** and is deliberately brandless on the site.
Decide whether it stays schematic.

**7f. The hero's light theme is dead code. RESOLVED 2026-08-19: delete it, do
not activate it.** `lightoff` appears only in `hero.css` and in no JS or HTML;
`dist/theme.js` writes `light` or `dark` and nothing else, which is why light and
dark hero screenshots are byte-identical. The decision it was waiting on has been
made: the hero is dark in both themes **on purpose**, because a light hero was
tried and was hard to read.

So there is **one shade layer per pad, not two**. Build the dark one only. The
light one is ~2,640 base64 characters that render nowhere, and it is inlined into
every homepage load; the working tree already carries one, in
`art/hero-pad-xb.svg`. Four pads would have shipped four of them.

**7g. Read SAMVG** (arXiv 2311.05276, ICASSP 2024). Closest prior art: SAM, plus
a filtering method for the best dense segmentation map, plus an enhancement stage
that "identifies missing components" — independently the same conclusion reached
here. Beats LIVE and DiffVG. Its filtering method is worth lifting; ours is hand
-rolled and is where two of the bugs in §4 lived. **StarVector** (arXiv
2312.11556) generates SVG *code* and is the candidate for automating §5. No
general vectorizer does semantic naming or design tokens — that part is ours.

## 8. Verify

    make ci                    # the gate. NOTE: currently fails on a pre-existing
                               # tsc error in the untracked tools/padpreview.spec.js
    make ci-quick              # skips rendering checks
    uvx ruff check scratch/trace/*.py

Render through the real hero — `url(#bodyGrad)` and tokens only resolve in page
context, standalone renders flat grey. Score silhouette against the reference
mask (profile RMS target <0.01; last shipping asset was 0.086).

**Look at the artifact, never the exit code.** Failures that reported success in
this project: potrace exiting 0 on a garbage mask, `str.replace` no-opping on a
missing anchor, a mask harness faking an IoU collapse, label indices drifting
silently, and an empty `clipPath` that looked exactly like a blend mode having no
effect. Assert every patch anchor. One change per iteration, look between each.

## 9. Environment traps

- `cv2`/`ultralytics` are NOT in system python. Only via `uv run --script` inline
  deps. `uv` is on PATH via mise.
- zsh does not word-split unquoted parameters. Use `${=var}`.
- `rg -r` is `--replace`, not recursive. It exits 0 with rewritten output that
  reads like a real finding.
- `sed -i` exits 0 when the pattern matched nothing. Prefer the Edit tool.
- Playwright element screenshots capture overlapping siblings, so `.plate` shots
  include the callout overlay. That is not the SVG's content.
- `padlook.spec.js` sets `data-theme` to light/dark, which the hero ignores (7f).
- Bash `find`/`grep` are shadowed by `bfs`/`ugrep` and skip gitignored files —
  so "no match" does not mean absent. Use `rg -uu` / `fd -u`.
