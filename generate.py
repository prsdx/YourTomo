"""Entrypoint: fetch activity -> compute state -> render all SVG variants."""
import os

from pet.github_api import fetch_events
from pet.graph_api import fetch_calendar
from pet.graph_render import build_graph_svg
from pet.render import build_svg
from pet.state import compute_state


def main():
    events = fetch_events()
    state, why = compute_state(events)
    token = os.environ.get("GITHUB_TOKEN")
    calendar = fetch_calendar(token)

    os.makedirs("dist", exist_ok=True)
    outputs = {
        "pet.svg": build_svg(state, why, "dark"),
        "pet-light.svg": build_svg(state, why, "light"),
        "graph.svg": build_graph_svg(state, why, calendar, "dark"),
        "graph-light.svg": build_graph_svg(state, why, calendar, "light"),
    }
    for filename, svg in outputs.items():
        path = os.path.join("dist", filename)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(svg)
        print(f"wrote {path} ({len(svg)} bytes)")
    print(f"state: {state} - {why}")
    print(f"calendar: {'ok' if calendar else 'unavailable'}")


if __name__ == "__main__":
    main()