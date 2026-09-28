# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""The DualSense's touchpad trim, traced off the reference: psmasks.py [WIDTH_PX] [BOTTOM_PX] [CORNER_PX]

The light bar is not two side strips: it is a trim of fixed width that wraps the
touchpad's sides and bottom (not its top), lit blue up the sides, dark across the
bottom, with the player LED's glow at the bottom centre. From ref/cut-ps.png, in the
masks' frame (the photo cropped to its alpha box, which the shell's front bbox maps to),
from the touchpad (the white run between the traced blue strips, rounded at the bottom):
  ps-bar.png   the trim: the pad grown by WIDTH px (BOTTOM px downward), minus the pad, below the strips' top
  ps-gap.png   the parting line where pad meets trim, 1.5 px
  ps-led.png   the player LED's glow, just under the trim's bottom run
  ps-lit.png   the lit part of the trim: the traced strips, ending where the corners start
"""
import sys, os, cv2, numpy as np
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W_PX = int(sys.argv[1]) if len(sys.argv) > 1 else 7   # the trim up the sides
B_PX = int(sys.argv[2]) if len(sys.argv) > 2 else 22  # and across the bottom, which is wider
im = cv2.imread(os.path.join(HERE, "ref/cut-ps.png"), cv2.IMREAD_UNCHANGED)
al = im[:, :, 3] > 127; ys, xs = np.nonzero(al)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
im = im[y0:y1, x0:x1]
blue = (cv2.imread(os.path.join(HERE, "masks/ps-blue.png"), cv2.IMREAD_GRAYSCALE) > 127)
assert blue.shape == im.shape[:2], (blue.shape, im.shape)
H, Wd = blue.shape
by = np.nonzero(blue.any(1))[0]; top = by.min()
cx = Wd // 2
pad = np.zeros_like(blue)
span = None
for y in range(top, H):
    row = np.nonzero(blue[y])[0]
    l = row[row < cx]; r = row[row > cx]
    if len(l) and len(r):
        span = (l.max() + 1, r.min())
    elif span is None:
        continue
    # below the strips' ends the pad runs on at their last span until its white stops
    pad[y, span[0]:span[1]] = True
# the pad's bottom: where the photo's white ends (the panel mask starts a little above it,
# which the shell's own wall hid until the trim was drawn over it)
lum = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2GRAY)
pad &= lum > 150
# keep the component under the pad's centre
n, lab = cv2.connectedComponents(pad.astype(np.uint8))
seed = lab[top + 40, cx]; pad = lab == seed
for y in range(0, top):  # above the strips the pad runs to the shell's top edge at the top row's width
    pad[y] = pad[top]
# the pad's bottom corners are rounds of R, which the trace squares off: open it by R
R = int(sys.argv[3]) if len(sys.argv) > 3 else 28
raw = pad.copy()
disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * R + 1, 2 * R + 1))
pad = cv2.morphologyEx(pad.astype(np.uint8), cv2.MORPH_OPEN, disk) > 0
pad[:top + R] |= raw[:top + R]  # only the bottom corners: the top runs off the shell's edge
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * W_PX + 1, 2 * B_PX + 1))
# the trim is everything round the rounded pad out to the old outline grown by the trim's
# width, so the squared-off corners the opening removed are trim, not bare shell
bar = (cv2.dilate((raw | blue).astype(np.uint8), k) > 0) & ~pad
bar &= cv2.dilate(pad.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * (W_PX + R // 2) + 1, 2 * B_PX + 1))) > 0
bar[:top + 2] = False
# lit blue up the sides and round the corners; dark along the straight bottom run
ys_, xs_ = np.nonzero(pad); yb = ys_.max()
bottom_row = np.nonzero(pad[yb - 1])[0]
# the traced strips are the lit part up the sides (their width is what the photo's
# blue measures); the trim only carries on dark round the corners and along the bottom
blue_new = blue & ~pad
blue_new[yb - (R * 4) // 5:, bottom_row.min():bottom_row.max()] = False  # the lit strip fades out as the corner starts
# up the sides the trim is just the lit band; it only widens into the corners and bottom
bar[:yb - R] &= blue_new[:yb - R]
gap = (cv2.dilate(pad.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & ~pad
gap[:top + 2] = False
ys_, xs_ = np.nonzero(pad); yb = ys_.max()
led = np.zeros_like(pad)
# the glow sits just under the trim, on the panel
cv2.ellipse(led.view(np.uint8), (cx, int(yb + B_PX * 0.6)), (20, 3), 0, 0, 360, 1, -1)
for name, m in (("bar", bar), ("gap", gap), ("led", led), ("lit", blue_new)):
    cv2.imwrite(os.path.join(HERE, f"masks/ps-{name}.png"), (m * 255).astype(np.uint8))
    print(name, int(m.sum()))
print("pad bottom row", yb, "strip top", top)
