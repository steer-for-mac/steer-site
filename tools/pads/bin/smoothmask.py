# /// script
# dependencies = ["opencv-python-headless", "numpy", "scipy"]
# ///
"""A traced region mask, redrawn with smooth edges at 4x: smoothmask.py IN OUT_HARD|- OUT_SOFT [sigma_px] [soft_px]

The masks were traced off a photo at 7.5 px/mm, so their outlines step and wobble, and
a render at 15 px/mm shows every step as a ripple in a colour boundary. Each contour is
smoothed along its length (gaussian, sigma in the input's pixels, wrapping round),
then filled at 4x with antialiasing; holes stay holes. The soft copy is the hard one
blurred by soft_px input pixels (default 0.5, an edge for the shader's cubic lookup;
a glow wants a few) and rescaled to peak at 1.
"""
import sys, cv2, numpy as np
from scipy.ndimage import gaussian_filter1d
a = sys.argv; K = 4; sig = float(a[4]) if len(a) > 4 else 3.0
m = cv2.imread(a[1], cv2.IMREAD_GRAYSCALE) > 127
cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
out = np.zeros((m.shape[0] * K, m.shape[1] * K), np.uint8)
def smooth(c):
    p = c[:, 0, :].astype(float)
    if len(p) > 8:
        p = np.c_[gaussian_filter1d(p[:, 0], sig, mode="wrap"), gaussian_filter1d(p[:, 1], sig, mode="wrap")]
    return np.round((p + 0.5) * K * 16).astype(np.int32)  # 4 fractional bits for fillPoly's shift
# outer contours first, then holes over them
order = sorted(range(len(cs)), key=lambda i: hier[0][i][3] != -1)
for i in order:
    col = 0 if hier[0][i][3] != -1 else 255
    cv2.fillPoly(out, [smooth(cs[i])], col, lineType=cv2.LINE_AA, shift=4)
if a[2] != "-": cv2.imwrite(a[2], out)
soft = cv2.GaussianBlur(out.astype(np.float32), (0, 0), K * (float(a[5]) if len(a) > 5 else 0.5))
cv2.imwrite(a[3], np.clip(soft / max(soft.max(), 1) * 255, 0, 255).astype(np.uint8))
print(a[2], out.shape, len(cs), "contours")
