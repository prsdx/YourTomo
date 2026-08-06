// Renders OUR OWN isometric contribution calendar (full year, real data via
// GraphQL) with the small front-facing kitty hopping along the weekly peaks.
// Replaces the lowlighter/metrics isocalendar dependency - zero dependencies,
// pure SMIL. Painter's algorithm: columns drawn far-to-near by (week + day).

import * as sprites from "./sprites.ts";
import type { Calendar } from "./graphApi.ts";

const WIDTH = 894, HEIGHT = 344; // 344 = fits front-edge month labels for the latest weeks (max y = 336)
const HX = 8, HY = 4;           // iso half-extents (2:1 projection)
const ZUNIT = 2.4, MAXH = 34;   // column height per contribution, capped
const FLAT_H = 2;               // slab height for zero-contribution days
const WEEKS = 53, DAYS = 7;
const OX = Math.round((WIDTH - (WEEKS - 1 + DAYS - 1) * HX) / 2) + (DAYS - 1) * HX; // center the x span (-6..52)
const OY = 78;
const CAT_SCALE = 2;
const CAT_W = 16 * CAT_SCALE, CAT_H = 14 * CAT_SCALE;

const PALETTES: Record<string, any> = {
    dark: { bg: "#0d1117", body: "#e6edf3", accent: "#58a6ff", pink: "#ff9bce", text: "#8b949e", heart: "#ff7b72", lid: "#0d1117", collar: "#58a6ff", tag: "#39d353", cells: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"] },
    light: { bg: "#ffffff", body: "#1f2328", accent: "#0969da", pink: "#e8590c", text: "#57606a", heart: "#cf222e", lid: "#ffffff", collar: "#0969da", tag: "#1a7f37", cells: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] },
};

const STATE_TEMPO: Record<string, number> = { zoomies: 34, content: 56, hungry: 64, grumpy: 72, overheat: 26 };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function level(count: number): number {
    if (count <= 0) return 0;
    if (count <= 3) return 1;
    if (count <= 6) return 2;
    if (count <= 9) return 3;
    return 4;
}

function shade(hex: string, f: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function height(count: number): number {
    if (count <= 0) return FLAT_H;
    return Math.min(4 + count * ZUNIT, MAXH);
}

// screen coords of a column's ground-level top-face center
function groundX(w: number, d: number): number { return OX + (w - d) * HX; }
function groundY(w: number, d: number): number { return OY + (w + d) * HY; }

function column(cx: number, ty: number, h: number, color: string, tip: string): string {
    const top = `${cx},${ty} ${cx + HX},${ty + HY} ${cx},${ty + 2 * HY} ${cx - HX},${ty + HY}`;
    const left = `${cx - HX},${ty + HY} ${cx},${ty + 2 * HY} ${cx},${ty + 2 * HY + h} ${cx - HX},${ty + HY + h}`;
    const right = `${cx + HX},${ty + HY} ${cx},${ty + 2 * HY} ${cx},${ty + 2 * HY + h} ${cx + HX},${ty + HY + h}`;
    return `<g><title>${esc(tip)}</title>` +
        `<polygon points="${left}" fill="${shade(color, 0.62)}"/>` +
        `<polygon points="${right}" fill="${shade(color, 0.42)}"/>` +
        `<polygon points="${top}" fill="${color}"/>` +
        `</g>`;
}

function rectsScaled(grid: string[], colors: Record<string, string>, x0 = 0, y0 = 0, scale = CAT_SCALE): string[] {
    const out: string[] = [];
    for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        let c = 0;
        while (c < row.length) {
            const ch = row[c];
            if (ch in colors) {
                const s = c;
                while (c < row.length && row[c] === ch) c++;
                out.push(`<rect x="${x0 + s * scale}" y="${y0 + r * scale}" width="${(c - s) * scale}" height="${scale}" fill="${colors[ch]}"/>`);
            } else {
                c++;
            }
        }
    }
    return out;
}


function kitty(state: string, pal: any, colors: Record<string, string>, path: Array<[number, number]>): string[] {
    const dur = STATE_TEMPO[state] ?? 56;
    const fwd = path.map(([px, py]) => `${(px - CAT_W / 2).toFixed(1)} ${(py - CAT_H + 3).toFixed(1)}`);
    const vals = [...fwd, ...fwd.slice(0, -1).reverse()].join(";");
    const n = fwd.length * 2 - 1;
    const kt = Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(3)).join(";");
    const cat: string[] = [
        `<g><animateTransform attributeName="transform" type="translate" values="${vals}" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite"/>`, // hop along the weekly peaks, then back
        `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" keyTimes="0;0.5;1" dur="0.8s" repeatCount="indefinite"/>`,
    ];
    cat.push(...rectsScaled(sprites.FRONT_BODY, colors));
    const overlays: Array<[Array<[number, number]>, string]> = [
        [sprites.FRONT_INNER_EARS, pal.pink],
        [sprites.FRONT_COLLAR_BAND, pal.collar],
        [sprites.FRONT_COLLAR_TAG, pal.tag],
    ];
    for (const [coords, col] of overlays) {
        for (const [px, py] of coords) {
            cat.push(`<rect x="${px * CAT_SCALE}" y="${py * CAT_SCALE}" width="${CAT_SCALE}" height="${CAT_SCALE}" fill="${col}"/>`);
        }
    }
    for (const [wx, wy] of sprites.FRONT_WHISKERS) {
        const x = wx * CAT_SCALE - (wx < 8 ? 2 * CAT_SCALE : -CAT_SCALE);
        cat.push(`<rect x="${x}" y="${wy * CAT_SCALE + 1}" width="${3 * CAT_SCALE}" height="1.5" fill="${pal.body}" opacity="0.8"/>`);
    }
    const openR = sprites.FRONT_EYES.map(([ex, ey]) => `<rect x="${ex * CAT_SCALE}" y="${ey * CAT_SCALE}" width="${CAT_SCALE}" height="${CAT_SCALE}" fill="${pal.accent}"/>`).join("");
    const lidR = sprites.FRONT_EYES.map(([ex, ey]) => `<rect x="${ex * CAT_SCALE}" y="${ey * CAT_SCALE}" width="${2 * CAT_SCALE}" height="${CAT_SCALE}" fill="${pal.lid}"/>`).join("");
    cat.push(`<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.96;1" calcMode="discrete" dur="4s" repeatCount="indefinite"/>${openR}</g>`);
    cat.push(`<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;1" calcMode="discrete" dur="4s" repeatCount="indefinite"/>${lidR}</g>`);
    if (state === "content") {
        for (const [beg, ox] of [["0.6s", 8 * CAT_SCALE], ["2.1s", 11 * CAT_SCALE]] as Array<[string, number]>) {
            const cells = rectsScaled(sprites.HEART, { h: pal.heart }, ox, -14, 1.5).join("");
            cat.push(`<g opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;3 -10" dur="2.4s" begin="${beg}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="2.4s" begin="${beg}" repeatCount="indefinite"/>${cells}</g>`);
        }
    }
    cat.push("</g></g>");
    return cat;
}

export function buildIsoSvg(state: string, caption: string, calendar: Calendar | null, palette = "dark", attribution = true): string {
    const pal = { ...PALETTES[palette] };
    if (state === "overheat") pal.body = "#ff7b72";
    const colors = { X: pal.body, p: pal.pink };
    const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="isometric contribution calendar cat: ${esc(state)}">`,
        `<title>isometric contribution calendar cat - ${esc(state)}</title>`,
        `<rect width="${WIDTH}" height="${HEIGHT}" fill="${pal.bg}"/>`,
    ];

    // day grid indexed [week][day]; missing data renders as flat slabs
    const grid: Array<Array<{ date: string; count: number }>> = [];
    for (let w = 0; w < WEEKS; w++) {
        grid.push(Array.from({ length: DAYS }, () => ({ date: "", count: 0 })));
    }
    let total: number | null = null;
    if (calendar) {
        calendar.days.forEach((d, i) => {
            const w = Math.floor(i / 7), day = i % 7;
            if (w < WEEKS) grid[w][day] = d;
        });
        total = calendar.total;
    }

    // columns far-to-near
    for (let w = 0; w < WEEKS; w++) {
        for (let d = 0; d < DAYS; d++) {
            const cell = grid[w][d];
            const h = height(cell.count);
            const tip = cell.date ? `${cell.date}: ${cell.count} contributions` : "no data";
            parts.push(column(groundX(w, d), groundY(w, d) - h, h, pal.cells[level(cell.count)], tip));
        }
    }

    // month labels along the front (d = 6) edge, where a week holds the 1st
    if (calendar) {
        for (let w = 0; w < WEEKS; w++) {
            const first = grid[w].find((c) => c.date && c.date.slice(8, 10) === "01");
            if (first) {
                const m = MONTHS[parseInt(first.date.slice(5, 7), 10) - 1];
                parts.push(`<text x="${groundX(w, 6) - 8}" y="${groundY(w, 6) + 2 * HY + FLAT_H + 16}" font-family="monospace" font-size="10" fill="${pal.text}">${m}</text>`);
            }
        }
    }

    // cat path: the peak (max-count day) of each week
    const path: Array<[number, number]> = [];
    for (let w = 0; w < WEEKS; w++) {
        let best = 0;
        for (let d = 1; d < DAYS; d++) if (grid[w][d].count > grid[w][best].count) best = d;
        path.push([groundX(w, best), groundY(w, best) - height(grid[w][best].count)]);
    }
    parts.push(...kitty(state, pal, colors, path));

    let label = `state: ${state} - ${caption}`;
    label += total !== null ? ` · ${total} contributions this year` : " · graph data unavailable";
    label += " · regenerated every 6h";
    if (attribution) label += " · github-pet by prsdx";
    parts.push(`<text x="16" y="${HEIGHT - 10}" font-family="monospace" font-size="12" fill="${pal.text}">${esc(label)}</text>`);
    parts.push("</svg>");
    return parts.join("\n");
}
