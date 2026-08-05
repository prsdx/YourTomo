"""Renders the banner: a side-view cat that patrols back and forth (never leaves)."""
from xml.sax.saxutils import escape

from pet import sprites

PX = 6
WIDTH, HEIGHT = 894, 180
GROUND_Y = 150
CAT_Y = GROUND_Y - 14 * PX
CAT_HALF = 60  # half the cat width, for the flip pivot

PALETTES = {
    "dark": dict(bg="#0d1117", body="#e6edf3", accent="#58a6ff", pink="#ff9bce",
                 ground="#30363d", text="#8b949e", heart="#ff7b72", lid="#0d1117"),
    "light": dict(bg="#ffffff", body="#1f2328", accent="#0969da", pink="#e8590c",
                  ground="#d0d7de", text="#57606a", heart="#cf222e", lid="#ffffff"),
}

STATE_TEMPO = {"zoomies": 10, "content": 24, "hungry": 30, "grumpy": 34}


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


def _blink_eyes(pal, blink=True):
    open_r = "".join(
        f'<rect x="{ex * PX - CAT_HALF}" y="{CAT_Y + ey * PX}" width="{PX}" height="{PX}" fill="{pal["accent"]}"/>'
        for ex, ey in sprites.WALK_EYES
    )
    lid_r = "".join(
        f'<rect x="{ex * PX - CAT_HALF}" y="{CAT_Y + ey * PX}" width="{2 * PX}" height="{PX}" fill="{pal["lid"]}"/>'
        for ex, ey in sprites.WALK_EYES
    )
    if not blink:
        return [open_r]
    return [
        '<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.97;1" '
        'calcMode="discrete" dur="4.5s" repeatCount="indefinite"/>' + open_r + "</g>",
        '<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.97;1" '
        'calcMode="discrete" dur="4.5s" repeatCount="indefinite"/>' + lid_r + "</g>",
    ]


def _whiskers(pal):
    return [
        f'<rect x="{wx * PX - CAT_HALF}" y="{CAT_Y + wy * PX + 2}" width="{3 * PX}" height="2" '
        f'fill="{pal["body"]}" opacity="0.7"/>'
        for wx, wy in sprites.WALK_WHISKERS
    ]


def _hearts(pal):
    out = []
    for bx, by, beg in ((13, -3, "0.4s"), (16, -5, "1.9s")):
        cells = "".join(_rects(sprites.HEART, {"h": pal["heart"]}, bx * PX - CAT_HALF, by * PX, scale=3))
        out.append(
            f'<g opacity="0">'
            f'<animateTransform attributeName="transform" type="translate" values="0 0;6 -20" '
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
            f'<text x="{170 + dx}" y="86" font-family="monospace" font-size="{size}" '
            f'fill="{pal["accent"]}" opacity="0">z'
            f'<animateTransform attributeName="transform" type="translate" values="0 0;8 -26" '
            f'dur="3s" begin="{beg}" repeatCount="indefinite"/>'
            f'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.25;0.75;1" '
            f'dur="3s" begin="{beg}" repeatCount="indefinite"/></text>'
        )
    return out


def _sleeping_cat(pal, colors):
    parts = _rects(sprites.CURL_BODY, colors, 90, CAT_Y)
    parts.extend(
        f'<rect x="{90 + ex * PX}" y="{CAT_Y + ey * PX}" width="{PX}" height="{PX}" fill="{pal["lid"]}"/>'
        for ex, ey in sprites.CURL_LIDS
    )
    parts.extend(_zzz(pal))
    return parts


def _patrolling_cat(state, pal, colors):
    """Cat walks right, turns, walks back - it never leaves the banner."""
    dur = STATE_TEMPO.get(state, 24)
    x_min, x_max = 90, WIDTH - 90
    kt = "0;0.45;0.5;0.95;1"
    cat = [
        f'<g><animateTransform attributeName="transform" type="translate" '
        f'values="{x_min} 0;{x_max} 0;{x_max} 0;{x_min} 0;{x_min} 0" keyTimes="{kt}" '
        f'dur="{dur}s" repeatCount="indefinite"/>'
    ]
    # flip group: face right on the way out, left on the way back
    cat.append(
        f'<g><animateTransform attributeName="transform" type="scale" '
        f'values="1 1;1 1;-1 1;-1 1;1 1" keyTimes="{kt}" calcMode="discrete" '
        f'dur="{dur}s" repeatCount="indefinite"/>'
    )
    cat.append(
        '<g><animateTransform attributeName="transform" type="translate" '
        'values="0 0;0 -3;0 0" dur="0.4s" repeatCount="indefinite"/>'
    )
    # body drawn centered on x=0 so the flip pivots around the cat middle
    cat.extend(_rects(sprites.WALK_BODY, colors, -CAT_HALF, CAT_Y))
    legs_a = "".join(_rects(sprites.LEGS_A, colors, -CAT_HALF, CAT_Y + 12 * PX))
    legs_b = "".join(_rects(sprites.LEGS_B, colors, -CAT_HALF, CAT_Y + 12 * PX))
    cat.append(
        '<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" '
        f'calcMode="discrete" dur="0.8s" repeatCount="indefinite"/>{legs_a}</g>'
    )
    cat.append(
        '<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" '
        f'calcMode="discrete" dur="0.8s" repeatCount="indefinite"/>{legs_b}</g>'
    )
    cat.extend(_blink_eyes(pal))
    cat.extend(_whiskers(pal))
    if state == "content":
        cat.extend(_hearts(pal))
    cat.append("</g></g></g>")
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
        parts.extend(_patrolling_cat(state, pal, colors))
    label = f"state: {state} - {caption} · regenerated every 6h"
    parts.append(
        f'<text x="16" y="{HEIGHT - 10}" font-family="monospace" font-size="12" '
        f'fill="{pal["text"]}">{escape(label)}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)