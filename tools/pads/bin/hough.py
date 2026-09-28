# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Circle proposals on a reference, numbered on a gridded copy, for labelling.
    hough.py REF OUT.png rmin rmax [param2]"""
import sys, cv2, numpy as np
im = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED); rmin, rmax = int(sys.argv[3]), int(sys.argv[4])
p2 = float(sys.argv[5]) if len(sys.argv) > 5 else 40
bgr = im[:, :, :3].copy(); g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
g = cv2.createCLAHE(3.0, (8, 8)).apply(g)
c = cv2.HoughCircles(cv2.GaussianBlur(g, (5, 5), 1.5), cv2.HOUGH_GRADIENT, 1.2, rmin * 1.2, param1=90, param2=p2, minRadius=rmin, maxRadius=rmax)
out = bgr.copy()
for x in range(0, out.shape[1], 50):
    cv2.line(out, (x, 0), (x, out.shape[0]), (0, 200, 255) if x % 200 == 0 else (80, 80, 80), 1)
    if x % 200 == 0: cv2.putText(out, str(x), (x + 2, 14), 0, 0.45, (0, 200, 255), 1)
for y in range(0, out.shape[0], 50):
    cv2.line(out, (0, y), (out.shape[1], y), (0, 200, 255) if y % 200 == 0 else (80, 80, 80), 1)
    if y % 200 == 0: cv2.putText(out, str(y), (2, y - 2), 0, 0.45, (0, 200, 255), 1)
if c is not None:
    for i, (x, y, r) in enumerate(c[0]):
        cv2.circle(out, (int(x), int(y)), int(r), (0, 0, 255), 2)
        cv2.putText(out, str(i), (int(x) - 6, int(y) + 5), 0, 0.6, (0, 255, 0), 2)
        print(i, round(float(x)), round(float(y)), round(float(r)))
cv2.imwrite(sys.argv[2], out)
