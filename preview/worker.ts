// YourTomo live preview - Cloudflare Worker.
//
// Renders the same banner SVG the Action produces, live for any username,
// without installing anything. Read-only and ephemeral: public GitHub API
// calls only, never a write-scoped token, no repo commits, no state.json
// memory - render and return.
//
// The state machine and renderer are NOT reimplemented here: this imports
// the Action's own modules from ../src/ (framework-agnostic pure functions).

import { fetchEvents, fetchRepos, fetchLanguages, fetchProfile, probeUsername, checkRateLimit } from "../src/githubApi.ts";
import { fetchCalendar, fetchActivity } from "../src/graphApi.ts";
import {
    decide, applyForceState, greetingFor, ownerHour, currentStreak,
    isBirthday, lastPushedRepo, isWeekend, season, weeklyDigest,
} from "../src/state.ts";
import { buildSvg, PALETTES, type SceneOpts } from "../src/render.ts";
import { buildGraphSvg } from "../src/graphRender.ts";
import { buildIsoSvg } from "../src/isoRender.ts";
import { langsChart, type LangsNote } from "../src/charts.ts";
import { LANDING_HTML } from "./landing.ts";

const CACHE_TTL_S = 300;
type SvgType = "pet" | "isocat" | "graph" | "langs";

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
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": "DENY",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                },
            });
        }
        // Live rate-limit diagnostics: lets the landing page show the real
        // GitHub quota under the search bar. Read-only, cheap, 30s edge cache.
        if (url.pathname === "/status") {
            if (env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN) process.env.GITHUB_TOKEN = env.GITHUB_TOKEN;
            const quota = await checkRateLimit();
            return new Response(JSON.stringify(quota ?? { remaining: null, limit: null, resetAt: null }), {
                headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
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
        const svgType: SvgType = ((["pet", "isocat", "graph", "langs"] as string[]).includes(url.searchParams.get("type") ?? "")
            ? url.searchParams.get("type")!
            : "pet") as SvgType;

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
            svg = await renderPreview(username, force, theme, svgType, env.GITHUB_TOKEN);
        } catch (err) {
            console.error(`preview render error for ${username}`);
            return new Response("render failed\n", { status: 500 });
        }

        const resp = new Response(svg, {
            headers: {
                "Content-Type": "image/svg+xml; charset=utf-8",
                "Cache-Control": `public, max-age=${CACHE_TTL_S}`,
                "X-Content-Type-Options": "nosniff",
            },
        });
        if (cache) ctx.waitUntil(cache.put(request, resp.clone()));
        return resp;
    },
};

// Same fetch + decide + render pipeline as generate.ts, in-memory only.
// Routes to the correct SVG builder based on svgType. Deliberate differences
// from the Action: no state.json delta memory (star/follower milestones
// stay off), no CI/issue watchers (those need the owner's watched-repos
// config), and the langs chart does extra API calls here (25 repo-fetches)
// so it really benefits from the 5-minute edge cache + an optional token.
async function renderPreview(username: string, force: string, theme: "dark" | "light", svgType: SvgType, workerToken?: string): Promise<string> {
    const token = workerToken || process.env.GITHUB_TOKEN || process.env.PET_GITHUB_TOKEN;
    let calendarDiag = "";
    const now = new Date();
    const [events, profile] = await Promise.all([fetchEvents(username), fetchProfile(username)]);

    // Unhappy path only: the normal fetchers silently swallow every failure, so
    // if they came back empty we probe once more to tell the user *why* instead
    // of showing a silent generic/empty state. Never runs on a normal render.
    let diagOverride: string | null = null;
    if (events.length === 0 && !profile) {
        const [exists, quota] = await Promise.all([probeUsername(username), checkRateLimit()]);
        if (exists === "not_found") {
            diagOverride = `"${username}" isn't a GitHub username`;
        } else if (quota && quota.remaining <= 1) {
            const mins = Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 60000));
            diagOverride = `GitHub API limit reached - resets in ~${mins}m`;
        } else {
            diagOverride = "GitHub API is temporarily unreachable - try again shortly";
        }
    }

    let calendar = null, activity = null;
    if (svgType !== "langs") {
        [calendar, activity] = await Promise.all([fetchCalendar(token, username), fetchActivity(token, username)]);
        if (!token) {
            calendarDiag = "no GITHUB_TOKEN configured on worker";
        } else if (!calendar) {
            calendarDiag = "GraphQL failed (check token has read:user or Metadata read scope)";
        }
    }

    let status = decide(events, {
        lastPush: activity?.lastPush ?? null,
        merged24h: activity?.merged24h ?? 0,
    }, {}, now);
    status = applyForceState(status, force);
    if (diagOverride && !force) status = { ...status, caption: diagOverride };

    switch (svgType) {
        case "isocat": {
            let svg = buildIsoSvg(status.state, status.caption, calendar, theme, true);
            if (calendarDiag) svg = svg.replace("</svg>", `<!-- ${calendarDiag} --></svg>`);
            return svg;
        }
        case "graph": {
            let svg = buildGraphSvg(status.state, status.caption, calendar, theme, true);
            if (calendarDiag) svg = svg.replace("</svg>", `<!-- ${calendarDiag} --></svg>`);
            return svg;
        }
        case "langs": {
            const repos = await fetchRepos(username);
            const langs = await fetchLanguages(username, repos);
            let note: LangsNote | undefined;
            if (Object.keys(langs).length === 0) {
                // Unhappy path only: figure out *why* so the badge is honest.
                // If the quota is genuinely gone, say so; otherwise attribute it
                // to a transient GitHub failure rather than guessing "api limit".
                const quota = await checkRateLimit();
                note = quota && quota.remaining <= 1 ? "limit" : "unavailable";
            }
            return langsChart(langs, repos.length, theme === "light" ? PALETTES.light : PALETTES.dark, note);
        }
        default: { // pet
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
    }
}
