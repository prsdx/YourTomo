// Self-generated about-me charts from real GitHub API data. Zero dependencies.
// Every chart is captioned with its data source and window - honest by design.

const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const LANG_COLORS: Record<string, string> = {
    Python: "#3572A5", TypeScript: "#3178c6", JavaScript: "#f1e05a",
    "C++": "#f34b7d", Kotlin: "#A97BFF", HTML: "#e34c26", CSS: "#563d7c",
    C: "#9b9b9b", Shell: "#89e051", Verilog: "#b2b7f8", Java: "#b07219",
};

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type LangsNote = "limit" | "unavailable";

export function langsChart(totals: Record<string, number>, nRepos: number, pal: Record<string, string>, note?: LangsNote): string {
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const w = 460, rowH = 24, labelW = 96, barMax = 290;
    const h = 46 + rowH * Math.max(top.length, 1) + 24;
    const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">`,
        `<rect width="${w}" height="${h}" rx="10" fill="${pal.bg}"/>`,
        `<text x="16" y="26" font-size="13" fill="${pal.text}">languages across ${nRepos} public repos</text>`,
    ];
    if (top.length === 0) {
        // Honest, reason-specific fallback. The callers that know the cause pass
        // a `note`; otherwise we keep the historical generic text so the
        // Action's own output (which swallows all failures) is unchanged.
        const msg = note === "limit" ? "no language data (api limit)"
            : note === "unavailable" ? "no language data (temporarily unavailable)"
            : "no language data (api limit)";
        parts.push(`<text x="16" y="60" font-size="12" fill="${pal.text}">${msg}</text>`);
    } else {
        const grand = top.reduce((s, [, v]) => s + v, 0);
        top.forEach(([lang, bytes], i) => {
            const y = 44 + i * rowH;
            const share = grand ? bytes / grand : 0;
            const bw = Math.max(Math.round((barMax * bytes) / top[0][1]), 3);
            const color = LANG_COLORS[lang] ?? pal.accent;
            parts.push(`<text x="16" y="${y + 13}" font-size="12" fill="${pal.body}">${esc(lang)}</text>`);
            parts.push(`<rect x="${labelW}" y="${y}" width="${bw}" height="15" rx="3" fill="${color}"/>`);
            parts.push(`<text x="${labelW + bw + 8}" y="${y + 12}" font-size="11" fill="${pal.text}">${Math.round(share * 100)}%</text>`);
        });
    }
    parts.push(`<text x="${w - 12}" y="${h - 10}" font-size="10" fill="${pal.ground}" text-anchor="end">live from github api</text>`);
    parts.push("</svg>");
    return parts.join("");
}