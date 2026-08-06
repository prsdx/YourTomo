// Renders the banner scene: the cat lives a little life on a master timeline -
// scoots to its bowl, eats (head bobs), scoots to the yarn, bats it (paw +
// yarn rolls), then scoots home. State overrides:
//   hungry  -> camps at the empty bowl all day
//   grumpy  -> sulks in the cardboard box with angry brows
//   zoomies -> the whole routine at 2x with motion lines
//   sleeping-> curled up with Zzz (handled separately)
// Zero dependencies, pure SMIL. TypeScript port of render.py.
// (Also fixes a latent bug: the yarn ball was drawn at y=0 instead of ground level.)

import * as sprites from "./sprites.ts";

const PX = 6;
const WIDTH = 894, HEIGHT = 190;
const GROUND_Y = 158;
const CAT_Y = GROUND_Y - 16 * PX;
const HOME_X = 70, YARN_X = 430, BOWL_X = 640;
const CAT_AT_BOWL = 500, CAT_AT_YARN = 320;
const INTRO_S = 7;

type Pal = Record<string, string>;

export const PALETTES: Record<string, Pal> = {
    dark: { bg: "#0d1117", body: "#e6edf3", accent: "#58a6ff", pink: "#ff9bce", ground: "#30363d", text: "#8b949e", heart: "#ff7b72", lid: "#0d1117", yarn: "#d2a8ff", collar: "#58a6ff", tag: "#39d353" },
    light: { bg: "#ffffff", body: "#1f2328", accent: "#0969da", pink: "#e8590c", ground: "#d0d7de", text: "#57606a", heart: "#cf222e", lid: "#ffffff", yarn: "#8250df", collar: "#0969da", tag: "#1a7f37" },
};

const STATE_TEMPO: Record<string, number> = { zoomies: 14, content: 32, overheat: 20 };

let PAL_CURRENT: Pal = PALETTES.dark;

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function rects(grid: string[], colors: Record<string, string>, x0: number, y0: number, scale = PX): string[] {
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

function pixels(coords: Array<[number, number]>, color: string, x0: number, y0: number, scale = PX): string[] {
    return coords.map(([cx, cy]) => `<rect x="${x0 + cx * scale}" y="${y0 + cy * scale}" width="${scale}" height="${scale}" fill="${color}"/>`);
}

function blink(pal: Pal, y0: number): string[] {
    const openR = pixels(sprites.SIT_EYES, pal.accent, 0, y0).join("");
    const lidR = pixels(sprites.SIT_EYES, pal.lid, 0, y0).join("");
    return [
        `<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.96;1" calcMode="discrete" dur="4.2s" repeatCount="indefinite"/>${openR}</g>`,
        `<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;1" calcMode="discrete" dur="4.2s" repeatCount="indefinite"/>${lidR}</g>`,
    ];
}

function tailWag(pal: Pal, y0: number, dur = "1.4s"): string[] {
    const a = pixels(sprites.TAIL_A, pal.body, 0, y0).join("");
    const b = pixels(sprites.TAIL_B, pal.body, 0, y0).join("");
    return [
        `<g><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" calcMode="discrete" dur="${dur}" repeatCount="indefinite"/>${a}</g>`,
        `<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" calcMode="discrete" dur="${dur}" repeatCount="indefinite"/>${b}</g>`,
    ];
}

function headGroup(state: string, pal: Pal, colors: Record<string, string>, y0: number, masterDur: number, eatWindow?: [number, number], begin = 0): string[] {
    const [h0, h1] = sprites.SIT_HEAD_ROWS;
    const head: string[] = [];
    if (eatWindow) {
        const [w0, w1] = eatWindow;
        const step = (w1 - w0) / 6.0;
        const times = [0.0, w0, w0 + step, w0 + 2 * step, w0 + 3 * step, w0 + 4 * step, w0 + 5 * step, w1, 1.0].map((t) => Math.min(Math.max(t, 0), 1));
        const vals = ["0 0", "0 0", "0 8", "0 0", "0 8", "0 0", "0 8", "0 0", "0 0"];
        const kt = times.map((t) => t.toFixed(3)).join(";");
        head.push(`<g><animateTransform attributeName="transform" type="translate" values="${vals.join(";")}" keyTimes="${kt}" dur="${masterDur}s" begin="${begin}s" repeatCount="indefinite"/>`);
    } else {
        head.push("<g>");
    }
    head.push(...rects(sprites.SIT_FRONT.slice(h0, h1 + 1), colors, 0, y0));
    head.push(...pixels(sprites.SIT_INNER_EARS, PAL_CURRENT.pink, 0, y0));
    head.push(...pixels(sprites.SIT_WHISKERS, pal.body, 0, y0));
    head.push(...blink(pal, y0));
    if (state === "grumpy") head.push(...pixels(sprites.SIT_BROWS, pal.accent, 0, y0));
    head.push("</g>");
    return head;
}

function bodyGroup(pal: Pal, colors: Record<string, string>, y0: number, masterDur: number, batWindow?: [number, number], wag = "1.4s", begin = 0): string[] {
    const [b0, b1] = sprites.SIT_BODY_ROWS;
    const body = rects(sprites.SIT_FRONT.slice(b0, b1 + 1), colors, 0, y0 + b0 * PX);
    body.push(...pixels(sprites.SIT_COLLAR_BAND, PAL_CURRENT.collar, 0, y0));
    body.push(...pixels(sprites.SIT_COLLAR_TAG, PAL_CURRENT.tag, 0, y0));
    body.push(...tailWag(pal, y0, wag));
    if (batWindow) {
        const [w0, w1] = batWindow;
        const mid = (w0 + w1) / 2.0;
        const tucked = pixels(sprites.PAW_TUCKED, pal.body, 0, y0).join("");
        const out = pixels(sprites.PAW_EXTENDED, pal.body, 0, y0).join("");
        const kt = `0;${w0.toFixed(3)};${mid.toFixed(3)};${w1.toFixed(3)};1`;
        body.push(`<g><animate attributeName="opacity" values="1;1;0;0;1" keyTimes="${kt}" calcMode="discrete" dur="${masterDur}s" begin="${begin}s" repeatCount="indefinite"/>${tucked}</g>`);
        body.push(`<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="${kt}" calcMode="discrete" dur="${masterDur}s" begin="${begin}s" repeatCount="indefinite"/>${out}</g>`);
    }
    return body;
}

function hearts(pal: Pal): string[] {
    const out: string[] = [];
    for (const [bx, by, beg] of [[14, -2, "0.4s"], [17, -4, "1.9s"]] as Array<[number, number, string]>) {
        const cells = rects(sprites.HEART, { h: pal.heart }, bx * PX, by * PX, 3).join("");
        out.push(`<g opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;6 -22" dur="2.6s" begin="${beg}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="2.6s" begin="${beg}" repeatCount="indefinite"/>${cells}</g>`);
    }
    return out;
}

function yarnProp(pal: Pal, masterDur: number, batWindow?: [number, number], begin = 0): string[] {
    const y0 = GROUND_Y - 6 * PX;
    const cells = rects(sprites.YARN, { h: pal.yarn }, 0, y0);
    if (batWindow) {
        const [w0, w1] = batWindow;
        const kt = `0;${w0.toFixed(3)};${(w0 + 0.03).toFixed(3)};${w1.toFixed(3)};${Math.min(w1 + 0.08, 0.99).toFixed(3)};1`;
        const vals = "0 0;0 0;52 -10;52 0;52 0;0 0";
        return [`<g><animateTransform attributeName="transform" type="translate" values="${vals}" keyTimes="${kt}" dur="${masterDur}s" begin="${begin}s" repeatCount="indefinite"/>${cells.join("")}</g>`];
    }
    return cells;
}

function props(pal: Pal, colors: Record<string, string>, state: string, masterDur?: number, batWindow?: [number, number], begin = 0): string[] {
    const parts: string[] = [];
    parts.push(`<rect x="${HOME_X - 16}" y="${GROUND_Y - 40}" width="80" height="40" fill="none" stroke="${pal.ground}" stroke-width="2"/>`);
    parts.push(`<line x1="${HOME_X - 16}" y1="${GROUND_Y - 40}" x2="${HOME_X + 24}" y2="${GROUND_Y - 52}" stroke="${pal.ground}" stroke-width="2"/>`);
    if (masterDur && batWindow) {
        parts.push(`<g transform="translate(${YARN_X},0)">` + yarnProp(pal, masterDur, batWindow, begin).join("") + "</g>");
    } else {
        parts.push(`<g transform="translate(${YARN_X},0)">` + yarnProp(pal, 1, undefined).join("") + "</g>");
    }
    const bowlColor = state === "hungry" ? pal.ground : pal.body;
    parts.push(...rects(sprites.BOWL, { X: bowlColor }, BOWL_X, GROUND_Y - 5 * PX));
    if (state !== "hungry") {
        parts.push(`<rect x="${BOWL_X + 4 * PX}" y="${GROUND_Y - 5 * PX}" width="${PX}" height="${PX}" fill="${pal.pink}"/>`);
        parts.push(`<rect x="${BOWL_X + 6 * PX}" y="${GROUND_Y - 5 * PX}" width="${PX}" height="${PX}" fill="${pal.pink}"/>`);
    }
    return parts;
}

function zzz(pal: Pal): string[] {
    const out: string[] = [];
    for (const [dx, size, beg] of [[0, 12, "0s"], [14, 15, "1s"], [30, 18, "2s"]] as Array<[number, number, string]>) {
        out.push(`<text x="${170 + dx}" y="80" font-family="monospace" font-size="${size}" fill="${pal.accent}" opacity="0">z<animateTransform attributeName="transform" type="translate" values="0 0;8 -26" dur="3s" begin="${beg}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.25;0.75;1" dur="3s" begin="${beg}" repeatCount="indefinite"/></text>`);
    }
    return out;
}

function sleepingCat(pal: Pal, colors: Record<string, string>): string[] {
    const y0 = GROUND_Y - 14 * PX;
    const parts = rects(sprites.CURL_BODY, colors, 90, y0);
    for (const [ex, ey] of sprites.CURL_LIDS) {
        parts.push(`<rect x="${90 + ex * PX}" y="${y0 + ey * PX}" width="${PX}" height="${PX}" fill="${pal.lid}"/>`);
    }
    parts.push(...zzz(pal));
    return parts;
}

function welcome(pal: Pal): string[] {
    const dur = INTRO_S;
    const fade = "0;0;1;1;0;0";
    const kt = "0;0.07;0.14;0.85;0.96;1";
    const out: string[] = [
        `<g opacity="0"><animate attributeName="opacity" values="${fade}" keyTimes="${kt}" dur="${dur}s" repeatCount="1" fill="freeze"/>`,
    ];
    out.push(`<rect x="60" y="12" width="320" height="46" rx="10" fill="${pal.ground}"/>`);
    out.push(`<polygon points="110,58 130,58 118,74" fill="${pal.ground}"/>`);
    out.push(`<text x="76" y="31" font-family="monospace" font-size="13" fill="${pal.body}">hey! welcome to Shubham's corner</text>`);
    out.push(`<text x="76" y="48" font-family="monospace" font-size="12" fill="${pal.text}">scroll down for projects + contact</text>`);
    out.push(`<polygon points="210,66 226,66 218,78" fill="${pal.accent}"><animateTransform attributeName="transform" type="translate" values="0 0;0 6;0 0" dur="0.8s" repeatCount="indefinite"/></polygon>`);
    out.push("</g>");
    return out;
}

function routineCat(state: string, pal: Pal, colors: Record<string, string>): string[] {
    const dur = STATE_TEMPO[state] ?? 32;
    if (state === "hungry") {
        const cat = [`<g transform="translate(${CAT_AT_BOWL},0)">`];
        cat.push(...bodyGroup(pal, colors, CAT_Y, dur));
        cat.push(...headGroup(state, pal, colors, CAT_Y, 6.0, [0.1, 0.9]));
        cat.push("</g>");
        return cat;
    }
    if (state === "grumpy") {
        const cat = [`<g transform="translate(${HOME_X - 6},14)">`];
        cat.push(...bodyGroup(pal, colors, CAT_Y, dur, undefined, "3.2s"));
        cat.push(...headGroup(state, pal, colors, CAT_Y, dur));
        cat.push("</g>");
        return cat;
    }
    const kt = "0;0.12;0.35;0.45;0.62;0.82;1";
    const xs = [HOME_X, CAT_AT_BOWL, CAT_AT_BOWL, CAT_AT_YARN, CAT_AT_YARN, HOME_X, HOME_X];
    const vals = xs.map((x) => `${x} 0`).join(";");
    const cat = [`<g transform="translate(${HOME_X},0)"><animateTransform attributeName="transform" type="translate" values="${vals}" keyTimes="${kt}" dur="${dur}s" begin="${INTRO_S}s" repeatCount="indefinite"/>`];
    cat.push(`<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.7s" repeatCount="indefinite"/>`);
    cat.push(...bodyGroup(pal, colors, CAT_Y, dur, [0.66, 0.78], "1.4s", INTRO_S));
    cat.push(...headGroup(state, pal, colors, CAT_Y, dur, [0.15, 0.33], INTRO_S));
    if (state === "content") cat.push(...hearts(pal));
    if (state === "zoomies") {
        [[-46, 30], [-64, 55], [-40, 80]].forEach(([ox, oy], i) => {
            cat.push(`<rect x="${ox}" y="${CAT_Y + oy}" width="${6 * PX}" height="3" fill="${pal.body}" opacity="0.6"><animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.5s" begin="${i * 0.15}s" repeatCount="indefinite"/></rect>`);
        });
    }
    if (state === "overheat") {
        // steam puffs rising off the overheating cat (rides inside the moving group)
        ([[40, "0s"], [56, "0.5s"], [72, "1s"]] as Array<[number, string]>).forEach(([sx, beg]) => {
            cat.push(`<rect x="${sx}" y="${CAT_Y - 10}" width="6" height="6" rx="3" fill="${pal.ground}" opacity="0"><animate attributeName="y" values="${CAT_Y - 10};${CAT_Y - 44}" dur="1.6s" begin="${beg}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.3;1" dur="1.6s" begin="${beg}" repeatCount="indefinite"/></rect>`);
        });
    }
    cat.push("</g></g>");
    return cat;
}

export function buildSvg(state: string, caption: string, palette = "dark", bodyOverride?: string): string {
    const pal: Pal = { ...PALETTES[palette] };
    PAL_CURRENT = pal;
    if (bodyOverride) pal.body = bodyOverride;
    if (state === "overheat") pal.body = "#ff7b72";
    const colors = { X: pal.body, p: pal.pink };
    const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="github pet: ${esc(state)}">`,
        `<title>github pet - ${esc(state)}</title>`,
        `<rect width="${WIDTH}" height="${HEIGHT}" fill="${pal.bg}"/>`,
        `<line x1="0" y1="${GROUND_Y}" x2="${WIDTH}" y2="${GROUND_Y}" stroke="${pal.ground}" stroke-width="2" stroke-dasharray="8 8"/>`,
    ];
    if (state === "sleeping") {
        parts.push(...sleepingCat(pal, colors));
    } else {
        const dur = STATE_TEMPO[state] ?? 32;
        const intro = state === "content" || state === "zoomies";
        parts.push(...props(pal, colors, state, dur, [0.66, 0.78], intro ? INTRO_S : 0));
        parts.push(...routineCat(state, pal, colors));
        if (intro) parts.push(...welcome(pal));
    }
    const label = `state: ${state} - ${caption} · regenerated every 6h`;
    parts.push(`<text x="16" y="${HEIGHT - 10}" font-family="monospace" font-size="12" fill="${pal.text}">${esc(label)}</text>`);
    parts.push("</svg>");
    return parts.join("\n");
}