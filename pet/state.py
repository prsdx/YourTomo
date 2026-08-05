"""Deterministic state machine: GitHub public events -> pet state."""
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def _parse(ts):
    return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def compute_state(events, now=None):
    """Return (state, human_reason). Priority: zoomies > sleeping > content > hungry > grumpy."""
    now = now or datetime.now(timezone.utc)
    if events is None:
        return "content", "github api unreachable - defaulting to a content cat"

    pushes = []
    merged_recent = False
    for ev in events:
        when = _parse(ev["created_at"])
        if ev.get("type") == "PushEvent":
            pushes.append(when)
        elif ev.get("type") == "PullRequestEvent":
            payload = ev.get("payload", {})
            pr = payload.get("pull_request", {})
            if payload.get("action") == "closed" and pr.get("merged"):
                if (now - when) <= timedelta(hours=24):
                    merged_recent = True

    pushes.sort(reverse=True)
    last_push = pushes[0] if pushes else None
    age = (now - last_push) if last_push else None
    pushes_today = sum(1 for p in pushes if p.date() == now.date())
    now_ist = now.astimezone(IST)

    if merged_recent or pushes_today >= 3:
        why = "a PR just got merged" if merged_recent else f"{pushes_today} pushes today"
        return "zoomies", why
    if 0 <= now_ist.hour < 6 and (last_push is None or age > timedelta(hours=6)):
        return "sleeping", "past midnight IST and quiet - cat is asleep"
    if age is not None and age <= timedelta(hours=24):
        h = int(age.total_seconds() // 3600)
        return "content", (f"fed by the last push {h}h ago" if h else "fed by a push just now")
    if age is not None and age <= timedelta(hours=96):
        d = age.days
        return "hungry", f"no pushes in {d} day{'s' if d != 1 else ''} - the bowl is empty"
    return "grumpy", "no pushes in 4+ days - the cat has turned its back on you"