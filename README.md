# github-pet

A pixel cat that lives on my GitHub profile and reacts to my public activity.

- **Zero dependencies** — Python standard library only
- **Deterministic state machine** over the GitHub Events API
- **Hand-crafted pixel sprites** rendered to **animated SVG (SMIL)**
- Regenerated every 6 hours by a GitHub Action (`.github/workflows/pet.yml`)

## States

| State | Trigger (from public events) |
|---|---|
| zoomies | PR merged in last 24h, or 3+ pushes today |
| sleeping | 00:00–06:00 IST and no push in 6h |
| content | at least one push in the last 24h |
| hungry | no pushes for 48–96h |
| grumpy | no pushes for 96h+ |

## Embed

```html
<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/pet-light.svg">
  <img alt="my github pet" src="https://raw.githubusercontent.com/prsdx/github-pet/main/dist/pet.svg">
</picture>
```

## Run locally

```bash
python generate.py   # writes dist/pet.svg and dist/pet-light.svg
```

Built by hand — no widgets, no templates.