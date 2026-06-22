from pathlib import Path
import sys

from PIL import Image


source = Path(sys.argv[1])
target = Path(sys.argv[2])
target.parent.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert("RGBA")
image.thumbnail((256, 256), Image.LANCZOS)

canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
left = (256 - image.width) // 2
top = (256 - image.height) // 2
canvas.alpha_composite(image, (left, top))
canvas.save(target, format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
