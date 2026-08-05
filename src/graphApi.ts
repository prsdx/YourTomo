// GitHub GraphQL fetches (token required). Zero dependencies.
// GraphQL works with fine-grained tokens for these queries, unlike some
// user-level REST endpoints - so this is the reliable channel in CI.

export interface CalendarDay { date: string; count: number }
export interface Calendar { total: number; days: CalendarDay[] }

const CALENDAR_QUERY = (user: string) => `{
  user(login: \"${user}\") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const ACTIVITY_QUERY = (user: string) => `{
  user(login: \"${user}\") {
    repositories(first: 15, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes { pushedAt }
    }
    pullRequests(first: 10, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { mergedAt }
    }
  }
}`;

async function post(query: string, token: string): Promise<any | null> {
    const resp = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `bearer ${token}`, "User-Agent": "github-pet" },
        body: JSON.stringify({ query }),
    });
    if (!resp.ok) return null;
    const payload = await resp.json();
    return payload?.data ?? null;
}

export async function fetchCalendar(token: string | undefined, user = "prsdx"): Promise<Calendar | null> {
    if (!token) return null;
    try {
        const data = await post(CALENDAR_QUERY(user), token);
        const cal = data.user.contributionsCollection.contributionCalendar;
        const days: CalendarDay[] = [];
        for (const week of cal.weeks) {
            for (const d of week.contributionDays) days.push({ date: d.date, count: d.contributionCount });
        }
        return { total: cal.totalContributions, days };
    } catch {
        return null;
    }
}

export async function fetchActivity(token: string | undefined, user = "prsdx"):
    Promise<{ lastPush: Date | null; merged24h: number } | null> {
    if (!token) return null;
    try {
        const data = await post(ACTIVITY_QUERY(user), token);
        const u = data.user;
        const pushed: Date[] = u.repositories.nodes
            .map((n: any) => new Date(n.pushedAt))
            .filter((t: Date) => !isNaN(t.getTime()));
        const now = Date.now();
        let merged = 0;
        for (const n of u.pullRequests.nodes) {
            const t = new Date(n.mergedAt);
            if (!isNaN(t.getTime()) && now - t.getTime() <= 24 * 3600e3) merged++;
        }
        const lastPush = pushed.length ? new Date(Math.max(...pushed.map((t) => t.getTime()))) : null;
        return { lastPush, merged24h: merged };
    } catch {
        return null;
    }
}