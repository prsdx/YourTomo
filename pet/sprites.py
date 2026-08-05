"""Hand-crafted pixel grids. '.' = transparent, 'X' = body, 'p' = pink accent.
Eye positions are declared separately so the renderer can blink them.
Every row must be exactly 20 characters wide."""

WALK_BODY = [
    "....................",
    "..........X....X....",
    "..........XX..XX....",
    ".........XXXXXXXX...",
    ".........XXXXXXXX...",
    ".........XXXXXXpX...",
    ".........XXXXXXXX...",
    "..X......XXXXXXXX...",
    "..XX..XXXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    "...XXXXXXXXXXXX.....",
    "....................",
    "....................",
]

LEGS_A = [
    "....XX........XX....",
    "....XX........XX....",
]

LEGS_B = [
    ".....XX......XX.....",
    ".....XX......XX.....",
]

WALK_EYES = [(10, 4), (14, 4)]

SIT_BODY = [
    "....................",
    "..........X....X....",
    "..........XX..XX....",
    ".........XXXXXXXX...",
    ".........XXXXXXXX...",
    ".........XXXXXXpX...",
    ".........XXXXXXXX...",
    "..X......XXXXXXXX...",
    "..XXX..XXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    ".XXXXXXXXXXXXXXXX...",
    ".XXXX..........XX...",
    "....................",
]

SIT_EYES = [(10, 4), (14, 4)]

CURL_BODY = [
    "....................",
    ".....X....X.........",
    ".....XX..XX.........",
    "....XXXXXXXX........",
    "...XXXXXXXXXX.......",
    "..XXXXXXXXXXXX......",
    "..XXXXXXXXXXXX......",
    "..XXXXXXXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    "...XXXXXXXXXXXX.....",
    "....XXXXXXXXXX......",
    "....................",
    "....................",
]

# closed-eye dashes for the sleeping curl (drawn in lid colour)
CURL_LIDS = [(7, 6), (8, 6), (12, 6), (13, 6)]

HEART = [
    ".h.h.",
    "hhhhh",
    "hhhhh",
    ".hhh.",
    "..h..",
]