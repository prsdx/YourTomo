// Fetch GitHub data via REST. Zero dependencies (global fetch in Bun/Node 24).
// Note: fine-grained tokens 403 on user-level endpoints, so public endpoints
// are retried unauthenticated.

const API = "https://api.github.com";

// repos whose CI the pet watches (user-owned mains).
// Set PET_WATCHED_REPOS="repo1,repo2" - empty disables the overheat state.
function watchedRepos(): string[] {
    return (process.env.PET_WATCHED_REPOS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

// public profile (greeting name when PET_NAME is unset; created_at for the birthday
// cake; followers for milestone reactions via the state.json delta)
export async function fetchProfile(user: string): Promise<{ name: string | null; createdAt: string | null; followers: number | null } | null> {
    for (const auth of [true, false]) {
        try {
            const data = await getJson(`/users/${user}`, auth);
            if (data && data.login) return { name: data.name ?? null, createdAt: data.created_at ?? null, followers: data.followers ?? null };
        } catch { /* try next */ }
    }
    return null;
}

// total open issues across watched repos (drives the sick-day state)
export async function fetchOpenIssues(user: string): Promise<number> {
    let total = 0;
    for (const repo of watchedRepos()) {
        for (const auth of [true, false]) {
            try {
                const data = await getJson(`/repos/${user}/${repo}`, auth);
                if (typeof data?.open_issues_count === "number") {
                    total += data.open_issues_count; // note: includes open PRs - close enough for a cat
                }
                break;
            } catch { /* try next auth mode */ }
        }
    }
    return total;
}

function token(): string | undefined {
    return process.env.GITHUB_TOKEN || process.env.PET_GITHUB_TOKEN;
}

async function getJson(path: string, auth = true): Promise<any> {
    const headers: Record<string, string> = {
        "User-Agent": "github-pet",
        Accept: "application/vnd.github+json",
    };
    const tok = token();
    if (auth && tok) headers.Authorization = `Bearer ${tok}`;
    const resp = await fetch(API + path, { headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}

export async function fetchEvents(user: string): Promise<any[]> {
    for (const auth of [true, false]) {
        try {
            const data = await getJson(`/users/${user}/events/public?per_page=100`, auth);
            if (Array.isArray(data)) return data;
        } catch { /* try next */ }
    }
    return [];
}

export async function fetchRepos(user: string): Promise<any[]> {
    const attempts: Array<[string, boolean]> = [];
    if (token()) attempts.push(["/user/repos?per_page=100&affiliation=owner&visibility=public", true]);
    attempts.push([`/users/${user}/repos?per_page=100&type=owner`, false]);
    for (const [path, auth] of attempts) {
        try {
            const data = await getJson(path, auth);
            if (Array.isArray(data)) return data.filter((r: any) => !r.fork);
        } catch { /* try next */ }
    }
    return [];
}

export async function fetchLanguages(user: string, repos: any[]): Promise<Record<string, number>> {
    const totals: Record<string, number> = {};
    const slice = repos.slice(0, 25);
    const perRepo = async (repo: any): Promise<Record<string, number> | null> => {
        for (const auth of [true, false]) {
            try {
                return await getJson(`/repos/${user}/${repo.name}/languages`, auth);
            } catch { /* try next */ }
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
            } catch { /* try next auth mode */ }
        }
    }
    return { failed: false };
}