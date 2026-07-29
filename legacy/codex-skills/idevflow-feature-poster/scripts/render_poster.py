#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
FONT = "/System/Library/Fonts/PingFang.ttc"

GRAPHICS = {
    "graphic1": ("poster-graphic-1-clean-v3.png", (2050, 505, 1650, 1329)),
    "graphic2": ("poster-graphic-2-clean-v3.png", (2050, 505, 1640, 1329)),
    "graphic3": ("poster-graphic-3-clean-v3.png", (1874, 636, 2344, 1538)),
    "graphic4": ("poster-graphic-4-clean-v3.png", (2262, 384, 1818, 1396)),
    "graphic5": ("poster-graphic-5-clean-v3.png", (2080, 416, 2077, 1338)),
}

GRAPHIC_TEXT_DEFAULTS = {
    "graphic1": {"brand": "iDevflow", "action": "提交"},
    "graphic2": {"brand": "iDevflow", "action": "登录"},
    "graphic3": {"milestone": "路标版本", "delivery": "敏捷交付", "publish": "点击发布", "status": "验证中"},
    "graphic4": {"ai": "AI", "coder": "DF Coder"},
    "graphic5": {"title": "测试用例"},
}


def f(size: int, bold: bool = False):
    return ImageFont.truetype(FONT, size, index=1 if bold else 0)


def text_size(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0], b[3] - b[1]


def fit_text(draw, text, font, max_width):
    value = str(text)
    while text_size(draw, value, font)[0] > max_width and len(value) > 1:
        value = value[:-1]
    return value


def graphic_text(cfg, key, field):
    defaults = GRAPHIC_TEXT_DEFAULTS[key]
    texts = cfg.get("graphic_texts") or {}
    if isinstance(texts, dict):
        if isinstance(texts.get(key), dict) and texts[key].get(field) is not None:
            return str(texts[key][field])
        if texts.get(field) is not None:
            return str(texts[field])
    return defaults[field]


def has_graphic_override(cfg, key, field):
    return graphic_text(cfg, key, field) != GRAPHIC_TEXT_DEFAULTS[key][field]


def paste_logo(base):
    logo = Image.open(ASSETS / "logo.png").convert("RGBA").resize((1495, 200), Image.Resampling.LANCZOS)
    base.alpha_composite(logo, (154, 135))


def paste_badge(base):
    badge = Image.open(ASSETS / "product-badge.png").convert("RGBA").resize((585, 198), Image.Resampling.LANCZOS)
    base.alpha_composite(badge, (160, 470))


def feature_points(cfg):
    return cfg.get("feature_points") or cfg.get("bullets") or []


def point_text(point):
    if isinstance(point, str):
        return point
    label = point.get("label", "")
    text = point.get("text", "")
    return f"{label}：{text}" if text else label


def all_text(cfg):
    parts = [str(v) for v in cfg.values() if isinstance(v, str)]
    parts.extend(point_text(p) for p in feature_points(cfg))
    return " ".join(parts).lower()


def visual_key(cfg):
    explicit = str(cfg.get("visual_hint", "")).lower()
    if explicit in GRAPHICS:
        return explicit
    text = all_text(cfg)
    if any(w in text for w in ["交付", "验证", "路标", "版本", "需求"]):
        return "graphic3"
    if any(w in text for w in ["搜索", "检查", "修复", "coder", "代码助手", "编码"]):
        return "graphic4"
    if any(w in text for w in ["ai", "智能", "测试", "用例", "文档", "分析", "生成", "助手"]):
        return "graphic5"
    if any(w in text for w in ["登录", "单点", "sso", "认证", "账号", "权限"]):
        return "graphic2"
    return "graphic1"


def draw_visual(base, cfg):
    key = visual_key(cfg)
    asset, (x, y, w, h) = GRAPHICS[key]
    src = Image.open(ASSETS / asset).convert("RGBA")
    img = src.resize((w, h), Image.Resampling.LANCZOS)
    draw_graphic_text(img, cfg, key, src.size)
    base.alpha_composite(img, (x, y))


def draw_text(draw, xy, text, font, fill, max_width, align="left", stroke_fill=None, stroke_width=0):
    value = fit_text(draw, text, font, max_width)
    width, _ = text_size(draw, value, font)
    x, y = xy
    if align == "center":
        x += (max_width - width) / 2
    draw.text((x, y), value, font=font, fill=fill, stroke_fill=stroke_fill, stroke_width=stroke_width)


def draw_embossed_white(draw, xy, text, font, max_width, align="left"):
    x, y = xy
    draw_text(draw, (x + 4, y + 6), text, font, (34, 78, 156, 115), max_width, align)
    draw_text(draw, xy, text, font, "white", max_width, align)


def draw_stacked(draw, xy, text, font, max_width, fill="white", stroke_fill=(74, 133, 251)):
    raw = str(text).replace(" ", "")[:8]
    if len(raw) <= 2:
        lines = [raw]
    elif len(raw) > 4:
        lines = [raw[:4], raw[4:]]
    else:
        mid = (len(raw) + 1) // 2
        lines = [raw[:mid], raw[mid:]]
    x, y = xy
    line_gap = int(font.size * 1.05)
    start_y = y - int((len(lines) - 1) * line_gap / 2)
    for index, line in enumerate(lines):
        draw_text(draw, (x, start_y + index * line_gap), line, font, fill, max_width, "center", stroke_fill, max(2, font.size // 16))


def draw_graphic_text(img, cfg, key, source_size):
    draw = ImageDraw.Draw(img)
    sx = img.width / source_size[0]
    sy = img.height / source_size[1]

    def box(x, y, w, h):
        return (round(x * sx), round(y * sy), round((x + w) * sx), round((y + h) * sy))

    def xy(x, y):
        return (round(x * sx), round(y * sy))

    def size(px):
        return max(12, round(px * sx))

    if key == "graphic1":
        draw_embossed_white(draw, xy(390, 165), graphic_text(cfg, key, "brand"), f(size(92), True), size(555))
        draw_embossed_white(draw, xy(407, 772), graphic_text(cfg, key, "action"), f(size(54), True), size(190), "center")
    elif key == "graphic2":
        draw_embossed_white(draw, xy(420, 166), graphic_text(cfg, key, "brand"), f(size(94), True), size(570))
        draw_embossed_white(draw, xy(428, 776), graphic_text(cfg, key, "action"), f(size(54), True), size(195), "center")
    elif key == "graphic3":
        draw_stacked(draw, xy(718, 407), graphic_text(cfg, key, "milestone"), f(size(86), True), size(250))
        draw_stacked(draw, xy(1265, 488), graphic_text(cfg, key, "delivery"), f(size(82), True), size(250), (246, 251, 255), (75, 133, 251))
        draw_text(draw, xy(1100, 817), graphic_text(cfg, key, "publish"), f(size(46), True), "white", size(225), "center")
        draw_text(draw, xy(1554, 221), graphic_text(cfg, key, "status"), f(size(48), True), (77, 136, 247), size(155), "center")
    elif key == "graphic4":
        draw_text(draw, xy(477, 101), graphic_text(cfg, key, "ai"), f(size(62), True), (60, 121, 200), size(170), "center")
        draw_text(draw, xy(727, 103), graphic_text(cfg, key, "coder"), f(size(60)), (52, 116, 194), size(405))
    elif key == "graphic5":
        draw_embossed_white(draw, xy(328, 980), graphic_text(cfg, key, "title"), f(size(72), True), size(420), "center")


def draw_points(draw, cfg, start_y=1180, max_height=430):
    rows = [point_text(p).strip() for p in feature_points(cfg) if point_text(p).strip()]
    if not rows:
        return
    count = len(rows)
    text_size_px = max(46, min(70, int(((max_height - max(0, count - 1) * 28) / count) * 0.58)))
    line_gap = max(96, min(178, int(max_height / count)))
    y = start_y
    for row in rows:
        label, sep, body = row.partition("：")
        if not sep:
            label, sep, body = row.partition(":")
        draw.ellipse((157, y + 36, 178, y + 57), fill=(58, 86, 132))
        if body:
            prefix = f"{label}："
            draw.text((218, y), prefix, fill=(50, 78, 123), font=f(text_size_px, True))
            lw, _ = text_size(draw, prefix, f(text_size_px, True))
            draw.text((218 + lw + 18, y), body, fill=(54, 82, 127), font=f(text_size_px))
        else:
            draw.text((218, y), row, fill=(50, 78, 123), font=f(text_size_px, True))
        y += line_gap


def draw_notice(draw, notice):
    draw.rounded_rectangle((168, 1660, 255, 1748), radius=28, fill=(255, 198, 0))
    draw.text((205, 1668), "♥", fill="white", font=f(48, True))
    draw.text((320, 1662), notice, fill=(52, 82, 128), font=f(72, True))


def render(cfg, output, preview=False):
    img = Image.open(ASSETS / "background.png").convert("RGBA")
    d = ImageDraw.Draw(img)
    paste_logo(img)
    paste_badge(img)
    blue = cfg.get("title_blue") or cfg.get("title", "功能主标题")
    dark = cfg.get("title_dark", "")
    if dark:
        d.text((160, 760), blue, fill=(33, 128, 247), font=f(174, True))
        tw, _ = text_size(d, blue, f(174, True))
        d.text((160 + tw + 45, 760), dark, fill=(12, 31, 117), font=f(174, True))
    else:
        d.text((160, 750), blue, fill=(33, 128, 247), font=f(184, True))
    if cfg.get("subtitle"):
        d.text((430 if blue.startswith("统一") else 160, 1140), cfg["subtitle"], fill=(12, 31, 117), font=f(130, True))
    draw_points(d, cfg)
    if cfg.get("notice"):
        draw_notice(d, cfg["notice"])
    draw_visual(img, cfg)
    if preview:
        img = img.resize((1920, 960), Image.Resampling.LANCZOS)
    img.convert("RGB").save(output, quality=95)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()
    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    render(cfg, args.output, args.preview)


if __name__ == "__main__":
    main()
