# github-pet

A pixel cat that lives on my GitHub profile and reacts to my **real GitHub
activity**. No third-party widgets, no JavaScript, no hosting - a
deterministic state machine rendered to animated SVG by a GitHub Action.

## How it works

1. `pet/github_api.py` fetches public events (REST, stdlib `urllib`).
   `pet/graph_api.py` fetches the real contribution calendar and recent
   repo/PR activity (GraphQL). Zero dependencies.
2. `pet/state.py` reduces that to one state, first match wins:

| State | Rule | Visual |
|---|---|---|
| zoomies | PR merged <=24h, or >=3 pushes today | kitty sprints, motion lines |
| sleeping | 00:00-06:00 IST, nothing pushed <=6h | curled up, floating Zzz |
| content | pushed <=24h | patrols + purring hearts |
| hungry | no pushes for 48-96h | sits by an empty bowl |
| grumpy | no pushes for >96h | back turned, judging me |

3. Rendering (`pet/graph_render.py`, `pet/render.py`, `pet/charts.py`) draws
   hand-crafted pixel grids (`pet/sprites.py`) as animated SVG. SMIL only -
   GitHub strips JavaScript and CSS from README images.
4. `.github/workflows/pet.yml` regenerates `dist/*.svg` every 6h
   (`permissions: contents: write`) and commits only on change.

## Outputs

- `dist/graph.svg` / `graph-light.svg` - mochi kitty hopping along my real
  contribution graph (hero visual, dark/light)
- `dist/pet.svg` / `pet-light.svg` - side-view walking-cat banner
- `dist/langs.svg` / `langs-light.svg` - language chart from real repo bytes

## Run it yourself

```bash
git clone https://github.com/prsdx/github-pet
cd github-pet
python generate.py          # python 3.10+, nothing to install
```

`PET_USER=your-username` targets your profile. `GITHUB_TOKEN` (optional)
enables the contribution calendar, activity feed and higher rate limits.

---

Built by hand - pixel grids, state machine and all. If the cat is grumpy,
that says something about my commit habits.