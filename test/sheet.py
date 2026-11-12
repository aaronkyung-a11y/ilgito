import sys, glob
from PIL import Image
pat, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
fs = sorted(glob.glob(pat))
ims = [Image.open(f) for f in fs]
w, h = ims[0].size; s = 195 / w if w < h else 300 / w
tw, th = int(w * s), int(h * s)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (tw * cols, th * rows))
for i, im in enumerate(ims): sheet.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
sheet.save(out); print(len(fs), sheet.size)
