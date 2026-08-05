"""Fetch the real contribution calendar via GitHub GraphQL (needs a token).
Returns list of {date, count} or None on failure."""
import json
import ssl
import urllib.request

QUERY = """{
  user(login: "prsdx") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}"""


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def fetch_calendar(token):
    if not token:
        return None
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": QUERY}).encode("utf-8"),
        headers={"Authorization": f"bearer {token}", "User-Agent": "github-pet"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20, context=_ssl_context()) as resp:
            data = json.load(resp)
        cal = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]
        days = []
        for week in cal["weeks"]:
            for d in week["contributionDays"]:
                days.append({"date": d["date"], "count": d["contributionCount"]})
        return {"total": cal["totalContributions"], "days": days}
    except Exception:
        return None