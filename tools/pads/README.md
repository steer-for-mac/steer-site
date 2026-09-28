# Controller renders

The shells are downloaded scans (LICENCES.md), cleaned in `scene.py`: voxel-remeshed, then retopologised into a QuadriFlow cage and subdivided (`clean.cage` in `params/`), so the surface the camera sees is a subdivision limit surface and the scan only sets proportions. Every control is authored in `scene.py` from `params/`.

1. `tools/pads/fetch.py` downloads the meshes into `dl/`, each checked against its pinned sha256.
2. `bin/masks.sh` rebuilds the masks traced by script (the DualSense's touchpad trim, the Elite's grip panels and top band) and every mask's smoothed `-hd-soft` copy that `params/` reads. `ps-dark`, `ps-trig`, `ps-blue`, `ps-dark-side` and `sw-grip` were traced by hand and are inputs. It needs the untracked `ref/` images LICENCES.md lists.
3. From `tools/pads/`: `blender -b --factory-startup --python scene.py -- params/ps.json final --colourway white --ids --samples 256`, then `xb.json` and `sw.json` with `--colourway black`.
4. From the repo root: `tools/pads/export.py` writes the band's pads, thumbs and chip positions (`src/_data/perapp.json`), and a check image per pad to `out/`.

Two checks, both needing `ref/`:

- `bin/diffall.sh` measures part positions, sizes and colour against labelled photos (`labels/`) and proves it catches a misplaced part.
- `uv run bin/perceptual.py PAD final OUTDIR --control` puts the render beside the site's photo at the size the band draws it (1200 device px on #222325), scores SSIM, LPIPS and edge acutance, and writes the side-by-side sheet with 200% crops. It sets no pass mark; the sheet is judged by eye, with the numbers beside it. `--control` blurs the render and exits 1 unless LPIPS and acutance get worse. SSIM is reported, not checked: it rose under blur on the first run. The `jnd` anchor (the photo through half resolution and back) means little for `cut-xb`, which is already upscaled 2.2x at 1200 px, and `cut-sw` is a Switch 2 Pro while the render is the original Pro, so its scores include that difference.
