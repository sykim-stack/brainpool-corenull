#!/usr/bin/env python3
"""Generate disposable, clearly-illustrated sample post images for CoreNull.

Usage: python3 scripts/generate_sample_images.py
Requires Pillow (PIL). Output is written to public/samples/.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "samples"
SIZE = (960, 720)


def lerp(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, ...]:
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def background(top: tuple[int, ...], bottom: tuple[int, ...]) -> Image.Image:
    im = Image.new("RGB", SIZE)
    px = im.load()
    for y in range(SIZE[1]):
        c = lerp(top, bottom, y / (SIZE[1] - 1))
        for x in range(SIZE[0]):
            px[x, y] = c
    return im


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def add_grain(im: Image.Image, seed: int) -> Image.Image:
    rng = random.Random(seed)
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for _ in range(4200):
        x, y = rng.randrange(SIZE[0]), rng.randrange(SIZE[1])
        alpha = rng.randrange(3, 13)
        shade = 255 if rng.random() > 0.5 else 35
        d.point((x, y), fill=(shade, shade, shade, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.35))
    return Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")


def leaf(d, x, y, scale, color, angle=0):
    # Small stylized leaf drawn as a rotated diamond/ellipse hybrid.
    theta = math.radians(angle)
    length, width = 24 * scale, 11 * scale
    ux, uy = math.cos(theta), math.sin(theta)
    vx, vy = -uy, ux
    tip = (x + ux * length, y + uy * length)
    tail = (x - ux * length, y - uy * length)
    upper = (x + vx * width, y + vy * width)
    lower = (x - vx * width, y - vy * width)
    d.polygon([tip, upper, tail, lower], fill=color)
    d.line([tail, tip], fill=(245, 236, 195, 175), width=max(1, int(scale * 2)))


def garden_window(seed: int) -> Image.Image:
    im = background((228, 211, 184), (193, 171, 143)).convert("RGBA")
    d = ImageDraw.Draw(im)
    # warm interior wall, window and distant morning garden
    rounded(d, (68, 52, 892, 575), 28, (245, 234, 211, 255))
    rounded(d, (119, 92, 841, 492), 18, (174, 204, 198, 255))
    d.rectangle((132, 108, 828, 475), fill=(171, 207, 202, 255))
    d.ellipse((610, 119, 740, 249), fill=(247, 217, 150, 235))
    for i, col in enumerate([(93, 142, 111, 255), (116, 157, 119, 255), (76, 127, 103, 255)]):
        d.polygon([(132, 380 + i * 30), (280, 255 + i * 26), (425, 385 + i * 12), (575, 268 + i * 25), (828, 390 + i * 18), (828, 475), (132, 475)], fill=col)
    d.rectangle((462, 108, 486, 475), fill=(247, 238, 216, 255))
    d.rectangle((132, 287, 828, 309), fill=(247, 238, 216, 255))
    # sill and ceramic pot
    d.polygon([(92, 489), (868, 489), (906, 540), (52, 540)], fill=(165, 119, 83, 255))
    rounded(d, (386, 424, 559, 546), 25, (194, 124, 91, 255))
    d.ellipse((386, 412, 559, 447), fill=(225, 163, 118, 255))
    for x, y, s, a, c in [(432, 384, 1.3, -38, (56, 119, 82, 255)), (475, 353, 1.5, 26, (72, 141, 90, 255)), (516, 385, 1.2, 55, (45, 110, 80, 255)), (458, 319, 1.0, -54, (89, 158, 102, 255)), (504, 311, 1.15, 24, (69, 132, 87, 255))]:
        leaf(d, x, y, s, c, a)
    d.rectangle((0, 576, 960, 720), fill=(167, 132, 102, 255))
    d.polygon([(0, 575), (960, 575), (960, 611), (0, 611)], fill=(204, 165, 128, 255))
    return add_grain(im.convert("RGB"), seed)


def tea_table(seed: int) -> Image.Image:
    im = background((247, 225, 190), (222, 177, 132)).convert("RGBA")
    d = ImageDraw.Draw(im)
    # sunlight and quiet dining nook
    d.polygon([(0, 0), (470, 0), (800, 505), (0, 505)], fill=(255, 241, 204, 100))
    rounded(d, (90, 74, 870, 470), 28, (243, 226, 197, 255))
    d.rectangle((123, 103, 837, 438), fill=(192, 213, 203, 255))
    d.rectangle((465, 103, 490, 438), fill=(245, 232, 207, 255))
    d.rectangle((123, 271, 837, 294), fill=(245, 232, 207, 255))
    d.ellipse((590, 127, 766, 303), fill=(255, 224, 155, 150))
    # tabletop
    d.polygon([(80, 456), (874, 456), (960, 720), (0, 720)], fill=(139, 89, 59, 255))
    d.polygon([(80, 456), (874, 456), (905, 510), (45, 510)], fill=(176, 120, 79, 255))
    # linen, plate, small meal, tea cup
    d.ellipse((219, 499, 584, 675), fill=(248, 239, 219, 255))
    d.ellipse((252, 514, 553, 654), fill=(232, 215, 185, 255))
    d.ellipse((279, 527, 524, 642), fill=(247, 235, 207, 255))
    for x, y, r, c in [(341, 569, 31, (207, 136, 85, 255)), (410, 552, 25, (117, 150, 91, 255)), (447, 592, 29, (227, 177, 105, 255)), (366, 615, 20, (164, 93, 69, 255))]:
        d.ellipse((x-r, y-r, x+r, y+r), fill=c)
    rounded(d, (655, 501, 785, 626), 28, (249, 245, 231, 255))
    d.ellipse((670, 515, 771, 613), fill=(172, 113, 72, 255))
    d.ellipse((690, 531, 753, 593), fill=(211, 153, 98, 255))
    d.ellipse((748, 536, 812, 600), outline=(249, 245, 231, 255), width=15)
    return add_grain(im.convert("RGB"), seed)


def slow_walk(seed: int) -> Image.Image:
    im = background((180, 207, 204), (235, 204, 157)).convert("RGBA")
    d = ImageDraw.Draw(im)
    d.ellipse((650, 76, 790, 216), fill=(255, 227, 164, 225))
    # layered quiet neighborhood park
    d.polygon([(0, 336), (155, 178), (330, 353), (503, 159), (734, 367), (860, 220), (960, 317), (960, 720), (0, 720)], fill=(111, 153, 119, 255))
    d.polygon([(0, 415), (208, 275), (398, 432), (588, 272), (778, 431), (960, 302), (960, 720), (0, 720)], fill=(83, 132, 105, 255))
    # path flowing to the horizon
    d.polygon([(423, 341), (533, 341), (829, 720), (125, 720)], fill=(215, 186, 143, 255))
    d.polygon([(455, 359), (501, 359), (637, 720), (323, 720)], fill=(228, 202, 160, 255))
    # stylized flowering trees along the path
    for cx, cy, r, colors in [(125, 248, 95, [(194, 146, 145, 255), (225, 177, 154, 255)]), (820, 251, 106, [(111, 149, 98, 255), (151, 177, 113, 255)]), (270, 340, 54, [(122, 158, 104, 255), (170, 184, 116, 255)]), (704, 353, 63, [(100, 145, 98, 255), (174, 179, 114, 255)])]:
        d.rectangle((cx - 11, cy + 15, cx + 12, cy + 155), fill=(107, 79, 61, 255))
        for j, (dx, dy, rr) in enumerate([(-35, 0, .68), (22, -26, .72), (-9, -54, .73), (45, 19, .57), (-52, 32, .54)]):
            color = colors[j % len(colors)]
            r2 = int(r * rr)
            d.ellipse((cx+dx-r2, cy+dy-r2, cx+dx+r2, cy+dy+r2), fill=color)
    # small stepping stones
    for x, y, rx, ry in [(470, 425, 34, 13), (455, 491, 45, 16), (438, 575, 57, 20), (400, 667, 76, 23)]:
        d.ellipse((x-rx, y-ry, x+rx, y+ry), fill=(238, 213, 174, 190))
    return add_grain(im.convert("RGB"), seed)


def desk_notes(seed: int) -> Image.Image:
    im = background((216, 227, 215), (179, 197, 178)).convert("RGBA")
    d = ImageDraw.Draw(im)
    # wall and sunlit desk
    d.rectangle((0, 0, 960, 470), fill=(226, 231, 212, 255))
    rounded(d, (92, 66, 422, 375), 18, (156, 194, 192, 255))
    d.rectangle((250, 76, 269, 362), fill=(242, 229, 199, 255))
    d.rectangle((103, 211, 410, 229), fill=(242, 229, 199, 255))
    d.ellipse((304, 96, 374, 166), fill=(249, 218, 150, 225))
    d.polygon([(0, 443), (960, 420), (960, 720), (0, 720)], fill=(153, 106, 74, 255))
    d.polygon([(0, 443), (960, 420), (960, 461), (0, 484)], fill=(184, 132, 91, 255))
    # open notebook
    d.polygon([(185, 500), (489, 473), (502, 665), (207, 692)], fill=(248, 242, 222, 255))
    d.polygon([(489, 473), (770, 497), (746, 691), (502, 665)], fill=(255, 250, 231, 255))
    d.line((497, 479, 501, 665), fill=(194, 177, 150, 255), width=6)
    for y in [526, 558, 590, 622, 654]:
        d.line((240, y, 451, y-18), fill=(181, 185, 169, 210), width=3)
        d.line((540, y-12, 711, y+3), fill=(181, 185, 169, 210), width=3)
    # pencil and tea glass
    d.polygon([(808, 496), (835, 489), (890, 659), (867, 668)], fill=(199, 126, 83, 255))
    d.polygon([(867, 668), (890, 659), (879, 690)], fill=(67, 65, 58, 255))
    rounded(d, (83, 518, 151, 633), 18, (225, 236, 224, 255))
    d.ellipse((91, 527, 143, 577), fill=(147, 95, 63, 255))
    return add_grain(im.convert("RGB"), seed)


def family_table(seed: int) -> Image.Image:
    """Warm, people-free still life: conveys shared everyday life without fake portraits."""
    im = background((246, 218, 184), (225, 175, 139)).convert("RGBA")
    d = ImageDraw.Draw(im)
    # cozy dining room
    d.rectangle((0, 0, 960, 470), fill=(244, 224, 196, 255))
    rounded(d, (77, 73, 377, 366), 18, (158, 194, 187, 255))
    d.ellipse((240, 103, 324, 187), fill=(255, 222, 161, 240))
    d.rectangle((215, 83, 235, 355), fill=(240, 222, 194, 255))
    d.rectangle((93, 210, 360, 229), fill=(240, 222, 194, 255))
    # wall art with simple abstract leaf
    rounded(d, (621, 88, 837, 304), 10, (250, 241, 220, 255))
    d.rectangle((642, 108, 816, 284), fill=(222, 230, 205, 255))
    d.line((730, 252, 730, 147), fill=(90, 121, 84, 255), width=8)
    d.ellipse((681, 146, 741, 199), fill=(112, 151, 101, 255))
    d.ellipse((724, 121, 785, 178), fill=(166, 177, 111, 255))
    d.ellipse((734, 185, 795, 238), fill=(91, 140, 101, 255))
    # round table and shared bowls
    d.ellipse((68, 410, 890, 677), fill=(143, 95, 66, 255))
    d.ellipse((89, 421, 869, 640), fill=(174, 119, 78, 255))
    d.ellipse((281, 449, 679, 620), fill=(249, 240, 219, 255))
    d.ellipse((301, 460, 660, 604), fill=(236, 219, 187, 255))
    d.ellipse((357, 481, 599, 581), fill=(248, 235, 205, 255))
    for x, y, r, c in [(411, 520, 24, (192, 119, 72, 255)), (476, 502, 22, (95, 145, 91, 255)), (532, 534, 24, (220, 171, 99, 255)), (457, 559, 20, (164, 98, 73, 255))]:
        d.ellipse((x-r, y-r, x+r, y+r), fill=c)
    # small flower vase
    rounded(d, (737, 430, 800, 539), 17, (191, 139, 112, 255))
    d.line((770, 445, 752, 374), fill=(72, 123, 82, 255), width=7)
    d.line((770, 443, 802, 377), fill=(72, 123, 82, 255), width=7)
    d.ellipse((724, 340, 778, 394), fill=(221, 142, 151, 255))
    d.ellipse((785, 344, 837, 398), fill=(239, 194, 125, 255))
    return add_grain(im.convert("RGB"), seed)


def seasonal_tree(seed: int) -> Image.Image:
    im = background((197, 218, 220), (238, 217, 177)).convert("RGBA")
    d = ImageDraw.Draw(im)
    d.ellipse((662, 81, 796, 215), fill=(255, 229, 168, 230))
    # ground and a large, calm tree
    d.polygon([(0, 493), (960, 414), (960, 720), (0, 720)], fill=(132, 157, 112, 255))
    d.polygon([(0, 573), (960, 497), (960, 720), (0, 720)], fill=(163, 169, 116, 255))
    d.polygon([(433, 546), (525, 540), (569, 720), (369, 720)], fill=(211, 190, 153, 255))
    # tree trunk and branches
    d.polygon([(430, 557), (485, 557), (480, 326), (401, 188), (425, 171), (485, 298), (544, 149), (568, 160), (502, 344), (534, 550)], fill=(112, 78, 57, 255))
    # canopy clusters
    clusters = [(407, 175, 120, (130, 165, 118, 255)), (524, 157, 132, (153, 176, 120, 255)), (321, 244, 116, (163, 174, 120, 255)), (602, 244, 124, (121, 157, 111, 255)), (455, 94, 112, (171, 181, 131, 255))]
    for cx, cy, r, color in clusters:
        d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=color)
    # a few falling leaves
    for x, y, angle in [(277, 372, 18), (660, 391, -22), (347, 441, 55), (713, 324, -46), (594, 453, 29)]:
        leaf(d, x, y, .78, (197, 145, 95, 230), angle)
    return add_grain(im.convert("RGB"), seed)


ASSETS = {
    "garden-window.png": (garden_window, 101),
    "shared-table.png": (tea_table, 202),
    "slow-walk.png": (slow_walk, 303),
    "desk-notes.png": (desk_notes, 404),
    "everyday-together.png": (family_table, 505),
    "seasonal-tree.png": (seasonal_tree, 606),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, (renderer, seed) in ASSETS.items():
        image = renderer(seed).resize((960, 720), Image.Resampling.LANCZOS)
        path = OUT / filename
        image.save(path, "PNG", optimize=True)
        print(f"generated {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
