// Original pixel-art sprite data. Each sprite is a grid of palette characters.
// "." is transparent. Art is drawn for this project (no external assets).

export const PALETTE: Record<string, string> = {
  N: "#2a1a22", // outline / eyes / nose
  H: "#7d8fb8", // helmet rim
  G: "#cfe0f7", // helmet glass (drawn translucent)
  L: "#ffffff", // glass highlight
  B: "#8a4a2b", // ears
  O: "#e0903f", // orange fur
  W: "#fff1d0", // cream fur
  P: "#f08a9a", // tongue
  S: "#eef1f6", // suit
  D: "#b9c2d6", // suit shade
  R: "#e2483d", // suit trim / red
  Y: "#66708c", // chest unit / steel
  E: "#f2ca76", // yellow
  Z: "#5fb7f0", // blue
  M: "#81c995", // mint green
  C: "#27334c", // dark blue-gray
};

/** Characters that never receive an automatic outline (effects, glass). */
export const NO_OUTLINE = new Set(["E", "Z"]);
export const TRANSLUCENT = new Set(["G"]);

export type Grid = string[];

type Patch = [row: number, col: number, chars: string];

export function patchGrid(base: Grid, patches: Patch[]): Grid {
  const rows = base.map((r) => r.split(""));
  for (const [row, col, chars] of patches) {
    for (let i = 0; i < chars.length; i++) {
      if (rows[row] && col + i < rows[row].length) rows[row][col + i] = chars[i];
    }
  }
  return rows.map((r) => r.join(""));
}

// 24×24 front view: bubble helmet, brown ears, cream muzzle, suit with red trim.
const LAIKA_BASE: Grid = [
  "........HHHHHHHH........",
  "......HHGGGGGGGGHH......",
  ".....HGGLLGGGGGGGGH.....",
  "....HGGLBBGGGGBBGGGH....",
  "....HGGBBBOOOOBBBGGH....",
  "...HGGGBBOOWWOOBBGGGH...",
  "...HGGGBOOOWWOOOBGGGH...",
  "...HGGGONOOWWOONOGGGH...",
  "...HGGGOOOWWWWOOOGGGH...",
  "...HGGGGWWWNNWWWGGGGH...",
  "....HGGGWWWWWWWWGGGH....",
  "....HGGGGWWWWWWGGGGH....",
  ".....HGGGGGGGGGGGGH.....",
  "......HHGGGGGGGGHH......",
  "......RRHHHHHHHHRR......",
  ".....SSSSSSSSSSSSSS.....",
  "....SSSSSYYYYYYSSSSS....",
  "....SSSSSYRRYYYSSSSS....",
  "....DSSSSYYYYYYSSSSD....",
  "....RRSSSSSSSSSSSSRR....",
  ".....SSSSSSSSSSSSSS.....",
  ".....SSSSS....SSSSS.....",
  ".....RRRRR....RRRRR.....",
  ".....WWWWW....WWWWW.....",
];

const TAIL_UP: Patch[] = [
  [13, 21, "WW"],
  [14, 20, "OOW"],
  [15, 20, "OO"],
  [16, 20, "O"],
];
const TAIL_DOWN: Patch[] = [
  [15, 20, "OOW"],
  [16, 20, "OO"],
  [17, 20, "O"],
];

const HAPPY_FACE: Patch[] = [
  [6, 8, "N"],
  [7, 7, "NON"],
  [6, 15, "N"],
  [7, 14, "NON"],
  [10, 10, "NPPN"],
  [11, 11, "PP"],
];
const CONCERNED_FACE: Patch[] = [
  [7, 8, "O"],
  [8, 8, "N"],
  [7, 15, "O"],
  [8, 15, "N"],
  [6, 8, "N"],
  [6, 15, "N"],
  [5, 9, "B"],
  [5, 14, "B"],
  [11, 11, "NN"],
  [4, 18, "Z"],
  [5, 18, "Z"],
  // Ears droop: remove the ear tips and extend them down the sides of the face.
  [3, 8, "GG"],
  [3, 14, "GG"],
  [7, 7, "B"],
  [7, 16, "B"],
];
const ALERT_FACE: Patch[] = [
  [6, 8, "N"],
  [6, 15, "N"],
  [10, 11, "NN"],
  [0, 20, "EE"],
  [1, 20, "EE"],
  [2, 20, "EE"],
  [4, 20, "EE"],
];
const RESTING_FACE: Patch[] = [
  [7, 7, "NNN"],
  [7, 14, "NNN"],
  [0, 20, "ZZZ"],
  [1, 21, "Z"],
  [2, 20, "ZZZ"],
];
const SPARKLES: Patch[] = [
  [1, 1, "E"],
  [2, 0, "EEE"],
  [3, 1, "E"],
  [0, 22, "E"],
  [1, 21, "EEE"],
  [2, 22, "E"],
  [9, 0, "E"],
  [10, 23, "E"],
];
const BLINK: Patch[] = [
  [7, 8, "O"],
  [8, 8, "N"],
  [7, 15, "O"],
  [8, 15, "N"],
];

export type LaikaVariant = "idle" | "happy" | "concerned" | "alert" | "resting" | "celebrate";

/** Two animation frames per mood (tail wag / blink / sparkle). */
export const LAIKA_FRAMES: Record<LaikaVariant, [Grid, Grid]> = {
  idle: [patchGrid(LAIKA_BASE, TAIL_UP), patchGrid(LAIKA_BASE, TAIL_DOWN)],
  happy: [patchGrid(LAIKA_BASE, [...HAPPY_FACE, ...TAIL_UP]), patchGrid(LAIKA_BASE, [...HAPPY_FACE, ...TAIL_DOWN])],
  concerned: [
    patchGrid(LAIKA_BASE, [...CONCERNED_FACE, ...TAIL_DOWN]),
    patchGrid(LAIKA_BASE, [...CONCERNED_FACE, ...TAIL_DOWN, [4, 18, "G"], [6, 18, "Z"]]),
  ],
  alert: [
    patchGrid(LAIKA_BASE, [...ALERT_FACE, ...TAIL_UP]),
    patchGrid(LAIKA_BASE, [...ALERT_FACE, ...BLINK, [6, 8, "O"], [6, 15, "O"], ...TAIL_UP]),
  ],
  resting: [
    patchGrid(LAIKA_BASE, [...RESTING_FACE, ...TAIL_DOWN]),
    patchGrid(LAIKA_BASE, [...RESTING_FACE, ...TAIL_DOWN, [0, 20, "..."], [2, 20, "..."], [1, 21, "."], [1, 20, "ZZZ"]]),
  ],
  celebrate: [
    patchGrid(LAIKA_BASE, [...HAPPY_FACE, ...TAIL_UP, ...SPARKLES]),
    patchGrid(LAIKA_BASE, [...HAPPY_FACE, ...TAIL_DOWN]),
  ],
};

// Talking: the mouth opens and closes (applied on top of any mood frame).
const MOUTH_OPEN: Patch[] = [
  [10, 10, "NPPN"],
  [11, 11, "PP"],
];
const MOUTH_CLOSED: Patch[] = [
  [10, 10, "WWWW"],
  [11, 11, "WW"],
];
export function talkFrames(frame: Grid): [Grid, Grid] {
  return [patchGrid(frame, MOUTH_OPEN), patchGrid(frame, MOUTH_CLOSED)];
}

// Walk cycle: alternating lifted paws (used only while Laika changes position).
const WALK_LEFT: Patch[] = [
  [21, 5, "RRRRR"],
  [22, 5, "WWWWW"],
  [23, 5, "....."],
];
const WALK_RIGHT: Patch[] = [
  [21, 14, "RRRRR"],
  [22, 14, "WWWWW"],
  [23, 14, "....."],
];
export const LAIKA_WALK_FRAMES: [Grid, Grid] = [
  patchGrid(LAIKA_BASE, [...WALK_LEFT, ...TAIL_UP]),
  patchGrid(LAIKA_BASE, [...WALK_RIGHT, ...TAIL_DOWN]),
];

// ---------------------------------------------------------------------------
// Laika's gear: small cosmetic additions earned by reaching new sols.
// Drawn on top of any mood frame; never changes gameplay.
// ---------------------------------------------------------------------------
export interface GearItem {
  id: string;
  name: string;
  /** Sol that unlocks it. Gear with finale=true needs a successful mission. */
  sol: number;
  finale?: boolean;
  patches: Patch[];
}

export const GEAR: GearItem[] = [
  { id: "patch", name: "Mission patch", sol: 2, patches: [[16, 6, "E"], [17, 5, "EEE"], [18, 6, "E"]] },
  { id: "antenna", name: "Radio antenna", sol: 4, patches: [[0, 5, "R"], [1, 5, "Y"], [2, 5, "Y"]] },
  { id: "boots", name: "Gold moon boots", sol: 6, patches: [[22, 5, "EEEEE"], [22, 14, "EEEEE"]] },
  { id: "jetpack", name: "Mini jetpack", sol: 8, patches: [[15, 2, "YY"], [16, 2, "YY"], [17, 2, "YY"], [18, 2, "RR"], [19, 2, "E."]] },
  { id: "medal", name: "Hero medal", sol: 10, finale: true, patches: [[18, 11, "RR"], [19, 11, "EE"], [20, 11, "EE"]] },
];

/** Gear earned so far: reached sols, plus the medal for a successful mission. */
export function earnedGear(sol: number, missionSuccess: boolean): GearItem[] {
  return GEAR.filter((g) => (g.finale ? missionSuccess : sol >= g.sol));
}

export function withGear(grid: Grid, gear: GearItem[]): Grid {
  return gear.length === 0 ? grid : patchGrid(grid, gear.flatMap((g) => g.patches));
}

export type IconName =
  | "power"
  | "lifeSupport"
  | "materials"
  | "food"
  | "radiation"
  | "warning"
  | "sun"
  | "dust"
  | "gear"
  | "paw"
  | "book"
  | "flask"
  | "star"
  | "bulb";

export const ICONS: Record<IconName, Grid> = {
  power: [
    "....EE...",
    "...EE....",
    "..EE.....",
    ".EEEEEE..",
    "....EE...",
    "...EE....",
    "..EE.....",
    ".EE......",
    ".........",
  ],
  lifeSupport: [
    "....Z....",
    "....Z....",
    "...ZZZ...",
    "...ZZZ...",
    "..ZLZZZ..",
    "..ZLZZZ..",
    "..ZZZZZ..",
    "...ZZZ...",
    ".........",
  ],
  materials: [
    ".........",
    "...DDD...",
    "..DSSSD..",
    ".DDD.DDD.",
    "DSSSDSSSD",
    "DSSSDSSSD",
    "DDDDDDDDD",
    ".........",
    ".........",
  ],
  food: [
    "....M....",
    "..M.MM...",
    "..MMMM.M.",
    "...MMMMM.",
    "....MMM..",
    "....M....",
    "....M....",
    "...BBB...",
    ".........",
  ],
  radiation: [
    "..EEEEE..",
    ".NNEEENN.",
    "ENNNENNNE",
    "EENNENNEE",
    "EEEENEEEE",
    "EEEEEEEEE",
    "EEENNNEEE",
    ".ENNNNNE.",
    "..EEEEE..",
  ],
  warning: [
    "....R....",
    "...RRR...",
    "...RWR...",
    "..RRWRR..",
    "..RRWRR..",
    ".RRRRRRR.",
    ".RRRWRRR.",
    "RRRRRRRRR",
    ".........",
  ],
  sun: [
    "....E....",
    ".E..E..E.",
    "..EEEEE..",
    "..EWWWE..",
    "EEEWWWEEE",
    "..EWWWE..",
    "..EEEEE..",
    ".E..E..E.",
    "....E....",
  ],
  paw: [
    "..WW.WW..",
    "..WW.WW..",
    "WW.....WW",
    "WW.WWW.WW",
    "..WWWWW..",
    ".WWWWWWW.",
    ".WWWWWWW.",
    "..WW.WW..",
    ".........",
  ],
  book: [
    ".........",
    "WWWW.WWWW",
    "WDDW.WDDW",
    "WWWW.WWWW",
    "WDDW.WDDW",
    "WWWW.WWWW",
    "WDDW.WDDW",
    "WWWWWWWWW",
    ".........",
  ],
  flask: [
    "...WWW...",
    "....W....",
    "....W....",
    "...WRW...",
    "...WRW...",
    "..WRRRW..",
    ".WRRRRRW.",
    ".WWWWWWW.",
    ".........",
  ],
  bulb: [
    "..EEEEE..",
    ".EEWWEEE.",
    "EEWEEEEEE",
    "EEEEEEEEE",
    ".EEEEEEE.",
    "..EEEEE..",
    "...YYY...",
    "...YYY...",
    "....Y....",
  ],
  star: [
    "....E....",
    "....E....",
    "...EEE...",
    "EEEEEEEEE",
    ".EEEEEEE.",
    "..EEEEE..",
    "..EE.EE..",
    ".EE...EE.",
    ".........",
  ],
  gear: [
    "...E.E...",
    ".E.EEE.E.",
    "..EEEEE..",
    "EEE...EEE",
    ".EE...EE.",
    "EEE...EEE",
    "..EEEEE..",
    ".E.EEE.E.",
    "...E.E...",
  ],
  dust: [
    ".........",
    "..OOO....",
    ".OOOOO.O.",
    "OOOOOOOO.",
    ".OOOOOOOO",
    "..OO.OOO.",
    "......O..",
    ".O.......",
    ".........",
  ],
};
