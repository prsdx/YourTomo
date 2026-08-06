// github-pet generator: builds dist/*.svg from live GitHub data.
// Zero-dependency TypeScript - runs on Bun (CI) or Node 24+ (type stripping).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchEvents, fetchRepos, fetchLanguages, fetchCiStatus, fetchProfile } from "./src/githubApi.ts";
import { fetchCalendar, fetchActivity } from "./src/graphApi.ts";
import { decide, greetingFor, ownerHour, currentStreak, isBirthday, lastPushedRepo } from "./src/state.ts";
import { buildSvg, PALETTES } from "./src/render.ts";
import { buildGraphSvg } from "./src/graphRender.ts";
import { buildIsoSvg } from "./src/isoRender.ts";
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
    const catName = process.env.PET_CAT_NAME || "";
    const now = new Date();
    const status = decide(events, {
        lastPush: activity?.lastPush ?? null,
        merged24h: activity?.merged24h ?? 0,
    }, ci, now, catName);
    // v1.1 scene signals - all derived from real data
    const scene = {
        hackingOn: lastPushedRepo(events) ?? "",
        streakDays: currentStreak(calendar?.days ?? null),
        birthday: isBirthday(profile?.createdAt, now),
        hour: ownerHour(now),
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
    };
    for (const [name, svg] of Object.entries(outputs)) {
        writeFileSync(join(OUT_DIR, name), svg, "utf-8");
        console.log(`wrote ${OUT_DIR}/${name} (${svg.length} bytes)`);
    }
    console.log(`state=${status.state} | caption='${status.caption}' | apiOk=${status.apiOk} | ci_failed=${ci.failed}`);
    console.log(`calendar=${calendar ? calendar.total + " contributions" : "unavailable"} | lastPush=${activity?.lastPush ?? "?"} | events=${events.length} repos=${repos.length} langs=${Object.keys(langs).length}`);
}

main();