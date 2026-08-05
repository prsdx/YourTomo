"""Hand-crafted pixel grids - neko-informed: 1px outline style, tall diagonal
ears, omega mouth, long whiskers, thin sweeping tail.
'.' = empty, 'X' = outline/body, 'p' = pink (nose/inner ear).
Eyes and whiskers are declared separately so the renderer can blink/animate them."""

# ---------------- banner cat: sitting front view (20 wide x 16 tall)
SIT_FRONT = [
    "....................",
    "....X..........X....",
    "....X.X......X.X....",
    "....X..X....X..X....",
    "....X...X..X...X....",
    "....X....XX....X....",
    "....X..........X....",
    "....X..........X....",
    "....X....p.....X....",
    "....X.XXX.XXX..X....",
    "....X..........X....",
    ".....X........X.....",
    "......X......X......",
    ".....XX......XX.....",
    "....X.XXXXXXXX.X....",
    "....XXXXXXXXXXXXX...",
]

SIT_EYES = [(6, 7), (13, 7)]
SIT_WHISKERS = [(1, 7), (2, 7), (1, 8), (2, 8), (17, 7), (18, 7), (17, 8), (18, 8)]
# angry brows for the grumpy state (drawn in accent, angled toward the eyes)
SIT_BROWS = [(5, 6), (6, 6), (13, 6), (14, 6)]

# tail overlays (wag animation swaps these two groups)
TAIL_A = [(16, 15), (17, 15), (18, 15), (19, 15), (19, 14)]          # swept right
TAIL_B = [(19, 15), (19, 14), (19, 13), (18, 13), (18, 12)]          # curl up

# ---------------- sleeping curl (20 x 14)
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

# ---------------- graph kitty: small front mochi (16 wide x 14 tall)
FRONT_BODY = [
    "................",
    "...X........X...",
    "...X.X....X.X...",
    "...X..X..X..X...",
    "...X...XX...X...",
    "...X........X...",
    "...X........X...",
    "...X...pp...X...",
    "...X.XX.XX..X...",
    "...X........X...",
    "....X......X....",
    "....XX....XX....",
    "...X.XXXXXX.X...",
    "...XXXXXXXXXX...",
]
FRONT_EYES = [(5, 6), (10, 6)]
FRONT_WHISKERS = [(1, 6), (1, 7), (14, 6), (14, 7)]

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