<div align="center">

# 🐱 YourTomo

**A pixel cat that lives on your GitHub profile and reacts to what you actually do.**

No JavaScript. No hosting. No dependencies at runtime — a deterministic
state machine, rendered to animated SVG by a GitHub Action that lives in
*your* repo.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-YourTomo-blue?logo=github)](https://github.com/marketplace/actions/yourtomo)
[![MIT license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Stars](https://img.shields.io/github/stars/prsdx/github-pet?style=flat)](https://github.com/prsdx/github-pet/stargazers)

<img alt="YourTomo banner — the cat living its life" src="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/pet.svg" width="100%">

</div>

---



## Quick start (5 minutes)

**Try it first** — see the cat on *your own* profile before installing
anything → **[prsdx.yourtomo.workers.dev](https://prsdx.yourtomo.workers.dev)**
(read-only, nothing is stored).

**Zero-config install:** `npx create-yourtomo` asks a few questions (username,
IANA timezone — no UTC-offset math) and writes the workflow below for you,
plus your README embed snippet. Prefer the manual route? It's one file:

**1.** Add this workflow to your profile repo (`your-username/your-username`)
as `.github/workflows/pet.yml`:

```yaml
name: My YourTomo cat
on:
  schedule:
    - cron: '23 */6 * * *'   # every 6h - pick your own minute
  workflow_dispatch:

permissions:
  contents: write

jobs:
  pet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: prsdx/github-pet@v1
        with:
          username: your-username        # change me
          timezone-offset-minutes: "330" # your UTC offset in minutes
```

**2.** Embed the cat in your `README.md`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/your-username/your-username/main/dist/pet.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/your-username/your-username/main/dist/pet-light.svg">
  <img alt="my github pet" src="https://raw.githubusercontent.com/your-username/your-username/main/dist/pet.svg" width="100%">
</picture>
```

**3.** Run it once manually (Actions → *My YourTomo cat* → Run workflow), or
wait for the schedule. That's it — it keeps itself alive forever.

## What you get

| | |
|---|---|
| **`pet.svg`** — Banner scene | <img src="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/pet.svg" width="360"> |
| **`isocat.svg`** — Isometric contribution city | <img src="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/isocat.svg" width="360"> |
| **`graph.svg`** — Flat contribution graph | <img src="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/graph.svg" width="360"> |
| **`langs.svg`** — Language share chart | <img src="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/langs.svg" width="360"> |
| **`pet-badge.svg`** — Mini status badge | <img src="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/pet-badge.svg" width="200"> |

The banner cat eats, bats its yarn, sleeps in its box — greets visitors by
time of day, points them around your profile, shows what you're currently
hacking on, keeps a streak campfire burning, celebrates your GitHub-iversary,
and lives under a day/night sky. Every SVG also ships a `-light` variant for
light-mode profiles.

Badge embed: `![pet](https://raw.githubusercontent.com/your-username/your-username/main/dist/pet-badge.svg)`

## The cat is honest

Every state maps to real data (first match wins):

| State | Rule | Visual |
|---|---|---|
| 🔥 overheat | a watched repo's latest CI run failed (24h window) | cat turns red, steams |
| zoomies | PR merged ≤24h, or ≥3 pushes today | sprints with motion lines |
| sleeping | 00:00–06:00 your local time, nothing pushed ≤6h | curled up, floating Zzz |
| content | pushed ≤24h | daily routine + hearts |
| hungry | no pushes for 24–96h | camps at the empty bowl |
| grumpy | no pushes for >96h | sulks in the cardboard box |
| 🏆 release | you shipped a release ≤24h ago | trophy next to the cat |
| 😷 sick | ≥10 open issues across watched repos | camps at home, thermometer |
| 🛌 hibernating | you set `hibernate-until` | sleeps with a back-soon caption |

If the API is unreachable the cat plays it cool instead of erroring your
profile: flat slabs, an honest caption, everything still renders.

Also real, just quieter: the **day/night sky** follows your local hour, the
**campfire** burns while your contribution streak is ≥3 days (label shows the
count), a **birthday cake** appears on your GitHub-iversary, the rotating
bubbles mention **what you last pushed to**, the label carries a **weekly
digest** and your **year total**, **weekends** bring shades and lemonade, a
**pumpkin** shows up in October and **fireworks** on New Year's, streaks ≥21
days earn a gentle **"touch grass" sign**, and crossing **star/follower
milestones** rains confetti (via a tiny committed `state.json` memory).

## Configuration

| Input | Default | What it does |
|---|---|---|
| `username` | repo owner | Whose activity to watch |
| `token` | `GITHUB_TOKEN` | Used for the contribution calendar (GraphQL). The default token is enough |
| `timezone-offset-minutes` | `0` | Your UTC offset in minutes - drives sleeping + greeting |
| `watched-repos` | *(empty)* | Comma-separated repos for the overheat state, e.g. `"api,web"` |
| `display-name` | *(auto)* | First name in the greeting (auto-detected from your profile if empty) |
| `pet-name` | *(empty)* | Give the cat a name - "mochi is sleeping" instead of "sleeping" |
| `hibernate-until` | *(empty)* | `YYYY-MM-DD` planned absence - cat hibernates instead of going hungry/grumpy |
| `accent-color` | *(empty)* | `#rrggbb` brand color for the cat's accents |
| `contact-line` | *(empty)* | Third guide bubble, e.g. your email. Empty skips it |
| `output-dir` | `dist` | Where the SVGs are written |
| `attribution` | `true` | Appends `YourTomo by prsdx` to the caption strip 💙 |
| `force-state` | *(empty)* | Preview only: force one of the 9 states (`overheat`, `release`, `zoomies`, `sleeping`, `hibernating`, `sick`, `content`, `hungry`, `grumpy`) instead of deciding from real data - handy for screenshots |

## FAQ

- **Why a token for the calendar?** GitHub's contribution calendar is only
  exposed via GraphQL, which requires auth. Everything else works tokenless.
- **The image on my profile is stale.** GitHub proxies README images through
  its Camo cache - give it a few minutes, or hard-refresh (`Ctrl+F5`).
- **Scheduled run didn't fire on time?** GitHub cron can lag under load. Use
  *Run workflow* for instant regeneration. (Repos never go inactive here -
  the workflow commits every 6h, so GitHub never pauses the schedule.)
- **Can I self-host instead of using the Action?** Yes: fork/clone and run
  `node generate.ts` (Node 24+) or `bun generate.ts` - see
  [CONTRIBUTING.md](CONTRIBUTING.md) for the env-var knobs.

## Feedback

- 🐱 **Show & tell / ideas:** [Discussions](../../discussions) - post your pet
- 🐛 **Bugs:** [Issues](../../issues) - templates included, logs appreciated
- If the cat made you smile, a ⭐ tells other people it exists.

---

Zero runtime dependencies, TypeScript, built by hand — pixel grids, state
machine and all. [Live on the author's profile](https://github.com/prsdx) ·
MIT licensed.
