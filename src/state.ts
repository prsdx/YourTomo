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

export function decide(events: any[], activity: Activity = {}, ci: CiInfo = {}, now = new Date()): PetStatus {
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