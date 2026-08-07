# Security Policy

## Supported Versions

Only the latest release (rolling `v1` tag) receives security fixes.

| Version | Supported |
|---|---|
| `v1` (latest) | ✅ |
| Older tags | ❌ |

## Reporting a Vulnerability

**Do not open a public issue.** Email **[prsdx.dev@gmail.com](mailto:prsdx.dev@gmail.com)** with:

- The affected component (Action, preview worker, SVG renderer)
- Steps to reproduce
- Any proof-of-concept or logs (redact tokens)

You'll receive a response within 72 hours. Critical fixes are published as a new patch release and the rolling `v1` tag is advanced.

## Scope

- **In scope:** The Action's TypeScript entrypoint (`generate.ts`), the state machine (`src/state.ts`), the SVG renderers, the Cloudflare preview worker (`preview/worker.ts`), and the `action.yml` manifest.
- **Out of scope:** The live preview's rate-limiting (configured in your Cloudflare dashboard — not code), GitHub's own API authentication flow, and third-party Actions your workflow may compose (e.g. `actions/checkout`).

## Acknowledgments

Reporters who follow the responsible-disclosure process will be credited here (with permission) after the fix is released.
