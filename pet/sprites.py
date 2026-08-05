"""Hand-crafted pixel grids. '.' = transparent, 'X' = body, 'p' = pink accent.
Eye positions declared separately so the renderer can blink them."""

# ---- side-view cat (banner) - bigger triangle ears, curled-up tail, slimmer body
WALK_BODY = [
    "....................",
    "..........X....X....",
    "..........XX..XX....",
    ".........XXXXXXXX...",
    ".........XXXXXXXX...",
    ".........XXXXXXpX...",
    ".........XXXXXXXX...",
    "..X......XXXXXXXX...",
    "..X......XXXXXXXX...",
    "..XXX.XXXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    "..XXXXXXXXXXXXXX....",
    "....XXXXXXXXXX......",
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
WALK_WHISKERS = [(17, 4), (17, 5)]  # front of the face, extend right

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

CURL_LIDS = [(7, 6), (8, 6), (12, 6), (13, 6)]

# ---- front-facing mochi kitty (graph version) - big ears, pink inner ear, whiskers
FRONT_BODY = [
    "..X..........X..",
    "..XX........XX..",
    "..XpX......XpX..",
    "..XXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXppXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "................",
]

FRONT_EYES = [(4, 5), (11, 5)]
FRONT_WHISKERS = [(0, 5), (0, 6), (15, 5), (15, 6)]

HEART = [
    ".h.h.",
    "hhhhh",
    "hhhhh",
    ".hhh.",
    "..h..",
]

BOWL = [
    "............",
    ".XXXXXXXXXX.",
    "..XXXXXXXX..",
    "...XXXXXX...",
    "............",
]