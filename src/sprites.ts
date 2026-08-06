// Hand-crafted pixel grids for the cat - mochi style per owner reference:
// solid blob body, SHORT ears with pink insides, full-width blue collar band,
// dot eyes, single nose pixel, rounded uniform silhouette.
// "." = empty, "X" = body, "p" = pink nose. Eyes/ears/collar/whiskers/brows
// are coordinate overlays so the renderer can recolour and animate them.

// ---------------- banner cat: sitting front view (20 wide x 16 tall)
export const SIT_FRONT = [
    "....................",
    "....XX......XX....",
    "..XXXX........XXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXoXXXXXXXXoXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXpXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "..XXXXXXXXXXXXXXXX..",
    "...XXX..XXXX..XXX...",
];

export const SIT_EYES: Array<[number, number]> = [[5, 5], [14, 5]];
export const SIT_WHISKERS: Array<[number, number]> = [[1, 6], [1, 7], [18, 6], [18, 7]];
// angry brows for the grumpy state (drawn in accent, above the eyes)
export const SIT_BROWS: Array<[number, number]> = [[4, 4], [5, 4], [14, 4], [15, 4]];

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

// ---------------- graph kitty: small front mochi, solid fill (16 x 14)
export const FRONT_BODY = [
    "................",
    "..XX........XX..",
    "..XXXX....XXXX..",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "..XXoXXXXXXoXX..",
    "..XXXXXXXXXXXX..",
    "..XXXXXppXXXXX..",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXX.",
    ".XXX..XXXX..XXX.",
];
export const FRONT_EYES: Array<[number, number]> = [[5, 5], [10, 5]];
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
// raised-paw wave beside the right ear (shown while the cat is home)
export const PAW_WAVE: Array<[number, number]> = [[18, 4], [19, 3], [19, 4]];

// head/body split for animations (row ranges of SIT_FRONT; collar stays put)
export const SIT_HEAD_ROWS: [number, number] = [0, 9];
export const SIT_BODY_ROWS: [number, number] = [10, 15];

// colour accents: pink inner ears + GitHub-blue collar with green tag
export const SIT_INNER_EARS: Array<[number, number]> = [[3, 2], [4, 2], [13, 2], [14, 2]];
export const FRONT_INNER_EARS: Array<[number, number]> = [[3, 2], [4, 2], [11, 2], [12, 2]];
export const SIT_COLLAR_BAND: Array<[number, number]> = Array.from({ length: 16 }, (_, i) => [i + 2, 10] as [number, number]);
export const SIT_COLLAR_TAG: Array<[number, number]> = [[9, 11], [10, 11]];
export const FRONT_COLLAR_BAND: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [i + 2, 10] as [number, number]);
export const FRONT_COLLAR_TAG: Array<[number, number]> = [[7, 11], [8, 11]];