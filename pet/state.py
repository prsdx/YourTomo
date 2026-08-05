"""Deterministic state machine: GitHub activity -> pet state.

Priority (first match wins): zoomies > sleeping > content > hungry > grumpy.
Inputs: public events (REST) and/or GraphQL activity - whatever is available.
Every rule maps to real data; nothing is faked.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))  # user is in India


@dataclass
class PetStatus:
    state: str
    caption: str
    api_ok: bool = True


def _pushes(events: list) -> list:
    out = []
    for e in events:
        if e.get("type") == "PushEvent":
            try:
                out.append(datetime.fromisoformat(e["created_at"].replace("Z", "+00:00")))
            except Exception:
                pass
    return sorted(out, reverse=True)


def _merged_prs_last_24h(events: list, now: datetime) -> int:
    n = 0
    for e in events:
        if e.get("type") != "PullRequestEvent":
            continue
        payload = e.get("payload") or {}
        pr = payload.get("pull_request") or {}
        if payload.get("action") == "closed" and pr.get("merged"):
            try:
                when = datetime.fromisoformat(e["created_at"].replace("Z", "+00:00"))
            except Exception:
                continue
            if now - when <= timedelta(hours=24):
                n += 1
    return n


def _fmt_age(delta: timedelta) -> str:
    mins = int(delta.total_seconds() // 60)
    if mins < 60:
        return f"{max(mins, 1)}m"
    hours = mins // 60
    if hours < 48:
        return f"{hours}h"
    return f"{hours // 24}d"


def decide(events: list, activity: dict | None = None, now: datetime | None = None) -> PetStatus:
    now = now or datetime.now(timezone.utc)
    activity = activity or {}

    pushes = _pushes(events)
    pushes_24h = [t for t in pushes if now - t <= timedelta(hours=24)]
    merged = max(_merged_prs_last_24h(events, now), int(activity.get("merged_24h", 0)))
    last_push = pushes[0] if pushes else activity.get("last_push")

    if not pushes and last_push is None and not merged:
        return PetStatus("content", "github api is quiet - pretending everything is fine", api_ok=False)

    if merged or len(pushes_24h) >= 3:
        why = f"{merged} pr merged" if merged else f"{len(pushes_24h)} pushes"
        return PetStatus("zoomies", f"zoomies!! {why} in the last 24h")

    last_age = (now - last_push) if last_push else None
    ist_now = now.astimezone(IST)
    if 0 <= ist_now.hour < 6 and (last_age is None or last_age > timedelta(hours=6)):
        return PetStatus("sleeping", f"sleeping - it is {ist_now:%H:%M} in india right now")

    if last_age is not None and last_age <= timedelta(hours=24):
        return PetStatus("content", f"content - fed by a push {_fmt_age(last_age)} ago")

    if last_age is not None and last_age <= timedelta(hours=96):
        return PetStatus("hungry", f"hungry - no pushes for {_fmt_age(last_age)}")

    if last_age is not None:
        return PetStatus("grumpy", f"grumpy - bowl empty for {_fmt_age(last_age)}")

    return PetStatus("grumpy", "grumpy - no pushes in the last 90 days")