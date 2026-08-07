// YourTomo live preview - Cloudflare Worker.
//
// Renders the same banner SVG the Action produces, live for any username,
// without installing anything. Read-only and ephemeral: public GitHub API
// calls only, never a write-scoped token, no repo commits, no state.json
// memory - render and return.
//
// The state machine and renderer are NOT reimplemented here: this imports
// the Action's own modules from ../src/ (framework-agnostic pure functions).

import { fetchEvents, fetchProfile } from "../src/githubApi.ts";
import { fetchCalendar, fetchActivity } from "../src/graphApi.ts";
import {
    decide, applyForceState, greetingFor, ownerHour, currentStreak,
    isBirthday, lastPushedRepo, isWeekend, season, weeklyDigest,
} from "../src/state.ts";
import { buildSvg, type SceneOpts } from "../src/render.ts";
import { LANDING_HTML } from "./landing.ts";

const CACHE_TTL_S = 300; // edge cache + Cache-Control, protects the GitHub API

interface Env {
    GITHUB_TOKEN?: string; // optional read-only secret, raises API rate limits
}

interface Ctx {
    waitUntil(p: Promise<unknown>): void;
}

export default {
    async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/" || url.pathname === "/index.html") {
            return new Response(LANDING_HTML, {
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "public, max-age=3600",
                },
            });
        }
        if (url.pathname !== "/preview") return new Response("not found\n", { status: 404 });

        const username = (url.searchParams.get("username") ?? "").trim();
        if (!username) {
            return new Response("missing required query param: ?username=<github-username>\n", { status: 400 });
        }
        // GitHub logins: alphanumerics + inner hyphens, max 39 chars
        if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(username)) {
            return new Response("invalid github username\n", { status: 400 });
        }
        const theme = url.searchParams.get("theme") === "light" ? "light" : "dark";
        const force = (url.searchParams.get("state") ?? "").trim();

        // Edge cache keyed on the full URL (username+state+theme): repeat hits
        // never reach the GitHub API. Add a per-IP rate-limiting rule in the
        // Cloudflare dashboard on top of this for abuse (see README.md).
        const cache = typeof caches !== "undefined" ? (caches as any).default : null;
        const hit = cache ? await cache.match(request) : null;
        if (hit) return hit;

        // Bridge the optional secret binding into process.env so the shared
        // modules (which read GITHUB_TOKEN themselves) authenticate as well.
        if (env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN) process.env.GITHUB_TOKEN = env.GITHUB_TOKEN;

        let svg: string;
        try {
            svg = await renderPreview(username, force, theme);
        } catch (err) {
            return new Response(`render failed: ${String(err)}\n`, { status: 500 });
        }

        const resp = new Response(svg, {
            headers: {
                "Content-Type": "image/svg+xml; charset=utf-8",
                "Cache-Control": `public, max-age=${CACHE_TTL_S}`,
            },
        });
        if (cache) ctx.waitUntil(cache.put(request, resp.clone()));
        return resp;
    },
};

// Same fetch + decide + buildSvg pipeline as generate.ts, in-memory only.
// Deliberate differences: no state.json delta memory (ephemeral -> star/follower
// milestone confetti stays off), no CI/issue watchers (those need the user's
// own watched-repos config), and no per-repo language fetch (25 extra API
// calls for one dream-bubble detail is a bad trade on a public endpoint).
async function renderPreview(username: string, force: string, theme: "dark" | "light"): Promise<string> {
    const token = process.env.GITHUB_TOKEN || process.env.PET_GITHUB_TOKEN;
    const [events, profile] = await Promise.all([fetchEvents(username), fetchProfile(username)]);
    const [calendar, activity] = await Promise.all([fetchCalendar(token, username), fetchActivity(token, username)]);
    const now = new Date();

    let status = decide(events, {
        lastPush: activity?.lastPush ?? null,
        merged24h: activity?.merged24h ?? 0,
    }, {}, now);
    status = applyForceState(status, force); // ?state= mirrors the PET_FORCE_STATE input

    const streak = currentStreak(calendar?.days ?? null);
    const week = weeklyDigest(events, now);
    const labelExtra: string[] = [];
    if (week.pushes || week.merged) labelExtra.push(`${week.pushes} pushes · ${week.merged} prs this week`);
    if (calendar) labelExtra.push(`${calendar.total} contributions this year`);

    const scene: SceneOpts = {
        hackingOn: lastPushedRepo(events) ?? "",
        streakDays: streak,
        birthday: isBirthday(profile?.createdAt, now),
        hour: ownerHour(now),
        weekend: isWeekend(now),
        seasonal: season(now),
        touchGrass: streak >= 21,
        confetti: false,
        labelExtra,
    };
    const name = profile?.name?.split(" ")[0]?.toLowerCase() || "";
    return buildSvg(status.state, status.caption, theme, greetingFor(now, name), "", true, scene);
}
