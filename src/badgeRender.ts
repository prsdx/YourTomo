// shields-style mini badge for repo READMEs: "github-pet | <state>".
// Self-contained background, so a single file works on both themes.
// Zero dependencies, like everything else here.

const STATE_COLORS: Record<string, string> = {
    content: "#39d353",
    zoomies: "#2ea043",
    sleeping: "#58a6ff",
    hibernating: "#a371f7",
    hungry: "#d29922",
    grumpy: "#6e7681",
    overheat: "#f85149",
    release: "#bc8cff",
    sick: "#39c5cf",
};

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildBadgeSvg(state: string, caption: string): string {
    const label = "github-pet";
    const value = state;
    const leftW = 92;
    const rightW = Math.max(44, value.length * 7 + 16);
    const w = leftW + rightW, h = 28;
    const color = STATE_COLORS[state] ?? "#6e7681";
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="github-pet: ${esc(caption)}">`,
        `<title>github-pet: ${esc(caption)}</title>`,
        `<rect width="${leftW}" height="${h}" rx="4" fill="#24292f"/>`,
        `<rect x="${leftW}" width="${rightW}" height="${h}" rx="4" fill="${color}"/>`,
        `<rect x="${leftW}" width="4" height="${h}" fill="${color}"/>`,
        `<text x="${leftW / 2}" y="${h / 2 + 4}" font-family="monospace" font-size="12" fill="#ffffff" text-anchor="middle">${label}</text>`,
        `<text x="${leftW + rightW / 2}" y="${h / 2 + 4}" font-family="monospace" font-size="12" fill="#0d1117" text-anchor="middle" font-weight="bold">${esc(value)}</text>`,
        // subtle breathing dot: the badge is alive too
        `<circle cx="${w - 8}" cy="7" r="2.5" fill="#ffffff" opacity="0.9"><animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite"/></circle>`,
        `</svg>`,
    ].join("\n");
}
