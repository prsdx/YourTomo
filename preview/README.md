# YourTomo live preview (Cloudflare Worker)

Try the cat on any GitHub profile before installing the Action. Read-only and
ephemeral: public GitHub API calls only, no write-scoped tokens, no repo
commits, no state — render and return.

It reuses the Action's own modules (`../src/githubApi.ts`, `../src/graphApi.ts`,
`../src/state.ts`, `../src/render.ts`) — the state machine and renderer are not
reimplemented here.

## Endpoints

| Route | What it does |
|---|---|
| `GET /` | Landing page: username field, state dropdown (auto + the 9 states), dark/light toggle |
| `GET /preview?username=<name>&state=<optional>&type=pet\|isocat\|graph\|langs&theme=dark\|light` | Live-rendered SVG (`image/svg+xml`, `Cache-Control: public, max-age=300`). `type` defaults to `pet`. |
| `GET /status` | Live GitHub API quota for the worker: JSON `{ remaining, limit, resetAt }` (or all `null` if unavailable), cached 30s. Drives the quota line on the landing page. |

`state` accepts the same list as the Action's `force-state` input (shared
`VALID_STATES` from `../src/state.ts`): overheat, release, zoomies, sleeping,
hibernating, sick, content, hungry, grumpy. Invalid values are ignored (fall
back to real data). Unknown usernames, API rate-limit hits, and GitHub outages
all render the honest fallback cat — but unlike the Action (where every failure
looks identical by design), the preview detects the *reason* and replaces the
caption with a precise diagnostic ("…isn't a GitHub username", "GitHub API limit
reached…", or "GitHub API is temporarily unreachable…"). The caption is only
overridden on the unhappy path, and never when a `state` is forced.

## Deploy (one time)

```bash
cd preview
npm install          # wrangler is the only devDependency
npx wrangler login   # or: export CLOUDFLARE_API_TOKEN=...
npm run deploy       # -> https://yourtomo.<your-subdomain>.workers.dev
```

Then:

1. **Recommended:** give it a read-only token so the 60/hr unauthenticated
   GitHub limit (shared across Cloudflare egress IPs) becomes 5,000/hr:
   `npx wrangler secret put GITHUB_TOKEN` — a fine-grained token with no
   scopes beyond public read is enough. Never use a write-scoped token.
2. **Abuse protection:** responses are edge-cached 5 minutes per
   `username+state+theme`, which absorbs normal traffic. On top of that, add
   a rate-limiting rule in the Cloudflare dashboard
   (Security → WAF → Rate limiting rules, e.g. 30 req/min per IP on `/preview*`).
3. Update the preview link in the repo's main `README.md` if your
   `workers.dev` subdomain isn't `prsdx`.

## Local development

```bash
npm run dev          # http://localhost:8787
```

The worker name is `prsdx` (see `wrangler.toml`), so the deployed URL is
`https://prsdx.<your-subdomain>.workers.dev`. Update the two hardcoded URLs
(in the repo `README.md`) if your
Cloudflare account subdomain is not `yourtomo`. No token needed to hack on
queries skip themselves and the cat renders its fallback slabs, exactly like
the Action's tokenless path.

## Intentional differences from the Action's output

- UTC drives the sleeping window/greeting (no per-user timezone input here).
- No star/follower milestone confetti (needs the committed `state.json` delta memory; the preview stores nothing).
- The `langs` chart costs ~25 extra REST calls per render — this is the one SVG type that really benefits from the 5-minute edge cache and an optional `GITHUB_TOKEN`.
