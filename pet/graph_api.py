"""GitHub GraphQL fetches (token required). Stdlib only.

GraphQL works with fine-grained tokens for these queries, unlike some
user-level REST endpoints - so this is the reliable channel in CI.
"""
from __future__ import annotations

import json
import os
import ssl
import urllib.request
from datetime import datetime, timedelta, timezone

CALENDAR_QUERY = """{
  user(login: \"%s\") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}"""

ACTIVITY_QUERY = """{
  user(login: \"%s\") {
    repositories(first: 15, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes { pushedAt }
    }
    pullRequests(first: 10, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { mergedAt }
    }
  }
}"""


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def _post(query: str, token: str):
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": query}).encode("utf-8"),
        headers={"Authorization": f"bearer {token}", "User-Agent": "github-pet"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20, context=_ssl_context()) as resp:
        payload = json.load(resp)
    if not isinstance(payload, dict) or "data" not in payload:
        return None
    return payload["data"]


def _parse_ts(s: str):
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def fetch_calendar(token: str, user: str = "prsdx"):
    """Real contribution calendar: {total, days:[{date, count}]} or None."""
    if not token:
        return None
    try:
        data = _post(CALENDAR_QUERY % user, token)
        cal = data["user"]["contributionsCollection"]["contributionCalendar"]
        days = []
        for week in cal["weeks"]:
            for d in week["contributionDays"]:
                days.append({"date": d["date"], "count": d["contributionCount"]})
        return {"total": cal["totalContributions"], "days": days}
    except Exception:
        return None


def fetch_activity(token: str, user: str = "prsdx"):
    """{last_push: datetime|None, merged_24h: int} or None. Works where REST fails."""
    if not token:
        return None
    try:
        data = _post(ACTIVITY_QUERY % user, token)
        u = data["user"]
        pushed = [_parse_ts(n["pushedAt"]) for n in u["repositories"]["nodes"] if n.get("pushedAt")]
        pushed = [t for t in pushed if t]
        now = datetime.now(timezone.utc)
        merged = 0
        for n in u["pullRequests"]["nodes"]:
            t = _parse_ts(n.get("mergedAt") or "")
            if t and now - t <= timedelta(hours=24):
                merged += 1
        return {"last_push": max(pushed) if pushed else None, "merged_24h": merged}
    except Exception:
        return None