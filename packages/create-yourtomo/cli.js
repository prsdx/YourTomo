#!/usr/bin/env node
/**
 * create-yourtomo — setup wizard for YourTomo.
 *
 * Removes the YAML-editing step of installing the Action: asks for a GitHub
 * username and an IANA timezone (computing timezone-offset-minutes so nobody
 * does UTC-offset math), plus optional cat name / accent color / hibernation
 * date, then writes .github/workflows/pet.yml and prints the README embed
 * snippet. It never commits or pushes — the user reviews the files first.
 *
 * Zero dependencies (node:readline/promises only), Node 18+.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const ACTION = "prsdx/github-pet@v1";
const PREVIEW = "https://prsdx.yourtomo.workers.dev";
const WORKFLOW_PATH = join(".github", "workflows", "pet.yml");

const GITHUB_LOGIN = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;

function tryExec(cmd, args) {
    try {
        return execFileSync(cmd, args, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null;
    } catch {
        return null;
    }
}

// default username: the gh CLI knows the real login; git's user.name is a
// display name, so only offer it when it is a plausible login
function detectUsername() {
    const gh = tryExec("gh", ["api", "user", "--jq", ".login"]);
    if (gh && GITHUB_LOGIN.test(gh)) return gh;
    const git = tryExec("git", ["config", "user.name"]);
    if (git && GITHUB_LOGIN.test(git)) return git;
    return null;
}

function detectTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
        return null;
    }
}

function isValidTimezone(tz) {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

// UTC offset of an IANA zone at an instant, in minutes (e.g. 330 for Asia/Kolkata)
function tzOffsetMinutes(tz, date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(date);
    const p = {};
    for (const part of parts) if (part.type !== "literal") p[part.type] = part.value;
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUtc - date.getTime()) / 60000);
}

function observesDst(tz) {
    const y = new Date().getUTCFullYear();
    return tzOffsetMinutes(tz, new Date(Date.UTC(y, 0, 1))) !== tzOffsetMinutes(tz, new Date(Date.UTC(y, 6, 1)));
}

function fmtOffset(min) {
    const sign = min < 0 ? "-" : "+";
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

// the Quick Start workflow from the README, filled in
function workflowYaml({ username, tzOffset, petName, accentColor, hibernateUntil }) {
    const minute = Math.floor(Math.random() * 60); // spread the cron load
    const optional = [];
    if (petName) optional.push(`          pet-name: "${petName}"`);
    if (accentColor) optional.push(`          accent-color: "${accentColor}"`);
    if (hibernateUntil) optional.push(`          hibernate-until: "${hibernateUntil}"`);
    return `name: My YourTomo cat
on:
  schedule:
    - cron: '${minute} */6 * * *'   # every 6h - pick your own minute
  workflow_dispatch:

permissions:
  contents: write

jobs:
  pet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ${ACTION}
        with:
          username: ${username}
          timezone-offset-minutes: "${tzOffset}"
${optional.length ? optional.join("\n") + "\n" : ""}          # more inputs: https://github.com/prsdx/github-pet#configuration
`;
}

function embedSnippet(username) {
    return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${username}/${username}/main/dist/pet.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${username}/${username}/main/dist/pet-light.svg">
  <img alt="my github pet" src="https://raw.githubusercontent.com/${username}/${username}/main/dist/pet.svg" width="100%">
</picture>`;
}

async function main() {
    console.log(`
YourTomo setup wizard
---------------------
Run this at the root of your profile repo (<username>/<username>).
It writes .github/workflows/pet.yml and prints your README snippet.
Nothing is committed or pushed - you review the files yourself.
`);

    const rl = createInterface({ input, output, terminal: input.isTTY === true });
    // iterate lines via the async iterator, not rl.question: question() drops
    // lines that arrive before it is called (piped stdin), the iterator queues
    // them - and it behaves identically on a real terminal.
    const lines = rl[Symbol.asyncIterator]();
    try {
        // validate(answer) returns true or an error string; empty input falls back to def
        const ask = async (question, { def = "", validate = null } = {}) => {
            for (;;) {
                output.write(`? ${question}${def ? ` (${def})` : ""}: `);
                const { value, done } = await lines.next();
                if (done) throw new Error("no more input");
                const answer = (value ?? "").trim() || def;
                if (!validate) return answer;
                const problem = validate(answer);
                if (problem === true) return answer;
                console.log(`  ${problem}`);
            }
        };

        const username = await ask("GitHub username", {
            def: detectUsername() ?? "",
            validate: (v) => (GITHUB_LOGIN.test(v) ? true : "that doesn't look like a GitHub username"),
        });

        const tz = await ask("Your timezone (IANA name, e.g. Asia/Kolkata)", {
            def: detectTimezone() ?? "",
            validate: (v) => (isValidTimezone(v) ? true : "unknown IANA timezone - see https://w.wiki/tz-list"),
        });
        const tzOffset = tzOffsetMinutes(tz);
        console.log(`  -> ${tz} is ${fmtOffset(tzOffset)} right now -> timezone-offset-minutes: "${tzOffset}"`);
        if (observesDst(tz)) {
            console.log(`  note: ${tz} observes daylight saving and the Action uses a fixed offset,`);
            console.log(`        so bump timezone-offset-minutes when your clocks change.`);
        }

        const petName = await ask("Name your cat (optional - enter to skip)");
        const accentColor = await ask("Accent color #rrggbb (optional)", {
            validate: (v) => (!v || /^#[0-9a-f]{6}$/i.test(v) ? true : "hex color like #58a6ff, or leave empty"),
        });
        const hibernateUntil = await ask("Hibernate until YYYY-MM-DD (optional - planned absence)", {
            validate: (v) => {
                if (!v) return true;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + "T00:00:00Z").getTime())) {
                    return "date like 2026-12-31, or leave empty";
                }
                return true;
            },
        });

        const yaml = workflowYaml({ username, tzOffset, petName, accentColor, hibernateUntil });
        let wrote = false;
        if (existsSync(WORKFLOW_PATH)) {
            const ow = await ask(`${WORKFLOW_PATH.replaceAll("\\", "/")} already exists - overwrite?`, { def: "no" });
            if (/^y(es)?$/i.test(ow)) {
                writeFileSync(WORKFLOW_PATH, yaml);
                wrote = true;
            } else {
                console.log(`  left the existing file untouched`);
            }
        } else {
            mkdirSync(dirname(WORKFLOW_PATH), { recursive: true });
            writeFileSync(WORKFLOW_PATH, yaml);
            wrote = true;
        }

        console.log(`
${wrote ? `wrote ${WORKFLOW_PATH.replaceAll("\\", "/")}\n` : ""}----------------------------------------------------------
Add the cat to your README.md:

${embedSnippet(username)}
----------------------------------------------------------

Next steps:
  1. Review${wrote ? "" : " / create"} ${WORKFLOW_PATH.replaceAll("\\", "/")}, then commit it yourself:
       git add .github/workflows/pet.yml && git commit -m "Add my YourTomo cat" && git push
  2. Paste the snippet above into your profile README.md.
  3. GitHub -> Actions -> "My YourTomo cat" -> Run workflow.
  4. The cat keeps itself alive every 6h after that.

Preview any time, no install: ${PREVIEW}/?username=${username}
`);
    } finally {
        rl.close();
    }
}

main().catch((err) => {
    console.error(`\ncreate-yourtomo: ${err?.message ?? err}`);
    process.exit(1);
});
