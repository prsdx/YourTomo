// Hand-crafted pixel grids for the cat - mochi style: solid blob body,
// big rounded head, pink inner ears, blue collar (the design owner approved).
// "." = empty, "X" = body, "p" = pink nose. Eyes/ears/collar/whiskers/brows
// are coordinate overlays so the renderer can recolour and animate them.

// ---------------- banner cat: sitting front view (20 wide x 16 tall)
export const SIT_FRONT = [
    "....................",
    "....XX........XX....",
    "...XXXX......XXXX...",
    "...XXXXXXXXXXXXXX...",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXpXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "...XXXXXXXXXXXXXX...",
    "...XXXXXXXXXXXXXX...",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXXXXXX.",
    ".XXX...XXXXXX...XXX.",
];

export const SIT_EYES: Array<[number, number]> = [[6, 5], [13, 5]];
export const SIT_WHISKERS: Array<[number, number]> = [[1, 6], [1, 7], [18, 6], [18, 7]];
// angry brows for the grumpy state (drawn in accent, above the eyes)
export const SIT_BROWS: Array<[number, number]> = [[5, 4], [6, 4], [13, 4], [14, 4]];

// tail overlays (wag animation swaps these two groups)
export const TAIL_A: Array<[number, number]> = [[17, 15], [18, 15], [19, 15], [19, 14]]; // swept right
export const TAIL_B: Array<[number, number]> = [[19, 15], [19, 14], [19, 13], [18, 13]]; // curl up

// ---------------- sleeping curl (20 x 14)
export const CURL_BODY = [
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
];
export const CURL_LIDS: Array<[number, number]> = [[7, 6], [8, 6], [12, 6], [13, 6]];

// ---------------- graph kitty: small front mochi (16 wide x 14 tall)
export const FRONT_BODY = [
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
];
export const FRONT_EYES: Array<[number, number]> = [[5, 6], [10, 6]];
export const FRONT_WHISKERS: Array<[number, number]> = [[1, 6], [1, 7], [14, 6], [14, 7]];

export const HEART = [
    ".h.h.",
    "hhhhh",
    "hhhhh",
    ".hhh.",
    "..h..",
];

export const BOWL = [
    "............",
    ".XXXXXXXXXX.",
    "..XXXXXXXX..",
    "...XXXXXX...",
    "............",
];

// ---------------- props for the banner scene
export const YARN = [
    "..hh...",
    ".hhhh..",
    "hh.hhh.",
    "hhhh.h.",
    ".hhhh..",
    "..hh...",
];
// tucked/extended paw positions for the yarn bat (in cat grid coords)
export const PAW_TUCKED: Array<[number, number]> = [[14, 11], [15, 11], [14, 12], [15, 12]];
export const PAW_EXTENDED: Array<[number, number]> = [[16, 12], [17, 12], [18, 12], [19, 12], [19, 11]];

// head/body split for animations (row ranges of SIT_FRONT; collar stays put)
export const SIT_HEAD_ROWS: [number, number] = [0, 9];
export const SIT_BODY_ROWS: [number, number] = [10, 15];

// colour accents: pink inner ears + GitHub-blue collar with green tag
export const SIT_INNER_EARS: Array<[number, number]> = [[4, 2], [5, 2], [14, 2], [15, 2]];
export const FRONT_INNER_EARS: Array<[number, number]> = [[4, 2], [11, 2], [4, 3], [5, 3], [10, 3], [11, 3]];
export const SIT_COLLAR_BAND: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [i + 4, 10] as [number, number]);
export const SIT_COLLAR_TAG: Array<[number, number]> = [[9, 11], [10, 11]];
export const FRONT_COLLAR_BAND: Array<[number, number]> = Array.from({ length: 8 }, (_, i) => [i + 4, 11] as [number, number]);
export const FRONT_COLLAR_TAG: Array<[number, number]> = [[7, 12], [8, 12]];