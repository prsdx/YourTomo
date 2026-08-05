"""Hand-crafted pixel grids for the cat.

Side-view grids (WALK/SIT/CURL): 16 cols, chars X=body o=eye p=nose T=tail.
Front-view mochi kitty (FRONT_*): 16x14, used by graph_render.py.
"""

_BODY = [
    "................",
    ".........XX.XX..",
    "........XXXXXXX.",
    "........XoXXXoX.",
    "........XXXXpXX.",
    "........XXXXXXX.",
    "......XXXXXXXXX.",
    "...T.XXXXXXXXXX",
    "..TTXXXXXXXXXXX",
    "..TXXXXXXXXXXXX",
    "...XXXXXXXXXXXX",
    "...XXXXXXXXXXXX",
]

_LEGS_A = ["....XX...XX.....", "....XX...XX....."]
_LEGS_B = [".....XX...XX....", ".....XX...XX...."]
_LEGS_SIT = ["....XXXXXXXX....", "....XXXXXXXX...."]

WALK_A = _BODY + _LEGS_A
WALK_B = _BODY + _LEGS_B
SIT = _BODY + _LEGS_SIT

CURL = [
    "................",
    ".....XXXXXX.....",
    "...XXXXXXXXXX...",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "...XXXXXXXXXX...",
    ".....XXXXXXXX...",
    "......XXXX......",
]


def back_view(grid: list) -> list:
    """Flip horizontally and erase the face - cat has turned its back on you."""
    return [row[::-1].replace("o", "X").replace("p", "X") for row in grid]


# ---- front-facing mochi kitty (for graph_render.py) -----------------------
# 16 cols x 14 rows. X = body, p = nose. Eyes/ears/collar/whiskers are drawn
# as coordinate overlays by graph_render so they can be recoloured per palette.

FRONT_BODY = [
    "..XX........XX..",
    "..XXX......XXX..",
    "..XXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXpXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    "..XX..XXXX..XX..",
]

FRONT_EYES = [(4, 5), (11, 5)]
FRONT_INNER_EARS = [(3, 1), (12, 1)]
FRONT_COLLAR_BAND = [(x, 9) for x in range(3, 13)]
FRONT_COLLAR_TAG = [(7, 10), (8, 10)]
FRONT_WHISKERS = [(1, 6), (14, 6), (1, 7), (14, 7)]

HEART = [
    ".h.h.",
    "hhhhh",
    "hhhhh",
    ".hhh.",
    "..h..",
]