// github-pet generator: builds dist/*.svg from live GitHub data.
// Zero-dependency TypeScript - runs on Bun (CI) or Node 24+ (type stripping).

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fetchEvents, fetchRepos, fetchLanguages, fetchCiStatus, fetchProfile, fetchOpenIssues } from "./src/githubApi.ts";
import { fetchCalendar, fetchActivity } from "./src/graphApi.ts";
import { decide, greetingFor, ownerHour, currentStreak, isBirthday, lastPushedRepo, milestone, isWeekend, season, weeklyDigest } from "./src/state.ts";
import { buildSvg, PALETTES } from "./src/render.ts";
import { buildGraphSvg } from "./src/graphRender.ts";
import { buildIsoSvg } from "./src/isoRender.ts";
import { buildBadgeSvg } from "./src/badgeRender.ts";
import { langsChart } from "./src/charts.ts";

const USER = process.env.PET_USER || "prsdx";
const OUT_DIR = process.env.PET_OUTPUT_DIR || "dist";
const CONTACT = process.env.PET_CONTACT || "";
const ATTRIBUTION = !["0", "false", "no"].includes((process.env.PET_ATTRIBUTION ?? "").toLowerCase());

async function main(): Promise<void> {
    const token = process.env.GITHUB_TOKEN || process.env.PET_GITHUB_TOKEN;
    const [events, repos, profile] = await Promise.all([fetchEvents(USER), fetchRepos(USER), fetchProfile(USER)]);
    const langs = await fetchLanguages(USER, repos);
    const [calendar, activity] = await Promise.all([fetchCalendar(token, USER), fetchActivity(token, USER)]);
    const ci = await fetchCiStatus(USER);
    const openIssues = await fetchOpenIssues(USER);
    const catName = process.env.PET_CAT_NAME || "";
    const now = new Date();
    const status = decide(events, {
        lastPush: activity?.lastPush ?? null,
        merged24h: activity?.merged24h ?? 0,
    }, ci, now, catName, {
        openIssues,
        hibernateUntil: process.env.PET_HIBERNATE_UNTIL || "",
    });

    // state.json delta memory: enables milestone reactions (stars/followers).
    // read the previous run's snapshot (committed by the workflow), compare, rewrite.
    const statePath = join(OUT_DIR, "state.json");
    let prev: { stars?: number; followers?: number } = {};
    try {
        if (existsSync(statePath)) prev = JSON.parse(readFileSync(statePath, "utf-8"));
    } catch { /* corrupt state file is not worth dying over */ }
    const stars = repos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0);
    const followers = profile?.followers ?? 0;
    const starMilestone = milestone(prev.stars, stars);
    const followerMilestone = milestone(prev.followers, followers);

    const streak = currentStreak(calendar?.days ?? null);
    const week = weeklyDigest(events, now);
    const labelExtra: string[] = [];
    if (week.pushes || week.merged) labelExtra.push(`${week.pushes} pushes · ${week.merged} prs this week`);
    if (calendar) labelExtra.push(`${calendar.total} contributions this year`);
    if (starMilestone) labelExtra.push(`just hit ${starMilestone} stars!!`);
    if (followerMilestone) labelExtra.push(`just hit ${followerMilestone} followers!!`);

    // scene signals - all derived from real data
    const scene = {
        hackingOn: lastPushedRepo(events) ?? "",
        streakDays: streak,
        birthday: isBirthday(profile?.createdAt, now),
        hour: ownerHour(now),
        accent: process.env.PET_ACCENT || "",
        weekend: isWeekend(now),
        topLang: Object.entries(langs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
        seasonal: season(now),
        touchGrass: streak >= 21,
        confetti: starMilestone !== null || followerMilestone !== null,
        labelExtra,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    const name = process.env.PET_NAME || profile?.name?.split(" ")[0]?.toLowerCase() || "";
    const greeting = greetingFor(now, name);
    const outputs: Record<string, string> = {
        "pet.svg": buildSvg(status.state, status.caption, "dark", greeting, CONTACT, ATTRIBUTION, scene),
        "pet-light.svg": buildSvg(status.state, status.caption, "light", greeting, CONTACT, ATTRIBUTION, scene),
        "graph.svg": buildGraphSvg(status.state, status.caption, calendar, "dark", ATTRIBUTION),
        "graph-light.svg": buildGraphSvg(status.state, status.caption, calendar, "light", ATTRIBUTION),
        "isocat.svg": buildIsoSvg(status.state, status.caption, calendar, "dark", ATTRIBUTION),
        "isocat-light.svg": buildIsoSvg(status.state, status.caption, calendar, "light", ATTRIBUTION),
        "langs.svg": langsChart(langs, repos.length, PALETTES.dark),
        "langs-light.svg": langsChart(langs, repos.length, PALETTES.light),
        "pet-badge.svg": buildBadgeSvg(status.state, status.caption),
    };
    for (const [name, svg] of Object.entries(outputs)) {
        writeFileSync(join(OUT_DIR, name), svg, "utf-8");
        console.log(`wrote ${OUT_DIR}/${name} (${svg.length} bytes)`);
    }
    writeFileSync(statePath, JSON.stringify({ stars, followers, updatedAt: now.toISOString() }, null, 2) + "\n", "utf-8");
    console.log(`wrote ${statePath} (stars=${stars} followers=${followers})`);
    console.log(`state=${status.state} | caption='${status.caption}' | apiOk=${status.apiOk} | ci_failed=${ci.failed} | openIssues=${openIssues} | streak=${streak}`);
    console.log(`calendar=${calendar ? calendar.total + " contributions" : "unavailable"} | lastPush=${activity?.lastPush ?? "?"} | events=${events.length} repos=${repos.length} langs=${Object.keys(langs).length}`);
}

main();