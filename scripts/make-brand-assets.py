#!/usr/bin/env python3
"""Build Dispatch Cove logo lockups, favicons, OG image, and preview.

Hand-written mark (navy squircle + cream cove C + amber route arrow).
Wordmark outlined from IBM Plex Sans 600 so the SVG does not depend on fonts.
Rasters are written by a Node helper that uses sharp (libvips).
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets" / "images"
PUBLIC = ROOT / "public"
FONT_VAR = Path(
    "/usr/share/fonts/truetype/sand-box/google/IBM Plex Sans/"
    "IBMPlexSans-VariableFont_wdth,wght.ttf"
)
def find_sharp() -> str:
    import os
    env = os.environ.get("SHARP_MODULE")
    if env:
        return env
    candidates = [
        ROOT / "node_modules" / "sharp",
        Path("/workspace/daily-insight-desk/node_modules/sharp"),
    ]
    for c in candidates:
        if (c / "package.json").exists():
            return str(c)
    raise SystemExit(
        "Cannot find the sharp module. Install it with npm or set SHARP_MODULE."
    )


SHARP = find_sharp()
PREVIEW = Path("/workspace/dispatch-cove-logo-preview.png")

NAVY = "#16324F"
NAVY_MID = "#1F4A73"
CREAM = "#F4F1EA"
PAPER = "#EEF1F4"
AMBER = "#C05612"
INK = "#12181F"

# Mark geometry (viewBox 0 0 80 80), from the v3 candidate that held up at 16px.
MARK_INNER = f'''  <rect width="80" height="80" rx="18" fill="{NAVY}"/>
  <path d="M51.8 58.8A22 22 0 1 1 54.8 22.8" stroke="{CREAM}" stroke-width="9.2" stroke-linecap="round"/>
  <path d="M24.5 40.8h26" stroke="{AMBER}" stroke-width="6.6" stroke-linecap="round"/>
  <path d="M41 32.2 58 41 41 49.8" stroke="{AMBER}" stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round"/>'''

MARK_SVG = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80" fill="none" role="img" aria-label="Dispatch Cove">
{MARK_INNER}
</svg>
'''

CAP_HEIGHT = 698  # IBM Plex Sans sCapHeight
MARK_SIZE = 80
TEXT_CAP = 40  # cap height in logo units; optically centers on the 80 mark
SCALE = TEXT_CAP / CAP_HEIGHT
BASELINE = MARK_SIZE / 2 + TEXT_CAP / 2
GAP = 18
WORD_SPACE = 300  # slightly more than the 236-unit space glyph, as a lockup


def outline_wordmark(font: TTFont, text: str, word_space: float) -> tuple[str, float]:
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    parts: list[str] = []
    x = 0.0
    for ch in text:
        name = cmap[ord(ch)]
        glyph = gs[name]
        if ch == " ":
            x += word_space
            continue
        pen = SVGPathPen(gs)
        glyph.draw(TransformPen(pen, Transform(1, 0, 0, 1, x, 0)))
        parts.append(pen.getCommands())
        x += glyph.width
    return " ".join(parts), x


def lockup_svg(path_d: str, text_width: float, fill: str, label: str) -> str:
    text_w = text_width * SCALE
    width = MARK_SIZE + GAP + text_w
    # Translate then scale(-y) so font y-up becomes SVG y-down, baseline at BASELINE.
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {MARK_SIZE}" width="{width:.3f}" height="{MARK_SIZE}" fill="none" role="img" aria-label="{label}">
{MARK_INNER}
  <g fill="{fill}" transform="translate({MARK_SIZE + GAP:.3f} {BASELINE:.3f}) scale({SCALE:.8f} {-SCALE:.8f})">
    <path d="{path_d}"/>
  </g>
</svg>
'''


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print(f"wrote {path}")


def raster_with_sharp() -> None:
    """Raster SVGs via sharp in a one-shot Node script."""
    js = r'''
const sharp = require(process.env.SHARP);
const fs = require("fs");
const path = require("path");

const navy = { r: 0x16, g: 0x32, b: 0x4f, alpha: 1 };

async function svgPng(svgPath, outPath, width, height, { flattenNavy = false } = {}) {
  const input = fs.readFileSync(svgPath);
  let img = sharp(input, { density: 400 }).resize(width, height, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png();
  if (flattenNavy) {
    const buf = await img.toBuffer();
    img = sharp({
      create: { width, height, channels: 3, background: "#16324F" },
    }).composite([{ input: buf, left: 0, top: 0 }]).png();
  }
  await img.toFile(outPath);
  console.log("raster", outPath, width + "x" + height);
}

(async () => {
  const assets = process.env.ASSETS;
  const pub = process.env.PUBLIC;
  const mark = path.join(assets, "logo-mark.svg");
  const logo = path.join(assets, "logo.svg");
  const logoDark = path.join(assets, "logo-on-dark.svg");

  await svgPng(mark, path.join(pub, "favicon-16x16.png"), 16, 16);
  await svgPng(mark, path.join(pub, "favicon-32x32.png"), 32, 32);
  await svgPng(mark, path.join(pub, "apple-touch-icon.png"), 180, 180, { flattenNavy: true });
  await svgPng(mark, path.join(pub, "android-chrome-192x192.png"), 192, 192, { flattenNavy: true });
  await svgPng(mark, path.join(pub, "android-chrome-512x512.png"), 512, 512, { flattenNavy: true });
  await svgPng(mark, path.join(assets, "logo-mark.png"), 512, 512);

  // Horizontal lockup at a generous width for schema / general use.
  const logoSvg = fs.readFileSync(logo, "utf8");
  const vm = logoSvg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  const aspect = parseFloat(vm[1]) / parseFloat(vm[2]);
  const logoW = 1400;
  const logoH = Math.round(logoW / aspect);
  await svgPng(logo, path.join(assets, "logo.png"), logoW, logoH);

  // Expose dimensions for the Python OG / preview compositors.
  fs.writeFileSync("/tmp/dispatch-cove-logo-size.json", JSON.stringify({
    logoW, logoH, aspect, viewW: parseFloat(vm[1]), viewH: parseFloat(vm[2])
  }));
})().catch((err) => { console.error(err); process.exit(1); });
'''
    env = {
        **dict(**{k: v for k, v in __import__("os").environ.items()}),
        "SHARP": SHARP,
        "ASSETS": str(ASSETS),
        "PUBLIC": str(PUBLIC),
    }
    subprocess.run(["node", "-e", js], check=True, env=env)


def make_ico() -> None:
    im16 = Image.open(PUBLIC / "favicon-16x16.png").convert("RGBA")
    im32 = Image.open(PUBLIC / "favicon-32x32.png").convert("RGBA")
    im32.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(32, 32), (16, 16)],
        append_images=[im16],
    )
    print(f"wrote {PUBLIC / 'favicon.ico'}")


def instance_fonts() -> tuple[Path, Path]:
    tmp = Path("/tmp")
    semi = tmp / "IBMPlexSans-SemiBold.ttf"
    reg = tmp / "IBMPlexSans-Regular.ttf"
    instantiateVariableFont(TTFont(str(FONT_VAR)), {"wght": 600, "wdth": 100}).save(str(semi))
    instantiateVariableFont(TTFont(str(FONT_VAR)), {"wght": 400, "wdth": 100}).save(str(reg))
    return semi, reg


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def make_og(logo_light: Path) -> None:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)

    # Quiet atmospheric cove in mid-navy, cropped at the left — brand, not clutter.
    # Drawn as a thick arc via a temporary SVG raster would be nicer; approximate
    # with a large ellipse ring by compositing later if needed. Keep typographic.
    # Soft mid-navy rounded field behind the plate.
    rounded_rect(draw, (70, 95, 1130, 535), 40, NAVY_MID)

    plate = (140, 155, 1060, 475)
    rounded_rect(draw, plate, 28, CREAM)

    # Place the horizontal lockup on the plate, optically a little above center
    # to leave room for the tagline.
    logo = Image.open(logo_light).convert("RGBA")
    target_w = 820
    ratio = target_w / logo.width
    target_h = round(logo.height * ratio)
    logo = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    lx = (W - target_w) // 2
    ly = 200
    img.paste(logo, (lx, ly), logo)

    _, regular = instance_fonts()  # already written; fine to re-instance
    # Actually fonts were written earlier; reopen.
    font = ImageFont.truetype(str(Path("/tmp/IBMPlexSans-Regular.ttf")), 26)
    tagline = "Guides for U.S. truck dispatchers and owner-operators"
    bbox = draw.textbbox((0, 0), tagline, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (W - tw) // 2
    ty = ly + target_h + 28
    draw.text((tx, ty), tagline, font=font, fill=NAVY_MID)

    out = ASSETS / "og.png"
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out} {img.size}")


def make_preview(logo_light: Path, logo_dark_svg: Path) -> None:
    # Raster the dark lockup at the same pixel size as logo.png.
    size = json.loads(Path("/tmp/dispatch-cove-logo-size.json").read_text())
    js = f'''
const sharp = require("{SHARP}");
sharp(require("fs").readFileSync("{logo_dark_svg}"), {{ density: 400 }})
  .resize({size["logoW"]}, {size["logoH"]}, {{ fit: "contain", background: {{ r: 0, g: 0, b: 0, alpha: 0 }} }})
  .png().toFile("/tmp/dispatch-cove-logo-on-dark.png")
  .then(() => console.log("dark lockup raster ok"))
  .catch((e) => {{ console.error(e); process.exit(1); }});
'''
    subprocess.run(["node", "-e", js], check=True)

    panel_w, panel_h = 860, 620
    pad = 48
    gap = 40
    W = pad + panel_w + gap + panel_w + pad
    H = pad + panel_h + pad
    canvas = Image.new("RGB", (W, H), "#d8dee6")
    draw = ImageDraw.Draw(canvas)

    left = Image.new("RGB", (panel_w, panel_h), "#FFFFFF")
    right = Image.new("RGB", (panel_w, panel_h), NAVY)
    light = Image.open(logo_light).convert("RGBA")
    dark = Image.open("/tmp/dispatch-cove-logo-on-dark.png").convert("RGBA")

    target_w = 680
    def place(panel: Image.Image, logo: Image.Image) -> None:
        ratio = target_w / logo.width
        th = round(logo.height * ratio)
        logo = logo.resize((target_w, th), Image.Resampling.LANCZOS)
        x = (panel_w - target_w) // 2
        y = (panel_h - th) // 2 - 12
        panel.paste(logo, (x, y), logo)

    place(left, light)
    place(right, dark)

    font = ImageFont.truetype(str(Path("/tmp/IBMPlexSans-Regular.ttf")), 20)
    def caption(panel: Image.Image, text: str, fill: str) -> None:
        d = ImageDraw.Draw(panel)
        bbox = d.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        d.text(((panel_w - tw) // 2, panel_h - 48), text, font=font, fill=fill)

    caption(left, "On white", "#5a6570")
    caption(right, "On navy", "#C5D0DA")

    canvas.paste(left, (pad, pad))
    canvas.paste(right, (pad + panel_w + gap, pad))
    canvas.save(PREVIEW, "PNG", optimize=True)
    print(f"wrote {PREVIEW} {canvas.size}")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    font = instantiateVariableFont(TTFont(str(FONT_VAR)), {"wght": 600, "wdth": 100})
    path_d, text_width = outline_wordmark(font, "Dispatch Cove", WORD_SPACE)
    print(f"wordmark units={text_width:.1f} scale={SCALE:.6f} svg_text_w={text_width * SCALE:.2f}")

    write(ASSETS / "logo-mark.svg", MARK_SVG)
    write(PUBLIC / "favicon.svg", MARK_SVG)
    write(ASSETS / "logo.svg", lockup_svg(path_d, text_width, NAVY, "Dispatch Cove"))
    write(ASSETS / "logo-on-dark.svg", lockup_svg(path_d, text_width, CREAM, "Dispatch Cove"))

    manifest = {
        "name": "Dispatch Cove",
        "short_name": "Dispatch Cove",
        "start_url": "/",
        "display": "browser",
        "background_color": "#16324f",
        "theme_color": "#16324f",
        "icons": [
            {
                "src": "/android-chrome-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
            },
            {
                "src": "/android-chrome-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
            },
        ],
    }
    write(PUBLIC / "site.webmanifest", json.dumps(manifest, indent=2) + "\n")

    instance_fonts()
    raster_with_sharp()
    make_ico()
    make_og(ASSETS / "logo.png")
    make_preview(ASSETS / "logo.png", ASSETS / "logo-on-dark.svg")


if __name__ == "__main__":
    main()
