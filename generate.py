"""github-pet generator: builds dist/*.svg from live GitHub data.

Merged architecture:
- state machine (pet/state.py) fed by public events (REST) + GraphQL activity
- real contribution calendar via GraphQL (pet/graph_api.py)
- banner scene: the cat lives a little daily routine (pet/render.py)
- hero visual: mochi kitty hopping along the contribution graph (pet/graph_render.py)
- language chart from real repo language bytes (pet/charts.py)
"""
from __future__ import annotations

import os
import pathlib

from pet.github_api import fetch_events, fetch_repos, fetch_languages
from pet.state import decide
from pet import charts, graph_api
from pet.graph_render import build_graph_svg
from pet.render import build_svg, PALETTES

USER = os.environ.get("PET_USER", "prsdx")


def main() -> None:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("PET_GITHUB_TOKEN")
    events = fetch_events(USER)
    repos = fetch_repos(USER)
    langs = fetch_languages(USER, repos)
    calendar = graph_api.fetch_calendar(token, USER)
    activity = graph_api.fetch_activity(token, USER) or {}
    status = decide(events, activity=activity)

    dist = pathlib.Path("dist")
    dist.mkdir(exist_ok=True)
    outputs = {
        "pet.svg": build_svg(status.state, status.caption, "dark"),
        "pet-light.svg": build_svg(status.state, status.caption, "light"),
        "graph.svg": build_graph_svg(status.state, status.caption, calendar, "dark"),
        "graph-light.svg": build_graph_svg(status.state, status.caption, calendar, "light"),
        "langs.svg": charts.langs_chart(langs, len(repos), PALETTES["dark"]),
        "langs-light.svg": charts.langs_chart(langs, len(repos), PALETTES["light"]),
    }
    for name, svg in outputs.items():
        (dist / name).write_text(svg, encoding="utf-8")
        print(f"wrote dist/{name} ({len(svg)} bytes)")
    cal = f"{calendar['total']} contributions" if calendar else "unavailable"
    print(f"state={status.state} | caption={status.caption!r} | api_ok={status.api_ok}")
    print(f"calendar={cal} | last_push={activity.get('last_push')} | events={len(events)} repos={len(repos)} langs={len(langs)}")


if __name__ == "__main__":
    main()