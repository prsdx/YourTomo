"""Renders the banner: a sitting outline cat with blinking eyes, wagging tail,
long whiskers and a slow scoot patrol. State extras: hearts (content),
empty bowl (hungry), angry brows (grumpy), motion lines (zoomies)."""
from xml.sax.saxutils import escape

from pet import sprites

PX = 6
WIDTH, HEIGHT = 894, 180
GROUND_Y = 152
CAT_Y = GROUND_Y - 16 * PX
CAT_W = 20 * PX

PALETTES = {
    "dark": dict(bg="#0d1117", body="#e6edf3", accent="#58a6ff", pink="#ff9bce",
                 ground="#30363d", text="#8b949e", heart="#ff7b72", lid="#0d1117"),
    "light": dict(bg="#ffffff", body="#1f2328", accent="#0969da", pink="#e8590c",
                  ground="#d0d7de", text="#57606a", heart="#cf222e", lid="#ffffff"),
}

STATE_TEMPO = {"zoomies": 10, "content": 26, "hungry": 34, "grumpy": 38}


def _rects(grid, colors, x0, y0, scale=PX):
    out = []
    for r, row in enumerate(grid):
        c = 0
        while c < len(row):
            ch = row[c]
            if ch in colors:
                s = c
                while c < len(row) and row[c] == ch:
                    c += 1
                out.append(
                    f'<rect x="{x0 + s * scale}" y="{y0 + r * scale}" '
                    f'width="{(c - s) * scale}" height="{scale}" fill="{colors[ch]}"/>'
                )
            else:
                c += 1
    return out


def _pixels(coords, color, x0, y0, scale=PX, w=None, h=None):
    w = w or scale
    h = h or scale
    return [
        f'<rect x="{x0 + cx * scale}" y="{y0 + cy * scale}" width="{w}" height="{h}" fill="{color}"/>'
        for cx, cy in coords
    ]


def _blink(pal):
    open_r = "".join(_pixels(sprites.SIT_EYES, pal["accent"], 0, CAT_Y))
    lid_r = "".join(_pixels(sprites.SIT_EYES, pal["lid"], 0, CAT_Y, w=2 * PX))
    return [
        '<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.96;1" '
        'calcMode="discrete" dur="4.2s" repeatCount="indefinite"/>' + open_r + "</g>",
        '<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;1" '
        'calcMode="discrete" dur="4.2s" repeatCount="indefinite"/>' + lid_r + "</g>",
    ]


def _tail_wag(pal):
    a = "".join(_pixels(sprites.TAIL_A, pal["body"], 0, CAT_Y))
    b = "".join(_pixels(sprites.TAIL_B, pal["body"], 0, CAT_Y))
    return [
        '<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" '
        f'calcMode="discrete" dur="1.4s" repeatCount="indefinite"/>{a}</g>',
        '<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" '
        f'calcMode="discrete" dur="1.4s" repeatCount="indefinite"/>{b}</g>',
    ]


def _hearts(pal):
    out = []
    for bx, by, beg in ((14, -2, "0.4s"), (17, -4, "1.9s")):
        cells = "".join(_rects(sprites.HEART, {"h": pal["heart"]}, bx * PX, by * PX, scale=3))
        out.append(
            f'<g opacity="0">'
            f'<animateTransform attributeName="transform" type="translate" values="0 0;6 -22" '
            f'dur="2.6s" begin="{beg}" repeatCount="indefinite"/>'
            f'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" '
            f'dur="2.6s" begin="{beg}" repeatCount="indefinite"/>'
            + cells + "</g>"
        )
    return out


def _zzz(pal):
    out = []
    for dx, size, beg in ((0, 12, "0s"), (14, 15, "1s"), (30, 18, "2s")):
        out.append(
            f'<text x="{170 + dx}" y="80" font-family="monospace" font-size="{size}" '
            f'fill="{pal["accent"]}" opacity="0">z'
            f'<animateTransform attributeName="transform" type="translate" values="0 0;8 -26" '
            f'dur="3s" begin="{beg}" repeatCount="indefinite"/>'
            f'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.25;0.75;1" '
            f'dur="3s" begin="{beg}" repeatCount="indefinite"/></text>'
        )
    return out


def _sleeping_cat(pal, colors):
    parts = _rects(sprites.CURL_BODY, colors, 90, GROUND_Y - 14 * PX)
    parts.extend(
        f'<rect x="{90 + ex * PX}" y="{GROUND_Y - 14 * PX + ey * PX}" width="{PX}" height="{PX}" fill="{pal["lid"]}"/>'
        for ex, ey in sprites.CURL_LIDS
    )
    parts.extend(_zzz(pal))
    return parts


def _sitting_cat(state, pal, colors):
    dur = STATE_TEMPO.get(state, 26)
    x_min, x_max = 70, WIDTH - 70 - CAT_W
    kt = "0;0.42;0.5;0.92;1"
    cat = [
        f'<g><animateTransform attributeName="transform" type="translate" '
        f'values="{x_min} 0;{x_max} 0;{x_max} 0;{x_min} 0;{x_min} 0" keyTimes="{kt}" '
        f'dur="{dur}s" repeatCount="indefinite"/>',
        # gentle hop-scoot bob
        '<g><animateTransform attributeName="transform" type="translate" '
        'values="0 0;0 -4;0 0" keyTimes="0;0.5;1" dur="0.7s" repeatCount="indefinite"/>',
    ]
    cat.extend(_rects(sprites.SIT_FRONT, colors, 0, CAT_Y))
    cat.extend(_pixels(sprites.SIT_WHISKERS, pal["body"], 0, CAT_Y))
    cat.extend(_tail_wag(pal))
    if state == "grumpy":
        cat.extend(_pixels(sprites.SIT_BROWS, pal["accent"], 0, CAT_Y))
        cat.extend(_blink(pal))
    else:
        cat.extend(_blink(pal))
    if state == "content":
        cat.extend(_hearts(pal))
    if state == "zoomies":
        for i, (ox, oy) in enumerate(((-46, 30), (-64, 55), (-40, 80))):
            cat.append(
                f'<rect x="{ox}" y="{CAT_Y + oy}" width="{6 * PX}" height="3" fill="{pal["body"]}" opacity="0.6">'
                f'<animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.5s" '
                f'begin="{i * 0.15}s" repeatCount="indefinite"/></rect>'
            )
    cat.append("</g></g>")
    if state == "hungry":
        # empty bowl sitting in front of the cat's path midpoint
        cat.extend(_rects(sprites.BOWL, {**colors, "X": pal["ground"]}, x_min + CAT_W + 30, GROUND_Y - 5 * PX))
    return cat


def build_svg(state, caption, palette="dark"):
    pal = PALETTES[palette]
    colors = {"X": pal["body"], "p": pal["pink"]}
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="github pet: {escape(state)}">',
        f"<title>github pet - {escape(state)}</title>",
        f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{pal["bg"]}"/>',
        f'<line x1="0" y1="{GROUND_Y}" x2="{WIDTH}" y2="{GROUND_Y}" stroke="{pal["ground"]}" '
        f'stroke-width="2" stroke-dasharray="8 8"/>',
    ]
    if state == "sleeping":
        parts.extend(_sleeping_cat(pal, colors))
    else:
        parts.extend(_sitting_cat(state, pal, colors))
    label = f"state: {state} - {caption} · regenerated every 6h"
    parts.append(
        f'<text x="16" y="{HEIGHT - 10}" font-family="monospace" font-size="12" '
        f'fill="{pal["text"]}">{escape(label)}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)