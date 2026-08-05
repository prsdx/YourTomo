# github-pet

A pixel cat that lives on my GitHub profile and reacts to my **real GitHub
activity**. No third-party widgets, no JavaScript in the output, no hosting -
a deterministic state machine rendered to animated SVG by a GitHub Action.

Written in **zero-dependency TypeScript** - runs on **Bun** in CI (or Node 24+
locally via native type stripping). Nothing to `npm install`, ever.

## How it works

1. `src/githubApi.ts` fetches public events (REST, global `fetch`).
   `src/graphApi.ts` fetches the real contribution calendar and recent
   repo/PR activity (GraphQL).
2. `src/state.ts` reduces that to one state, first match wins:

| State | Rule | Visual |
|---|---|---|
| zoomies | PR merged <=24h, or >=3 pushes today | kitty sprints, motion lines |
| sleeping | 00:00-06:00 IST, nothing pushed <=6h | curled up, floating Zzz |
| content | pushed <=24h | daily routine + purring hearts |
| hungry | no pushes for 48-96h | camps at the empty bowl |
| grumpy | no pushes for >96h | sulks in the cardboard box, angry brows |

3. Rendering (`src/render.ts`, `src/graphRender.ts`, `src/charts.ts`) draws
   hand-crafted pixel grids (`src/sprites.ts`) as animated SVG. SMIL only -
   GitHub strips JavaScript and CSS from README images. The banner cat lives a
   little life: eats from its bowl, bats its yarn, sleeps in its box.
4. `.github/workflows/pet.yml` regenerates `dist/*.svg` every 6h
   (`permissions: contents: write`, Bun runtime) and commits only on change.

## Outputs

- `dist/pet.svg` / `pet-light.svg` - banner scene: the cat daily routine
- `dist/graph.svg` / `graph-light.svg` - mochi kitty hopping along my real
  contribution graph (dark/light)
- `dist/langs.svg` / `langs-light.svg` - language chart from real repo bytes

## Run it yourself

```bash
git clone https://github.com/prsdx/github-pet
cd github-pet
bun generate.ts          # or: node generate.ts  (Node 24+)
```

`PET_USER=your-username` targets your profile. `GITHUB_TOKEN` (optional)
enables the contribution calendar, activity feed and higher rate limits.

---

Built by hand - pixel grids, state machine and all. If the cat is grumpy,
that says something about my commit habits.