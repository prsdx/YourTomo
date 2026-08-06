# Contributing to github-pet

Thanks for considering it! A few ground rules that keep this project what it is:

## The zero-dependency rule

The generator must stay **dependency-free**: Node/Bun standard library only,
no `package.json`, no `npm install`. If an idea needs a package, restructure
the idea. (Rendering is hand-drawn pixel grids + SMIL for the same reason:
GitHub strips JS/CSS from README images, so everything must be plain SVG.)

## Run it locally

```bash
node generate.ts        # Node 24+ (native type stripping)
# or
bun generate.ts
```

No token needed - without `GITHUB_TOKEN` the calendar falls back to flat
slabs, which is exactly what CI tests. Set env vars to exercise more:

```bash
PET_USER=you GITHUB_TOKEN=ghp_... PET_TZ_OFFSET_MINUTES=330 \
  PET_WATCHED_REPOS="repo1,repo2" PET_NAME=you PET_CONTACT=you@x.com \
  node generate.ts
```

## Before opening a PR

1. `node generate.ts` must exit 0 **with and without** a token (the no-token
   fallback path is what external contributors can run - never break it).
2. Every SVG in the output dir must be well-formed XML.
3. New pet behavior = a new rule in `src/state.ts` mapped to **real GitHub
   data**. No fake randomness - the cat only reacts to truth.
4. Keep pixel sprites in `src/sprites.ts` consistent with the mochi style
   (solid blob body, short ears, dot eyes).

## Feedback / ideas

Not a code change? Open a Discussion (ideas, show-and-tell) or an Issue
(bugs). Screenshots of the cat being weird are always appreciated.
