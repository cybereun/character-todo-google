from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont


source = Path(sys.argv[1])
output_dir = Path(sys.argv[2])
output_dir.mkdir(parents=True, exist_ok=True)

fish = Image.open(source).convert("RGBA")


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def fit_image(image, size):
    copy = image.copy()
    copy.thumbnail(size, Image.LANCZOS)
    return copy


sidebar = Image.new("RGB", (164, 314), "#f7fbfd")
draw = ImageDraw.Draw(sidebar)
draw.rectangle((0, 0, 163, 313), outline="#cbd8df")
draw.rectangle((0, 0, 163, 88), fill="#4f8fb2")
draw.text((14, 18), "Character", font=font(21, True), fill="white")
draw.text((14, 44), "Todo", font=font(30, True), fill="white")
draw.text((14, 82), "by Gogo Lebi", font=font(12), fill="#eaf6fb")
fish_sidebar = fit_image(fish, (148, 148))
sidebar.alpha_composite(fish_sidebar, ((164 - fish_sidebar.width) // 2, 125)) if sidebar.mode == "RGBA" else None
sidebar_rgba = sidebar.convert("RGBA")
sidebar_rgba.alpha_composite(fish_sidebar, ((164 - fish_sidebar.width) // 2, 123))
draw = ImageDraw.Draw(sidebar_rgba)
draw.text((14, 280), "Floating todo", font=font(12), fill="#25333b")
draw.text((14, 295), "desktop buddy", font=font(12), fill="#25333b")
sidebar_rgba.convert("RGB").save(output_dir / "installerSidebar.bmp")

header = Image.new("RGB", (150, 57), "white")
draw = ImageDraw.Draw(header)
draw.rectangle((0, 0, 149, 56), fill="#f7fbfd")
small_fish = fit_image(fish, (52, 52))
header_rgba = header.convert("RGBA")
header_rgba.alpha_composite(small_fish, (4, 2))
draw = ImageDraw.Draw(header_rgba)
draw.text((60, 8), "Character", font=font(15, True), fill="#25333b")
draw.text((60, 27), "Todo", font=font(18, True), fill="#4f8fb2")
draw.text((60, 45), "Gogo Lebi", font=font(8), fill="#6b7b84")
header_rgba.convert("RGB").save(output_dir / "installerHeader.bmp")
