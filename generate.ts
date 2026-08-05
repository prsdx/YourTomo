// github-pet generator: builds dist/*.svg from live GitHub data.
// Zero-dependency TypeScript - runs on Bun (CI) or Node 24+ (type stripping).

import { mkdirSync, writeFileSync } from "node:fs";
import { fetchEvents, fetchRepos, fetchLanguages } from "./src/githubApi.ts";
import { fetchCalendar, fetchActivity } from "./src/graphApi.ts";
import { decide } from "./src/state.ts";
import { buildSvg, PALETTES } from "./src/render.ts";
import { buildGraphSvg } from "./src/graphRender.ts";
import { langsChart } from "./src/charts.ts";

const USER = process.env.PET_USER || "prsdx";

async function main(): Promise<void> {
    const token = process.env.GITHUB_TOKEN || process.env.PET_GITHUB_TOKEN;
    const [events, repos] = await Promise.all([fetchEvents(USER), fetchRepos(USER)]);
    const langs = await fetchLanguages(USER, repos);
    const [calendar, activity] = await Promise.all([fetchCalendar(token, USER), fetchActivity(token, USER)]);
    const status = decide(events, {
        lastPush: activity?.lastPush ?? null,
        merged24h: activity?.merged24h ?? 0,
    });

    mkdirSync("dist", { recursive: true });
    const outputs: Record<string, string> = {
        "pet.svg": buildSvg(status.state, status.caption, "dark"),
        "pet-light.svg": buildSvg(status.state, status.caption, "light"),
        "graph.svg": buildGraphSvg(status.state, status.caption, calendar, "dark"),
        "graph-light.svg": buildGraphSvg(status.state, status.caption, calendar, "light"),
        "langs.svg": langsChart(langs, repos.length, PALETTES.dark),
        "langs-light.svg": langsChart(langs, repos.length, PALETTES.light),
    };
    for (const [name, svg] of Object.entries(outputs)) {
        writeFileSync(`dist/${name}`, svg, "utf-8");
        console.log(`wrote dist/${name} (${svg.length} bytes)`);
    }
    console.log(`state=${status.state} | caption='${status.caption}' | apiOk=${status.apiOk}`);
    console.log(`calendar=${calendar ? calendar.total + " contributions" : "unavailable"} | lastPush=${activity?.lastPush ?? "?"} | events=${events.length} repos=${repos.length} langs=${Object.keys(langs).length}`);
}

main();