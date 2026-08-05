"""Stdlib-only fetch of public GitHub events. No dependencies, no secrets needed.

Note: some local Pythons (e.g. MSYS2) lack CA certificates; if `certifi` is
installed we use it. On GitHub Actions runners the default context just works.
If the fetch fails for any reason we return None and the state machine falls
back to an honest default state - the SVG must never break.
"""
import json
import ssl
import urllib.request

EVENTS_URL = "https://api.github.com/users/prsdx/events/public?per_page=100"


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def fetch_events():
    req = urllib.request.Request(EVENTS_URL, headers={"User-Agent": "github-pet"})
    try:
        with urllib.request.urlopen(req, timeout=15, context=_ssl_context()) as resp:
            return json.load(resp)
    except Exception:
        return None