"""Render sprites + state into an animated SVG banner.

Pure SVG + SMIL: GitHub READMEs strip all JavaScript and CSS, so SMIL is the
only way an image can animate there. No external assets, no scripts.
"""
from __future__ import annotations

from .sprites import WALK_A, WALK_B, SIT, CURL, back_view

W, H = 894, 170
GROUND_Y = 132
PX = 5

DARK = {"bg": "#0d1117", "body": "#e6edf3", "eye": "#0d1117", "nose": "#ff7b72",
        "ground": "#30363d", "text": "#8b949e", "accent": "#ff7b72", "z": "#58a6ff"}
LIGHT = {"bg": "#ffffff", "body": "#1f2328", "eye": "#ffffff", "nose": "#e5534b",
         "ground": "#d0d7de", "text": "#57606a", "accent": "#cf222e", "z": "#0969da"}

FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _grid_rects(grid: list, px: int, colors: dict) -> str:
    out = []
    for gy, row in enumerate(grid):
        cx = 0
        while cx < len(row):
            ch = row[cx]
            if ch == ".":
                cx += 1
                continue
            run = 1
            while cx + run < len(row) and row[cx + run] == ch:
                run += 1
            out.append(f'<rect x="{cx*px}" y="{gy*px}" width="{run*px}" height="{px}" fill="{colors[ch]}"/>')
            cx += run
    return "".join(out)


def _blink_cover(grid: list, px: int, body_color: str) -> str:
    eyes = [(x, y) for y, row in enumerate(grid) for x, ch in enumerate(row) if ch == "o"]
    if not eyes:
        return ""
    x0 = min(x for x, _ in eyes) * px
    x1 = (max(x for x, _ in eyes) + 1) * px
    y0 = min(y for _, y in eyes) * px
    return (f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{px}" fill="{body_color}" opacity="0">'
            f'<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;1" '
            f'calcMode="discrete" dur="4.4s" repeatCount="indefinite"/></rect>')


def _cat(colors: dict, grid: list = None, legs: tuple = None, blink: bool = True) -> str:
    if legs:
        a = _grid_rects(legs[0], PX, colors)
        b = _grid_rects(legs[1], PX, colors)
        swap_a = ('<animate attributeName="opacity" values="1;0" keyTimes="0;0.5" '
                  'calcMode="discrete" dur="0.36s" repeatCount="indefinite"/>')
        swap_b = ('<animate attributeName="opacity" values="0;1" keyTimes="0;0.5" '
                  'calcMode="discrete" dur="0.36s" repeatCount="indefinite"/>')
        cover = _blink_cover(legs[0], PX, colors["X"]) if blink else ""
        return f"<g>{a}{swap_a}</g><g>{b}{swap_b}</g>{cover}"
    cover = _blink_cover(grid, PX, colors["X"]) if blink else ""
    return f"<g>{_grid_rects(grid, PX, colors)}</g>{cover}"


def _patrol(inner: str, dur: float, y: int) -> str:
    return (f'<g transform="translate(0,{y})"><g>'
            f'<animateTransform attributeName="transform" type="translate" values="-90 0; 900 0" '
            f'dur="{dur}s" repeatCount="indefinite" calcMode="linear"/>'
            f"{inner}</g></g>")


def _hearts(pal: dict) -> str:
    out = ""
    for dx, delay in ((8, "0s"), (30, "1.4s")):
        out += (f'<text x="{dx}" y="-8" font-size="17" fill="{pal["accent"]}" opacity="0">&#9829;'
                f'<animate attributeName="y" values="-8;-34" dur="2.8s" begin="{delay}" repeatCount="indefinite"/>'
                f'<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.35;1" dur="2.8s" begin="{delay}" repeatCount="indefinite"/></text>')
    return out


def _zzz(pal: dict) -> str:
    out = ""
    for size, dx, delay in ((16, 30, "0s"), (13, 46, "1s"), (10, 60, "2s")):
        out += (f'<text x="{dx}" y="24" font-size="{size}" fill="{pal["z"]}" opacity="0">Z'
                f'<animate attributeName="y" values="24;-12" dur="3s" begin="{delay}" repeatCount="indefinite"/>'
                f'<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.3;1" dur="3s" begin="{delay}" repeatCount="indefinite"/></text>')
    return out


def _motion_lines(pal: dict) -> str:
    out = ""
    for i, (w, y) in enumerate(((16, 18), (11, 30), (7, 42))):
        out += (f'<rect x="{-26 - i*4}" y="{y}" width="{w}" height="3" fill="{pal["text"]}">'
                f'<animate attributeName="opacity" values="0;1;0" dur="0.4s" begin="{i*0.12}s" repeatCount="indefinite"/></rect>')
    return out


def _bowl(pal: dict, x: int, y: int) -> str:
    return (f'<rect x="{x}" y="{y}" width="34" height="6" rx="2" fill="{pal["ground"]}"/>'
            f'<rect x="{x+3}" y="{y+6}" width="28" height="9" rx="2" fill="{pal["ground"]}"/>'
            f'<rect x="{x+6}" y="{y+8}" width="22" height="3" fill="{pal["bg"]}"/>')


def render(state: str, caption: str, pal: dict) -> str:
    colors = {"X": pal["body"], "o": pal["eye"], "p": pal["nose"], "T": pal["body"]}
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
        f'<rect width="{W}" height="{H}" rx="10" fill="{pal["bg"]}"/>',
        f'<line x1="16" y1="{GROUND_Y}" x2="{W-16}" y2="{GROUND_Y}" stroke="{pal["ground"]}" stroke-width="2" stroke-dasharray="8 6"/>',
    ]
    cat_y = GROUND_Y - 14 * PX
    if state == "zoomies":
        parts.append(_patrol(_cat(colors, legs=(WALK_A, WALK_B), blink=False) + _motion_lines(pal), 2.4, cat_y))
    elif state == "sleeping":
        parts.append(f'<g transform="translate(72,{GROUND_Y - 8*PX})">{_grid_rects(CURL, PX, colors)}{_zzz(pal)}</g>')
    elif state == "hungry":
        parts.append(f'<g transform="translate(400,{cat_y})">{_cat(colors, grid=SIT)}</g>')
        parts.append(_bowl(pal, 400 + 18 * PX, GROUND_Y - 15))
    elif state == "grumpy":
        parts.append(f'<g transform="translate({W-176},{cat_y})">{_cat(colors, grid=back_view(SIT), blink=False)}</g>')
    else:
        parts.append(_patrol(_cat(colors, legs=(WALK_A, WALK_B)) + _hearts(pal), 30, cat_y))
    parts.append(f'<text x="18" y="{H-16}" font-size="13" fill="{pal["text"]}">{_esc(caption)}</text>')
    parts.append(f'<text x="{W-18}" y="{H-16}" font-size="11" fill="{pal["ground"]}" text-anchor="end">github-pet &#183; @prsdx</text>')
    parts.append("</svg>")
    return "".join(parts)