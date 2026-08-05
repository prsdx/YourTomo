"""Fetch GitHub data. Stdlib only - zero pip installs in CI.

SSL note: some machines (corp proxies / missing CA store) fail cert
verification with the default context, so we prefer certifi when present.
Token note: fine-grained tokens 403 on user-level REST endpoints, so public
endpoints are retried unauthenticated.
"""
from __future__ import annotations

import json
import os
import ssl
import urllib.request

API = "https://api.github.com"


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def _token() -> str | None:
    return os.environ.get("GITHUB_TOKEN") or os.environ.get("PET_GITHUB_TOKEN")


def _get(path: str, auth: bool = True):
    headers = {"User-Agent": "github-pet", "Accept": "application/vnd.github+json"}
    if auth and _token():
        headers["Authorization"] = f"Bearer {_token()}"
    req = urllib.request.Request(API + path, headers=headers)
    with urllib.request.urlopen(req, timeout=20, context=_ssl_context()) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_events(user: str) -> list:
    """Up to 100 most recent public events. Empty list on any failure."""
    for auth in (True, False):
        try:
            data = _get(f"/users/{user}/events/public?per_page=100", auth=auth)
            if isinstance(data, list):
                return data
        except Exception:
            continue
    return []


def fetch_repos(user: str) -> list:
    """Public, non-fork repos owned by user (for the language chart)."""
    attempts = []
    if _token():
        attempts.append(("/user/repos?per_page=100&affiliation=owner&visibility=public", True))
    attempts.append((f"/users/{user}/repos?per_page=100&type=owner", False))
    for path, auth in attempts:
        try:
            data = _get(path, auth=auth)
            if isinstance(data, list):
                return [r for r in data if not r.get("fork")]
        except Exception:
            continue
    return []


def fetch_languages(user: str, repos: list) -> dict:
    """Aggregate language bytes across the 25 most recently pushed repos."""
    totals: dict = {}
    for repo in repos[:25]:
        for auth in (True, False):
            try:
                langs = _get(f"/repos/{user}/{repo['name']}/languages", auth=auth)
                for lang, b in langs.items():
                    totals[lang] = totals.get(lang, 0) + int(b)
                break
            except Exception:
                continue
    return totals