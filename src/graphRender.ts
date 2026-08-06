// Renders OUR OWN contribution graph (real data via GraphQL) with a small
// front-facing kitty hopping along the top of it. Zero dependencies.
// TypeScript port of graph_render.py.

import * as sprites from "./sprites.ts";
import type { Calendar } from "./graphApi.ts";

const SCALE = 3;
const CELL = 12, GAP = 3;
const STRIDE = CELL + GAP;
const TOP = 74;
const LEFT = 50;
const WIDTH = 894, HEIGHT = 210;

const PALETTES: Record<string, any> = {
    dark: { bg: "#0d1117", body: "#e6edf3", accent: "#58a6ff", pink: "#ff9bce", text: "#8b949e", heart: "#ff7b72", lid: "#0d1117", collar: "#58a6ff", tag: "#39d353", cells: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"] },
    light: { bg: "#ffffff", body: "#1f2328", accent: "#0969da", pink: "#e8590c", text: "#57606a", heart: "#cf222e", lid: "#ffffff", collar: "#0969da", tag: "#1a7f37", cells: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] },
};

const STATE_TEMPO: Record<string, number> = { zoomies: 16, content: 30, hungry: 36, grumpy: 42, overheat: 12 };

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

function rects(grid: string[], colors: Record<string, string>, x0: number, y0: number, scale = SCALE): string[] {
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

function kitty(state: string, pal: any, colors: Record<string, string>, xMin: number, xMax: number): string[] {
    const dur = STATE_TEMPO[state] ?? 30;
    const kt = "0;0.45;0.5;0.95;1";
    const yb = TOP - 14 * SCALE - 4;
    const cat: string[] = [
        `<g><animateTransform attributeName="transform" type="translate" values="${xMin} 0;${xMax} 0;${xMax} 0;${xMin} 0;${xMin} 0" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite"/>`,
        `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" keyTimes="0;0.5;1" dur="0.9s" repeatCount="indefinite"/>`,
    ];
    const body = rects(sprites.FRONT_BODY, colors, 0, yb);
    const extras: string[] = [];
    const overlays: Array<[Array<[number, number]>, string]> = [
        [sprites.FRONT_INNER_EARS, pal.pink],
        [sprites.FRONT_COLLAR_BAND, pal.collar],
        [sprites.FRONT_COLLAR_TAG, pal.tag],
    ];
    for (const [coords, col] of overlays) {
        for (const [px, py] of coords) {
            extras.push(`<rect x="${px * SCALE}" y="${yb + py * SCALE}" width="${SCALE}" height="${SCALE}" fill="${col}"/>`);
        }
    }
    cat.push(...body, ...extras);
    for (const [wx, wy] of sprites.FRONT_WHISKERS) {
        const x = wx * SCALE - (wx < 8 ? 2 * SCALE : -SCALE);
        cat.push(`<rect x="${x}" y="${yb + wy * SCALE + 1}" width="${3 * SCALE}" height="1.5" fill="${pal.body}" opacity="0.8"/>`);
    }
    const openR = sprites.FRONT_EYES.map(([ex, ey]) => `<rect x="${ex * SCALE}" y="${yb + ey * SCALE}" width="${SCALE}" height="${SCALE}" fill="${pal.accent}"/>`).join("");
    const lidR = sprites.FRONT_EYES.map(([ex, ey]) => `<rect x="${ex * SCALE}" y="${yb + ey * SCALE}" width="${2 * SCALE}" height="${SCALE}" fill="${pal.lid}"/>`).join("");
    cat.push(`<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.96;1" calcMode="discrete" dur="4s" repeatCount="indefinite"/>${openR}</g>`);
    cat.push(`<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;1" calcMode="discrete" dur="4s" repeatCount="indefinite"/>${lidR}</g>`);
    if (state === "content") {
        for (const [beg, ox] of [["0.6s", 8 * SCALE], ["2.1s", 11 * SCALE]] as Array<[string, number]>) {
            const cells = rects(sprites.HEART, { h: pal.heart }, ox, TOP - 14 * SCALE - 16, 2).join("");
            cat.push(`<g opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;4 -12" dur="2.4s" begin="${beg}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="2.4s" begin="${beg}" repeatCount="indefinite"/>${cells}</g>`);
        }
    }
    cat.push("</g></g>");
    return cat;
}

export function buildGraphSvg(state: string, caption: string, calendar: Calendar | null, palette = "dark", attribution = true): string {
    const pal = { ...PALETTES[palette] };
    if (state === "overheat") pal.body = "#ff7b72";
    const colors = { X: pal.body, p: pal.pink };
    const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="contribution graph cat: ${esc(state)}">`,
        `<title>contribution graph cat - ${esc(state)}</title>`,
        `<rect width="${WIDTH}" height="${HEIGHT}" fill="${pal.bg}"/>`,
    ];
    const weeks = 53;
    let total: number | null = null;
    if (calendar) {
        calendar.days.forEach((d, i) => {
            const col = Math.floor(i / 7), row = i % 7;
            parts.push(`<rect x="${LEFT + col * STRIDE}" y="${TOP + row * STRIDE}" width="${CELL}" height="${CELL}" rx="2" fill="${pal.cells[level(d.count)]}"><title>${d.date}: ${d.count} contributions</title></rect>`);
        });
        total = calendar.total;
    } else {
        for (let col = 0; col < weeks; col++) {
            for (let row = 0; row < 7; row++) {
                parts.push(`<rect x="${LEFT + col * STRIDE}" y="${TOP + row * STRIDE}" width="${CELL}" height="${CELL}" rx="2" fill="${pal.cells[0]}"/>`);
            }
        }
    }
    parts.push(...kitty(state, pal, colors, LEFT, LEFT + weeks * STRIDE - 16 * SCALE - 6));
    let label = `state: ${state} - ${caption}`;
    label += total !== null ? ` · ${total} contributions this year` : " · graph data unavailable";
    label += " · regenerated every 6h";
    if (attribution) label += " · github-pet by prsdx";
    parts.push(`<text x="16" y="${HEIGHT - 10}" font-family="monospace" font-size="12" fill="${pal.text}">${esc(label)}</text>`);
    parts.push("</svg>");
    return parts.join("\n");
}