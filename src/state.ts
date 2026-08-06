// Deterministic state machine: GitHub activity -> pet state.
// Priority (first match wins): overheat > zoomies > sleeping > content > hungry > grumpy.
// Every rule maps to real data from the events API / GraphQL / Actions runs.

export interface PetStatus {
    state: "overheat" | "zoomies" | "sleeping" | "content" | "hungry" | "grumpy";
    caption: string;
    apiOk: boolean;
}

export interface Activity {
    lastPush?: Date | null;
    merged24h?: number;
}

export interface CiInfo {
    failed?: boolean;
    repo?: string;
    runNumber?: number;
}

// Owner's local timezone offset from UTC, in minutes (e.g. 330 = UTC+5:30).
// Drives the sleeping window + time-aware greeting. Set PET_TZ_OFFSET_MINUTES.
const TZ_OFFSET_MIN = (() => {
    const n = parseInt(process.env.PET_TZ_OFFSET_MINUTES ?? "0", 10);
    return isNaN(n) ? 0 : n;
})();

function pushes(events: any[]): Date[] {
    const out: Date[] = [];
    for (const e of events) {
        if (e?.type !== "PushEvent") continue;
        const t = new Date(e.created_at);
        if (!isNaN(t.getTime())) out.push(t);
    }
    return out.sort((a, b) => b.getTime() - a.getTime());
}

function mergedPrsLast24h(events: any[], now: Date): number {
    let n = 0;
    for (const e of events) {
        if (e?.type !== "PullRequestEvent") continue;
        const pr = e?.payload?.pull_request ?? {};
        if (e?.payload?.action === "closed" && pr.merged) {
            const t = new Date(e.created_at);
            if (!isNaN(t.getTime()) && now.getTime() - t.getTime() <= 24 * 3600e3) n++;
        }
    }
    return n;
}

function fmtAge(ms: number): string {
    const mins = Math.max(Math.floor(ms / 60000), 1);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

function localHour(now: Date): number {
    return Math.floor(((now.getTime() + TZ_OFFSET_MIN * 60000) % 86400000) / 3600000);
}

// Time-aware banner greeting (owner's local time, decided at generation time -
// SVGs cannot see visitors, so the welcome is baked into the regen cycle).
export function greetingFor(now = new Date(), name = ""): string {
    const where = name ? `welcome to ${name}'s corner` : "welcome to my corner";
    const h = localHour(now);
    if (h >= 5 && h < 12) return `good morning! ${where}`;
    if (h >= 12 && h < 17) return `good afternoon! ${where}`;
    if (h >= 17 && h < 22) return `good evening! ${where}`;
    return `up late? me too - ${where}`;
}

// ---------------- v1.1 helpers: more real-data signals for the scene ----------------

export function ownerHour(now = new Date()): number {
    return localHour(now);
}

// day/night sky phase from the owner's local hour
export function skyPhase(hour: number): "dawn" | "day" | "dusk" | "night" {
    if (hour >= 5 && hour < 8) return "dawn";
    if (hour >= 8 && hour < 17) return "day";
    if (hour >= 17 && hour < 20) return "dusk";
    return "night";
}

// consecutive contribution days ending today/yesterday (today may be incomplete)
export function currentStreak(days: Array<{ date: string; count: number }> | null | undefined): number {
    if (!days || days.length === 0) return 0;
    let i = days.length - 1;
    if (days[i].count === 0) i--; // don't break the streak over an unfinished day
    let streak = 0;
    while (i >= 0 && days[i].count > 0) {
        streak++;
        i--;
    }
    return streak;
}

// is today (owner-local) the account's GitHub-iversary?
export function isBirthday(createdAt: string | null | undefined, now = new Date()): boolean {
    if (!createdAt) return false;
    const m = /^\d{4}-(\d{2})-(\d{2})/.exec(createdAt);
    if (!m) return false;
    const local = new Date(now.getTime() + TZ_OFFSET_MIN * 60000);
    return local.getUTCMonth() + 1 === parseInt(m[1], 10) && local.getUTCDate() === parseInt(m[2], 10);
}

// most recently pushed repo (short name), for the "hacking on X" bubble
export function lastPushedRepo(events: any[]): string | null {
    for (const e of events) {
        if (e?.type === "PushEvent") {
            const full: string = e?.repo?.name ?? "";
            const short = full.includes("/") ? full.split("/")[1] : full;
            if (short) return short.length > 24 ? short.slice(0, 24) : short;
        }
    }
    return null;
}

// prefix the caption with the cat's name, keeping the state wording natural
function withName(catName: string, state: string, caption: string): string {
    const prefixes: Record<string, string> = {
        overheat: "overheat - ",
        zoomies: "zoomies!! ",
        sleeping: "sleeping - ",
        content: "content - ",
        hungry: "hungry - ",
        grumpy: "grumpy - ",
    };
    const forms: Record<string, string> = {
        overheat: "is overheating - ",
        zoomies: "has the zoomies!! ",
        sleeping: "is sleeping - ",
        content: "is content - ",
        hungry: "is hungry - ",
        grumpy: "is grumpy - ",
    };
    const p = prefixes[state];
    if (p && caption.startsWith(p)) return `${catName} ${forms[state]}${caption.slice(p.length)}`;
    return `${catName}: ${caption}`;
}

export function decide(events: any[], activity: Activity = {}, ci: CiInfo = {}, now = new Date(), catName = ""): PetStatus {
    const status = decideInner(events, activity, ci, now);
    if (!catName) return status;
    return { ...status, caption: withName(catName, status.state, status.caption) };
}

function decideInner(events: any[], activity: Activity = {}, ci: CiInfo = {}, now = new Date()): PetStatus {
    const pushTimes = pushes(events);
    const pushes24h = pushTimes.filter((t) => now.getTime() - t.getTime() <= 24 * 3600e3);
    const merged = Math.max(mergedPrsLast24h(events, now), activity.merged24h ?? 0);
    const lastPush = pushTimes[0] ?? activity.lastPush ?? null;

    // broken CI outranks a happy cat (time-boxed to 24h upstream in the fetcher)
    if (ci.failed) {
        const where = ci.repo ? ` on ${ci.repo}` : "";
        const run = ci.runNumber ? ` (run #${ci.runNumber})` : "";
        return { state: "overheat", caption: `overheat - CI failed${where}${run}`, apiOk: true };
    }

    if (pushTimes.length === 0 && !lastPush && !merged) {
        return { state: "content", caption: "github api is quiet - pretending everything is fine", apiOk: false };
    }

    if (merged || pushes24h.length >= 3) {
        const why = merged ? `${merged} pr merged` : `${pushes24h.length} pushes`;
        return { state: "zoomies", caption: `zoomies!! ${why} in the last 24h`, apiOk: true };
    }

    const lastAge = lastPush ? now.getTime() - lastPush.getTime() : null;
    const hour = localHour(now);
    if (hour >= 0 && hour < 6 && (lastAge === null || lastAge > 6 * 3600e3)) {
        const local = new Date(now.getTime() + TZ_OFFSET_MIN * 60000);
        const hh = String(local.getUTCHours()).padStart(2, "0");
        const mm = String(local.getUTCMinutes()).padStart(2, "0");
        return { state: "sleeping", caption: `sleeping - it is ${hh}:${mm} local time right now`, apiOk: true };
    }

    if (lastAge !== null && lastAge <= 24 * 3600e3) {
        return { state: "content", caption: `content - fed by a push ${fmtAge(lastAge)} ago`, apiOk: true };
    }
    if (lastAge !== null && lastAge <= 96 * 3600e3) {
        return { state: "hungry", caption: `hungry - no pushes for ${fmtAge(lastAge)}`, apiOk: true };
    }
    if (lastAge !== null) {
        return { state: "grumpy", caption: `grumpy - bowl empty for ${fmtAge(lastAge)}`, apiOk: true };
    }
    return { state: "grumpy", caption: "grumpy - no pushes in the last 90 days", apiOk: true };
}