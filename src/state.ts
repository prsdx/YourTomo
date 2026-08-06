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

const IST_OFFSET_MIN = 330; // UTC+5:30 - user is in India

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

function istHour(now: Date): number {
    return Math.floor(((now.getTime() + IST_OFFSET_MIN * 60000) % 86400000) / 3600000);
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
    const hour = istHour(now);
    if (hour >= 0 && hour < 6 && (lastAge === null || lastAge > 6 * 3600e3)) {
        const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60000);
        const hh = String(ist.getUTCHours()).padStart(2, "0");
        const mm = String(ist.getUTCMinutes()).padStart(2, "0");
        return { state: "sleeping", caption: `sleeping - it is ${hh}:${mm} in india right now`, apiOk: true };
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