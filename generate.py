"""Entrypoint: fetch activity -> compute state -> render dist/pet.svg + dist/pet-light.svg."""
import os

from pet.github_api import fetch_events
from pet.render import build_svg
from pet.state import compute_state


def main():
    events = fetch_events()
    state, why = compute_state(events)
    os.makedirs("dist", exist_ok=True)
    outputs = {"dark": "pet.svg", "light": "pet-light.svg"}
    for palette, filename in outputs.items():
        svg = build_svg(state, why, palette)
        path = os.path.join("dist", filename)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(svg)
        print(f"wrote {path} ({len(svg)} bytes)")
    print(f"state: {state} - {why}")


if __name__ == "__main__":
    main()