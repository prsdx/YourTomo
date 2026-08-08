// Fetch GitHub data via REST. Zero dependencies (global fetch in Bun/Node 24).
// Fine-grained tokens 403 on most user-level REST endpoints — when that
// happens we skip the unauthenticated fallback (wastes the shared 60/hr
// quota for no gain) and return empty.  Classic PAT with read:user is best.

const API = "https://api.github.com";

// in-flight + short-lived caches so concurrent landing-page requests share
// fetches and repeat hits within a few seconds avoid GitHub entirely.
const inflight = new Map<string, Promise<any>>();
const resultCache = new Map<string, { ts: number; val: any }>();
const CACHE_MS = 8_000; // 8s — covers the 4 simultaneous img loads from one page

function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = resultCache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_MS) return Promise.resolve(hit.val as T);
    let p = inflight.get(key);
    if (!p) {
        p = fn().then((val) => {
            resultCache.set(key, { ts: Date.now(), val });
            inflight.delete(key);
            return val;
        }).catch((err) => {
            inflight.delete(key);
            throw err;
        });
        inflight.set(key, p);
    }
    return p as Promise<T>;
}

function token(): string | undefined {
    return process.env.GITHUB_TOKEN || process.env.PET_GITHUB_TOKEN;
}

export class GitHubError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

// Preview-only diagnostics. The Action's fetchers above deliberately swallow
// every failure (never break a profile). The live preview needs the real
// reason instead - these two are only called by preview/worker.ts, and only
// on the unhappy path (after the normal fetchers already came back empty),
// so they add zero cost to the common case.

export async function probeUsername(user: string): Promise<"exists" | "not_found" | "unknown"> {
    try {
        const data = await getJson(`/users/${user}`, true);
        return data?.login ? "exists" : "unknown";
    } catch (err) {
        if (err instanceof GitHubError && err.status === 404) return "not_found";
        return "unknown"; // rate limited, network error, etc. - inconclusive
    }
}

export async function checkRateLimit(): Promise<{ remaining: number; limit: number; resetAt: number } | null> {
    try {
        const data = await getJson(`/rate_limit`, true);
        const core = data?.resources?.core;
        if (!core) return null;
        return { remaining: core.remaining, limit: core.limit, resetAt: core.reset * 1000 };
    } catch {
        return null;
    }
}

async function getJson(path: string, auth = true): Promise<any> {
    const headers: Record<string, string> = {
        "User-Agent": "github-pet",
        Accept: "application/vnd.github+json",
    };
    const tok = token();
    if (auth && tok) headers.Authorization = `Bearer ${tok}`;
    const resp = await fetch(API + path, { headers });
    if (!resp.ok) throw new GitHubError(resp.status, `HTTP ${resp.status}`);
    return resp.json();
}

// When a token gets 403 the caller should NOT fall back to unauthenticated —
// the token is permanently incompatible with that endpoint.
function isAuthFailure(err: unknown): boolean {
    return err instanceof GitHubError && err.status === 403 && !!token();
}

export async function fetchEvents(user: string): Promise<any[]> {
    const key = `events:${user}`;
    return dedupe(key, async () => {
        for (const auth of [true, false]) {
            try {
                const data = await getJson(`/users/${user}/events/public?per_page=100`, auth);
                if (Array.isArray(data)) return data;
            } catch (err) {
                if (isAuthFailure(err)) return [];
            }
        }
        return [];
    });
}

export async function fetchProfile(user: string):
    Promise<{ name: string | null; createdAt: string | null; followers: number | null } | null> {
    const key = `profile:${user}`;
    return dedupe(key, async () => {
        for (const auth of [true, false]) {
            try {
                const data = await getJson(`/users/${user}`, auth);
                if (data?.login) return { name: data.name ?? null, createdAt: data.created_at ?? null, followers: data.followers ?? null };
            } catch (err) {
                if (isAuthFailure(err)) return null;
            }
        }
        return null;
    });
}

export async function fetchRepos(user: string): Promise<any[]> {
    const key = `repos:${user}`;
    return dedupe(key, async () => {
        const attempts: Array<[string, boolean]> = [];
        if (token()) attempts.push(["/user/repos?per_page=100&affiliation=owner&visibility=public", true]);
        attempts.push([`/users/${user}/repos?per_page=100&type=owner`, false]);
        for (const [path, auth] of attempts) {
            try {
                const data = await getJson(path, auth);
                if (Array.isArray(data)) return data.filter((r: any) => !r.fork);
            } catch (err) {
                if (isAuthFailure(err)) return [];
            }
        }
        return [];
    });
}

export async function fetchLanguages(user: string, repos: any[]): Promise<Record<string, number>> {
    const key = `langs:${user}`;
    return dedupe(key, async () => {
        const totals: Record<string, number> = {};
        const slice = repos.slice(0, 25);
        const perRepo = async (repo: any): Promise<Record<string, number> | null> => {
            for (const auth of [true, false]) {
                try {
                    return await getJson(`/repos/${user}/${repo.name}/languages`, auth);
                } catch (err) {
                    if (isAuthFailure(err)) return null;
                }
            }
            return null;
        };
        // bounded parallelism (5 at a time) - fast but abuse-limit friendly
        for (let i = 0; i < slice.length; i += 5) {
            const batch = await Promise.all(slice.slice(i, i + 5).map(perRepo));
            for (const langs of batch) {
                if (!langs) continue;
                for (const [lang, bytes] of Object.entries(langs)) {
                    totals[lang] = (totals[lang] ?? 0) + (bytes as number);
                }
            }
        }
        return totals;
    });
}

// repos whose CI the pet watches (user-owned mains).
// Set PET_WATCHED_REPOS="repo1,repo2" - empty disables the overheat state.
function watchedRepos(): string[] {
    return (process.env.PET_WATCHED_REPOS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

// total open issues across watched repos (drives the sick-day state)
export async function fetchOpenIssues(user: string): Promise<number> {
    let total = 0;
    for (const repo of watchedRepos()) {
        for (const auth of [true, false]) {
            try {
                const data = await getJson(`/repos/${user}/${repo}`, auth);
                if (typeof data?.open_issues_count === "number") {
                    total += data.open_issues_count;
                }
                break;
            } catch (err) {
                if (isAuthFailure(err)) break;
            }
        }
    }
    return total;
}

export interface CiResult {
    failed: boolean;
    repo?: string;
    runNumber?: number;
}

// Overheat input: latest Actions run on any watched repo failed within 24h.
export async function fetchCiStatus(user: string): Promise<CiResult> {
    const repos = watchedRepos();
    if (repos.length === 0) return { failed: false };
    const cutoff = Date.now() - 24 * 3600e3;
    for (const repo of repos) {
        for (const auth of [true, false]) {
            try {
                const data = await getJson(`/repos/${user}/${repo}/actions/runs?per_page=1`, auth);
                const run = data?.workflow_runs?.[0];
                if (!run) break;
                const when = new Date(run.created_at).getTime();
                if (run.conclusion === "failure" && !isNaN(when) && when >= cutoff) {
                    return { failed: true, repo, runNumber: run.run_number };
                }
                break;
            } catch (err) {
                if (isAuthFailure(err)) break;
            }
        }
    }
    return { failed: false };
}