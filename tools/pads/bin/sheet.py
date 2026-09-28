# /// script
# dependencies = ["pillow"]
# ///
import sys
from PIL import Image
out, ims = sys.argv[1], [Image.open(p).convert("RGBA") for p in sys.argv[2:]]
w = max(i.width for i in ims); h = max(i.height for i in ims); n = len(ims); cols = 2 if n > 2 else n
s = Image.new("RGBA", (w * cols, h * ((n + cols - 1) // cols)), (40, 40, 40, 255))
for k, im in enumerate(ims): s.alpha_composite(im, ((k % cols) * w, (k // cols) * h))
s.convert("RGB").save(out)
