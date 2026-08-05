"""Renders the banner scene: the cat lives a little life on a master timeline -
scoots to its bowl, eats (head bobs), scoots to the yarn, bats it (paw + yarn
rolls), then scoots home. State overrides:
  hungry  -> camps at the empty bowl all day
  grumpy  -> sulks in the cardboard box with angry brows
  zoomies -> the whole routine at 2x with motion lines
  sleeping-> curled up with Zzz (handled separately)
Zero dependencies, pure SMIL."""
from xml.sax.saxutils import escape

from pet import sprites

PX = 6
WIDTH, HEIGHT = 894, 190
GROUND_Y = 158
CAT_Y = GROUND_Y - 16 * PX
CAT_W = 20 * PX
HOME_X, YARN_X, BOWL_X = 70, 430, 640
CAT_AT_BOWL, CAT_AT_YARN = 500, 320

PALETTES = {
    "dark": dict(bg="#0d1117", body="#e6edf3", accent="#58a6ff", pink="#ff9bce",
                 ground="#30363d", text="#8b949e", heart="#ff7b72", lid="#0d1117",
                 yarn="#d2a8ff"),
    "light": dict(bg="#ffffff", body="#1f2328", accent="#0969da", pink="#e8590c",
                  ground="#d0d7de", text="#57606a", heart="#cf222e", lid="#ffffff",
                  yarn="#8250df"),
}

STATE_TEMPO = {"zoomies": 14, "content": 32}


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


def _pixels(coords, color, x0, y0, scale=PX):
    return [
        f'<rect x="{x0 + cx * scale}" y="{y0 + cy * scale}" width="{scale}" height="{scale}" fill="{color}"/>'
        for cx, cy in coords
    ]


def _blink(pal, y0):
    open_r = "".join(_pixels(sprites.SIT_EYES, pal["accent"], 0, y0))
    lid_r = "".join(_pixels(sprites.SIT_EYES, pal["lid"], 0, y0, ))
    return [
        '<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.96;1" '
        'calcMode="discrete" dur="4.2s" repeatCount="indefinite"/>' + open_r + "</g>",
        '<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;1" '
        'calcMode="discrete" dur="4.2s" repeatCount="indefinite"/>' + lid_r + "</g>",
    ]


def _tail_wag(pal, y0, dur="1.4s"):
    a = "".join(_pixels(sprites.TAIL_A, pal["body"], 0, y0))
    b = "".join(_pixels(sprites.TAIL_B, pal["body"], 0, y0))
    return [
        f'<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" '
        f'calcMode="discrete" dur="{dur}" repeatCount="indefinite"/>{a}</g>',
        f'<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" '
        f'calcMode="discrete" dur="{dur}" repeatCount="indefinite"/>{b}</g>',
    ]


def _head_group(state, pal, colors, y0, master_dur, eat_window=None):
    """Head rows (+eyes/whiskers/brows) with optional eat-bobbing on the master clock."""
    h0, h1 = sprites.SIT_HEAD_ROWS
    head = []
    if eat_window:
        w0, w1 = eat_window
        step = (w1 - w0) / 6.0
        times = [0.0, w0, w0 + step, w0 + 2 * step, w0 + 3 * step, w0 + 4 * step, w0 + 5 * step, w1, 1.0]
        times = [min(max(t, 0.0), 1.0) for t in times]
        vals = ["0 0", "0 0", "0 8", "0 0", "0 8", "0 0", "0 8", "0 0", "0 0"]
        kt = ";".join(f"{t:.3f}" for t in times)
        head.append(
            f'<g><animateTransform attributeName="transform" type="translate" '
            f'values="{";".join(vals)}" keyTimes="{kt}" dur="{master_dur}s" repeatCount="indefinite"/>'
        )
    else:
        head.append("<g>")
    head.extend(_rects(sprites.SIT_FRONT[h0:h1 + 1], colors, 0, y0))
    head.extend(_pixels(sprites.SIT_WHISKERS, pal["body"], 0, y0))
    head.extend(_blink(pal, y0))
    if state == "grumpy":
        head.extend(_pixels(sprites.SIT_BROWS, pal["accent"], 0, y0))
    head.append("</g>")
    return head


def _body_group(pal, colors, y0, master_dur, bat_window=None, wag="1.4s"):
    b0, b1 = sprites.SIT_BODY_ROWS
    body = _rects(sprites.SIT_FRONT[b0:b1 + 1], colors, 0, y0 + b0 * PX)
    body.extend(_tail_wag(pal, y0, dur=wag))
    if bat_window:
        w0, w1 = bat_window
        mid = (w0 + w1) / 2.0
        tucked = "".join(_pixels(sprites.PAW_TUCKED, pal["body"], 0, y0))
        out = "".join(_pixels(sprites.PAW_EXTENDED, pal["body"], 0, y0))
        kt = f"0;{w0:.3f};{mid:.3f};{w1:.3f};1"
        body.append(
            f'<g><animate attributeName="opacity" values="1;1;0;0;1" keyTimes="{kt}" '
            f'calcMode="discrete" dur="{master_dur}s" repeatCount="indefinite"/>{tucked}</g>'
        )
        body.append(
            f'<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="{kt}" '
            f'calcMode="discrete" dur="{master_dur}s" repeatCount="indefinite"/>{out}</g>'
        )
    return body


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


def _yarn_prop(pal, master_dur, bat_window):
    """Yarn ball sitting in the scene; rolls away when batted, comes back."""
    y0 = GROUND_Y - 6 * PX
    cells = _rects(sprites.YARN, {"h": pal["yarn"]}, 0, 0)
    if bat_window:
        w0, w1 = bat_window
        kt = f"0;{w0:.3f};{w0 + 0.03:.3f};{w1:.3f};{min(w1 + 0.08, 0.99):.3f};1"
        vals = "0 0;0 0;52 -10;52 0;52 0;0 0"
        return [
            f'<g><animateTransform attributeName="transform" type="translate" '
            f'values="{vals}" keyTimes="{kt}" dur="{master_dur}s" repeatCount="indefinite"/>'
            + "".join(cells) + "</g>"
        ]
    return cells


def _props(pal, colors, state, master_dur=None, bat_window=None):
    parts = []
    # cardboard box at home
    parts.append(
        f'<rect x="{HOME_X - 16}" y="{GROUND_Y - 40}" width="80" height="40" fill="none" '
        f'stroke="{pal["ground"]}" stroke-width="2"/>'
    )
    parts.append(
        f'<line x1="{HOME_X - 16}" y1="{GROUND_Y - 40}" x2="{HOME_X + 24}" y2="{GROUND_Y - 52}" '
        f'stroke="{pal["ground"]}" stroke-width="2"/>'
    )
    # yarn
    if master_dur and bat_window:
        parts.append(f'<g transform="translate({YARN_X},0)">' + "".join(_yarn_prop(pal, master_dur, bat_window)) + "</g>")
    else:
        parts.append(f'<g transform="translate({YARN_X},0)">' + "".join(_yarn_prop(pal, 1, None)) + "</g>")
    # bowl (empty for hungry -> ground colour, full otherwise -> pink kibble dot)
    bowl_color = pal["ground"] if state == "hungry" else pal["body"]
    parts.extend(_rects(sprites.BOWL, {"X": bowl_color}, BOWL_X, GROUND_Y - 5 * PX))
    if state != "hungry":
        parts.append(f'<rect x="{BOWL_X + 4 * PX}" y="{GROUND_Y - 5 * PX}" width="{PX}" height="{PX}" fill="{pal["pink"]}"/>')
        parts.append(f'<rect x="{BOWL_X + 6 * PX}" y="{GROUND_Y - 5 * PX}" width="{PX}" height="{PX}" fill="{pal["pink"]}"/>')
    return parts


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
    y0 = GROUND_Y - 14 * PX
    parts = _rects(sprites.CURL_BODY, colors, 90, y0)
    parts.extend(
        f'<rect x="{90 + ex * PX}" y="{y0 + ey * PX}" width="{PX}" height="{PX}" fill="{pal["lid"]}"/>'
        for ex, ey in sprites.CURL_LIDS
    )
    parts.extend(_zzz(pal))
    return parts


def _routine_cat(state, pal, colors):
    dur = STATE_TEMPO.get(state, 32)
    if state == "hungry":
        # camps at the bowl, slow hopeful head-bobs
        cat = [f'<g transform="translate({CAT_AT_BOWL},0)">']
        cat.extend(_body_group(pal, colors, CAT_Y, dur))
        cat.extend(_head_group(state, pal, colors, CAT_Y, 6.0, eat_window=(0.1, 0.9)))
        cat.append("</g>")
        return cat
    if state == "grumpy":
        # sulks in the box, slow tail flick only
        cat = [f'<g transform="translate({HOME_X - 6},14)">']
        cat.extend(_body_group(pal, colors, CAT_Y, dur, wag="3.2s"))
        cat.extend(_head_group(state, pal, colors, CAT_Y, dur))
        cat.append("</g>")
        return cat
    # full routine: home -> bowl (eat) -> yarn (bat) -> home
    kt = "0;0.12;0.35;0.45;0.62;0.82;1"
    xs = f"{HOME_X};{CAT_AT_BOWL};{CAT_AT_BOWL};{CAT_AT_YARN};{CAT_AT_YARN};{HOME_X};{HOME_X}"
    cat = [
        f'<g><animateTransform attributeName="transform" type="translate" '
        f'values="{xs.replace(";", " 0;")} 0" keyTimes="{kt}" dur="{dur}s" repeatCount="indefinite"/>'
    ]
    cat.append(
        '<g><animateTransform attributeName="transform" type="translate" '
        'values="0 0;0 -3;0 0" dur="0.7s" repeatCount="indefinite"/>'
    )
    cat.extend(_body_group(pal, colors, CAT_Y, dur, bat_window=(0.66, 0.78)))
    cat.extend(_head_group(state, pal, colors, CAT_Y, dur, eat_window=(0.15, 0.33)))
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
        dur = STATE_TEMPO.get(state, 32)
        parts.extend(_props(pal, colors, state, dur, (0.66, 0.78)))
        parts.extend(_routine_cat(state, pal, colors))
    label = f"state: {state} - {caption} · regenerated every 6h"
    parts.append(
        f'<text x="16" y="{HEIGHT - 10}" font-family="monospace" font-size="12" '
        f'fill="{pal["text"]}">{escape(label)}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)