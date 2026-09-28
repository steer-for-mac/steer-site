# /// script
# dependencies = ["pillow", "numpy"]
# ///
"""Edge anti-aliasing: partially transparent pixels per perimeter pixel. aa.py PNG..."""
import sys, numpy as np
from PIL import Image
def measure(a):
    solid = a > 0.5
    inner = solid.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        inner &= np.roll(np.roll(solid, dy, 0), dx, 1)
    perim = (solid & ~inner).sum()
    partial = ((a > 0.02) & (a < 0.98)).sum()
    return partial / perim, int(perim)
for p in sys.argv[1:]:
    im = Image.open(p); a = np.asarray(im.getchannel("A"), dtype=np.float64)
    a = a / (65535 if a.max() > 255 else 255)
    r, per = measure(a)
    hard = (a > 0.5).astype(float); rh, _ = measure(hard)  # negative control: the same edge thresholded
    print(f"{p.split('/')[-1]:24s} {im.size[0]}px  partial/perimeter {r:.2f}  (perimeter {per}; thresholded control {rh:.2f})")
