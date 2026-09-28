# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""The Elite Series 2's rubber grip panels and top band, traced off the reference: xbgrip.py

The part line between the smooth shell and each textured rubber panel, traced by hand
on ref/cut-xb.png (its texture is too faint at 565 px for a threshold to follow the
line), mirrored for the right grip, and cut to the photo's silhouette. Written in the
masks' frame (the photo cropped to its alpha box) as masks/xb-grip.png.
The bumpers and the band between them read lighter than the shell in the photo's top
rows (grey 70 and up against the shell's 40-60): masks/xb-top.png.
"""
import os, cv2, numpy as np
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = cv2.imread(os.path.join(HERE, "ref/cut-xb.png"), cv2.IMREAD_UNCHANGED)
al = im[:, :, 3] > 127; ys, xs = np.nonzero(al); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
al = al[y0:y1, x0:x1]; H, W = al.shape
# left panel's part line, crop px: down the side, then diagonally to the notch
left = [(-20, 100), (40, 118), (75, 145), (105, 180), (130, 215), (152, 245), (170, 268), (178, 300), (178, H + 20), (-20, H + 20)]
m = np.zeros((H, W), np.uint8)
cv2.fillPoly(m, [np.array(left, np.int32)], 1)
cv2.fillPoly(m, [np.array([(W - 1 - x, y) for x, y in left], np.int32)], 1)
m = (m > 0) & al
cv2.imwrite(os.path.join(HERE, "masks/xb-grip.png"), (m * 255).astype(np.uint8))
print("xb-grip", m.shape, int(m.sum()))

g = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1]
top = al & (g > 70) & (np.arange(H)[:, None] < 0.08 * H)
top = cv2.morphologyEx(top.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) > 0
cv2.imwrite(os.path.join(HERE, "masks/xb-top.png"), (top * 255).astype(np.uint8))
print("xb-top", int(top.sum()))
