"""Renders OUR OWN contribution graph (real data via GraphQL) with a small
front-facing kitty hopping along the top of it. Zero dependencies."""
from xml.sax.saxutils import escape

from pet import sprites

SCALE = 3          # kitty pixel scale (small cat)
CELL, GAP = 12, 3  # contribution cell size and gap
STRIDE = CELL + GAP
TOP = 74           # space above the grid for the kitty
LEFT = 50
WIDTH, HEIGHT = 894, 210

PALETTES = {
    "dark": dict(bg="#0d1117", body="#e6edf3", accent="#58a6ff", pink="#ff9bce",
                 text="#8b949e", heart="#ff7b72", lid="#0d1117",
                 cells=["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"]),
    "light": dict(bg="#ffffff", body="#1f2328", accent="#0969da", pink="#e8590c",
                  text="#57606a", heart="#cf222e", lid="#ffffff",
                  cells=["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]),
}

STATE_TEMPO = {"zoomies": 8, "content": 18, "hungry": 24, "grumpy": 28}


def _level(count):
    if count <= 0:
        return 0
    if count <= 3:
        return 1
    if count <= 6:
        return 2
    if count <= 9:
        return 3
    return 4


def _rects(grid, colors, x0, y0, scale=SCALE):
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


def _kitty(state, pal, colors, x_min, x_max):
    """Front-facing mochi kitty hopping along the top of the graph, ping-pong."""
    dur = STATE_TEMPO.get(state, 18)
    kt = "0;0.45;0.5;0.95;1"
    cat_w = 16 * SCALE
    cx = (x_min + x_max) / 2
    cat = [
        f'<g><animateTransform attributeName="transform" type="translate" '
        f'values="{x_min} 0;{x_max} 0;{x_max} 0;{x_min} 0;{x_min} 0" keyTimes="{kt}" '
        f'dur="{dur}s" repeatCount="indefinite"/>',
        # hop bob (squash-free simple arc)
        '<g><animateTransform attributeName="transform" type="translate" '
        'values="0 0;0 -6;0 0" keyTimes="0;0.5;1" dur="0.55s" repeatCount="indefinite"/>',
    ]
    body = _rects(sprites.FRONT_BODY, colors, 0, TOP - 14 * SCALE - 4)
    cat.extend(body)
    # long whiskers, neko style
    for wx, wy in sprites.FRONT_WHISKERS:
        cat.append(
            f'<rect x="{wx * SCALE - (2 * SCALE if wx < 8 else -SCALE)}" y="{TOP - 14 * SCALE - 4 + wy * SCALE + 1}" '
            f'width="{3 * SCALE}" height="1.5" fill="{pal["body"]}" opacity="0.8"/>'
        )
    # blink
    open_r = "".join(
        f'<rect x="{ex * SCALE}" y="{TOP - 14 * SCALE - 4 + ey * SCALE}" width="{SCALE}" height="{SCALE}" '
        f'fill="{pal["accent"]}"/>'
        for ex, ey in sprites.FRONT_EYES
    )
    lid_r = "".join(
        f'<rect x="{ex * SCALE}" y="{TOP - 14 * SCALE - 4 + ey * SCALE}" width="{2 * SCALE}" height="{SCALE}" '
        f'fill="{pal["lid"]}"/>'
        for ex, ey in sprites.FRONT_EYES
    )
    cat.append(
        '<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.96;1" '
        'calcMode="discrete" dur="4s" repeatCount="indefinite"/>' + open_r + "</g>"
    )
    cat.append(
        '<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;1" '
        'calcMode="discrete" dur="4s" repeatCount="indefinite"/>' + lid_r + "</g>"
    )
    if state == "content":
        for beg, ox in (("0.6s", 8 * SCALE), ("2.1s", 11 * SCALE)):
            cells = "".join(_rects(sprites.HEART, {"h": pal["heart"]}, ox, TOP - 14 * SCALE - 16, scale=2))
            cat.append(
                f'<g opacity="0">'
                f'<animateTransform attributeName="transform" type="translate" values="0 0;4 -12" '
                f'dur="2.4s" begin="{beg}" repeatCount="indefinite"/>'
                f'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" '
                f'dur="2.4s" begin="{beg}" repeatCount="indefinite"/>'
                + cells + "</g>"
            )
    cat.append("</g></g>")
    return cat


def build_graph_svg(state, caption, calendar, palette="dark"):
    pal = PALETTES[palette]
    colors = {"X": pal["body"], "p": pal["pink"]}
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="contribution graph cat: {escape(state)}">',
        f"<title>contribution graph cat - {escape(state)}</title>",
        f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{pal["bg"]}"/>',
    ]
    weeks = 53
    if calendar:
        days = calendar["days"]
        for i, d in enumerate(days):
            col, row = divmod(i, 7)
            parts.append(
                f'<rect x="{LEFT + col * STRIDE}" y="{TOP + row * STRIDE}" width="{CELL}" height="{CELL}" '
                f'rx="2" fill="{pal["cells"][_level(d["count"])]}">'
                f"<title>{d['date']}: {d['count']} contributions</title></rect>"
            )
        total = calendar["total"]
    else:
        for col in range(weeks):
            for row in range(7):
                parts.append(
                    f'<rect x="{LEFT + col * STRIDE}" y="{TOP + row * STRIDE}" width="{CELL}" height="{CELL}" '
                    f'rx="2" fill="{pal["cells"][0]}"/>'
                )
        total = None
    parts.extend(_kitty(state, pal, colors, LEFT, LEFT + weeks * STRIDE - 16 * SCALE - 6))
    label = f"state: {state} - {caption}"
    if total is not None:
        label += f" · {total} contributions this year"
    else:
        label += " · graph data unavailable"
    label += " · regenerated every 6h"
    parts.append(
        f'<text x="16" y="{HEIGHT - 10}" font-family="monospace" font-size="12" '
        f'fill="{pal["text"]}">{escape(label)}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)