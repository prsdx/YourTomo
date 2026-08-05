// Fetch GitHub data via REST. Zero dependencies (global fetch in Bun/Node 24).
// Note: fine-grained tokens 403 on user-level endpoints, so public endpoints
// are retried unauthenticated.

const API = "https://api.github.com";

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
    for (const repo of repos.slice(0, 25)) {
        for (const auth of [true, false]) {
            try {
                const langs = await getJson(`/repos/${user}/${repo.name}/languages`, auth);
                for (const [lang, bytes] of Object.entries(langs)) {
                    totals[lang] = (totals[lang] ?? 0) + (bytes as number);
                }
                break;
            } catch { /* try next */ }
        }
    }
    return totals;
}