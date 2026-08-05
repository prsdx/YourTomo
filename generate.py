"""github-pet generator: builds dist/*.svg from live GitHub data."""
from __future__ import annotations

import os
import pathlib

from pet.github_api import fetch_events, fetch_repos, fetch_languages
from pet.state import decide
from pet import render, charts, graph_api, graph_render

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
        "graph.svg": graph_render.build_graph_svg(status.state, status.caption, calendar, "dark"),
        "graph-light.svg": graph_render.build_graph_svg(status.state, status.caption, calendar, "light"),
        "pet.svg": render.render(status.state, status.caption, render.DARK),
        "pet-light.svg": render.render(status.state, status.caption, render.LIGHT),
        "langs.svg": charts.langs_chart(langs, len(repos), render.DARK),
        "langs-light.svg": charts.langs_chart(langs, len(repos), render.LIGHT),
    }
    for name, svg in outputs.items():
        (dist / name).write_text(svg, encoding="utf-8")
        print(f"wrote dist/{name} ({len(svg)} bytes)")
    cal = f"{calendar['total']} contributions" if calendar else "unavailable"
    lp = activity.get("last_push") if activity else None
    print(f"state={status.state} | caption={status.caption!r} | api_ok={status.api_ok}")
    print(f"calendar={cal} | last_push={lp} | events={len(events)} repos={len(repos)} langs={len(langs)}")


if __name__ == "__main__":
    main()