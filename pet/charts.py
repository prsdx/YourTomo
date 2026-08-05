"""Self-generated about-me charts from real GitHub API data.

Replaces third-party stats widgets (which break) with SVGs we own.
Every chart is captioned with its data source and window - honest by design.
"""
from __future__ import annotations

from xml.sax.saxutils import escape as _esc

FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

LANG_COLORS = {
    "Python": "#3572A5", "TypeScript": "#3178c6", "JavaScript": "#f1e05a",
    "C++": "#f34b7d", "Kotlin": "#A97BFF", "HTML": "#e34c26", "CSS": "#563d7c",
    "C": "#9b9b9b", "Shell": "#89e051", "Verilog": "#b2b7f8", "Java": "#b07219",
}


def langs_chart(totals: dict, n_repos: int, pal: dict) -> str:
    top = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:8]
    w, row_h, label_w, bar_max = 460, 24, 96, 290
    h = 46 + row_h * max(len(top), 1) + 24
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="{FONT}">',
             f'<rect width="{w}" height="{h}" rx="10" fill="{pal["bg"]}"/>',
             f'<text x="16" y="26" font-size="13" fill="{pal["text"]}">languages across {n_repos} public repos</text>']
    if not top:
        parts.append(f'<text x="16" y="60" font-size="12" fill="{pal["text"]}">no language data (api limit)</text>')
    else:
        grand = sum(v for _, v in top)
        for i, (lang, b) in enumerate(top):
            y = 44 + i * row_h
            share = b / grand if grand else 0
            bw = max(int(bar_max * b / top[0][1]), 3)
            color = LANG_COLORS.get(lang, pal["accent"])
            parts.append(f'<text x="16" y="{y+13}" font-size="12" fill="{pal["body"]}">{_esc(lang)}</text>')
            parts.append(f'<rect x="{label_w}" y="{y}" width="{bw}" height="15" rx="3" fill="{color}"/>')
            parts.append(f'<text x="{label_w+bw+8}" y="{y+12}" font-size="11" fill="{pal["text"]}">{share*100:.0f}%</text>')
    parts.append(f'<text x="{w-12}" y="{h-10}" font-size="10" fill="{pal["ground"]}" text-anchor="end">live from github api</text>')
    parts.append("</svg>")
    return "".join(parts)