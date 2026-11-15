"use client";

// In-engine cutscenes: a tiny timed scene player plus the intro and win-outro
// stories. Everything is drawn with the game's own pixel art (no video files).
// Cutscenes are presentation only: they never change mission state.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { MEMORIAL_PHOTO, MEMORIAL_TEXT } from "@/data/memorial";
import { computeScore, ENDING_TEXT, gradeFor } from "@/game/scoring";
import type { MissionState } from "@/game/types";
import { playSound, setMusicSilenced, stopAllSfx, type SoundName } from "@/lib/sound";
import { LaikaFrames } from "./LaikaSprite";
import { MarsBackdrop } from "./PixelMarsOutpost";
import { C, ModuleArt, px, type Px } from "./pixel/moduleArt";
import { gridRects, outlined } from "./pixel/PixelSprite";
import { patchGrid, type GearItem, type Grid, type LaikaVariant } from "./pixel/sprites";

const W = 320;
const H = 180;

interface Scene {
  ms: number;
  caption: string;
  /** Sound cue when the scene starts, with an optional delay. */
  sound?: [SoundName, number?][];
  art: ReactElement;
  /** HTML content instead of pixel art (used for the real photograph). */
  html?: ReactElement;
  /** No background music during this scene. */
  silence?: boolean;
  /** Plain black screen and no caption bar (memorial). */
  black?: boolean;
}

// ---------- shared pixel art ----------
function disc(cx: number, cy: number, r: number, fill: string): Px[] {
  const out: Px[] = [];
  for (let y = -r; y < r; y++) {
    const half = Math.round(Math.sqrt(r * r - (y + 0.5) * (y + 0.5)));
    if (half > 0) out.push([cx - half, cy + y, half * 2, 1, fill]);
  }
  return out;
}

function scatter(count: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(s / 0x7fffffff);
  }
  return out;
}

const SPACE: Px[] = (() => {
  const a: Px[] = [[0, 0, W, H, "#0b1020"]];
  const r = scatter(180, 41);
  for (let i = 0; i < 90; i += 2) a.push([Math.floor(r[i] * W), Math.floor(r[i + 1] * H), 1, 1, i % 12 === 0 ? C.yellow : C.cream]);
  return a;
})();

function earth(cx: number, cy: number, r: number): Px[] {
  const u = (n: number) => Math.round(n * r);
  return [
    ...disc(cx, cy, r, C.blue),
    [cx - u(0.55), cy - u(0.35), u(0.4), u(0.3), C.green],
    [cx + u(0.05), cy - u(0.6), u(0.35), u(0.22), C.green],
    [cx - u(0.05), cy + u(0.05), u(0.5), u(0.32), C.green],
    [cx - u(0.6), cy + u(0.3), u(0.28), u(0.2), C.greenD],
    [cx + u(0.2), cy - u(0.2), u(0.3), u(0.08), C.white],
    [cx - u(0.4), cy + u(0.55), u(0.45), u(0.08), C.white],
  ];
}

function mars(cx: number, cy: number, r: number): Px[] {
  const u = (n: number) => Math.round(n * r);
  return [
    ...disc(cx, cy, r, C.rust),
    [cx - u(0.5), cy - u(0.2), u(0.5), u(0.25), "#8a3f33"],
    [cx + u(0.1), cy + u(0.2), u(0.45), u(0.2), "#8a3f33"],
    [cx - u(0.2), cy - u(0.6), u(0.5), u(0.12), C.sand],
    [cx - u(0.25), cy - u(0.92), u(0.5), u(0.1), C.cream],
  ];
}

/** The little capsule, 40 wide × 24 tall, drawn from its top-left corner. */
const CAPSULE: Px[] = [
  [-9, 3, 10, 1, C.steel],
  [-9, 20, 10, 1, C.steel],
  [0, 4, 28, 16, C.out],
  [1, 5, 26, 14, C.suit],
  [1, 14, 26, 5, C.suitShade],
  [1, 12, 26, 1, C.red],
  [28, 6, 3, 12, C.out],
  [28, 7, 2, 10, C.steelL],
  [31, 9, 2, 6, C.out],
  [31, 10, 1, 4, C.steel],
  [17, 6, 7, 6, C.out],
  [18, 7, 5, 4, C.water],
  [18, 7, 2, 1, C.white],
];

/** Return rocket, 24 wide × 40 tall. */
export const ROCKET: Px[] = [
  [10, 0, 4, 2, C.red],
  [8, 2, 8, 3, C.red],
  [6, 5, 12, 4, C.red],
  [4, 9, 16, 25, C.out],
  [5, 9, 14, 24, C.cream],
  [15, 9, 4, 24, C.shade],
  [8, 13, 8, 8, C.steelD],
  [9, 14, 6, 6, C.water],
  [10, 15, 2, 2, C.white],
  [5, 25, 14, 2, C.red],
  [9, 28, 6, 5, C.steelD],
  [1, 22, 4, 4, C.red],
  [0, 26, 5, 11, C.red],
  [19, 22, 4, 4, C.red],
  [19, 26, 5, 11, C.red],
  [6, 33, 12, 3, C.steelL],
  [8, 36, 8, 4, C.steel],
];
const FLAME: Px[] = [
  [8, 40, 8, 3, C.yellow],
  [9, 43, 6, 3, C.orange],
  [10, 46, 4, 2, C.red],
];

function Laika({ x, y, scale, mood, gear = [], className }: { x: number; y: number; scale: number; mood: LaikaVariant; gear?: GearItem[]; className?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={className}>
        <LaikaFrames mood={mood} gear={gear} />
      </g>
    </g>
  );
}

function Text({ x, y, size, children, className = "", fill }: { x: number; y: number; size: number; children: string; className?: string; fill?: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className={`cut-text ${className}`} style={{ fontSize: size, fill }}>
      {children}
    </text>
  );
}

/** Inside the capsule: walls, a round porthole, blinking lights and the name plate. */
function CapsuleInterior({ mood, view }: { mood: LaikaVariant; view: ReactElement }) {
  return (
    <g>
      {px(
        [
          [0, 0, W, H, "#27334C"],
          [0, 0, W, 14, "#1c2440"],
          [0, 150, W, 30, "#1c2440"],
          [0, 14, W, 2, C.steel],
          [0, 148, W, 2, C.steel],
          [60, 16, 2, 132, "#1c2440"],
          [150, 16, 2, 132, "#1c2440"],
          [300, 16, 2, 132, "#1c2440"],
          ...disc(238, 76, 40, C.out),
          ...disc(238, 76, 38, C.steelL),
          ...disc(238, 76, 33, C.out),
          ...disc(238, 76, 31, "#0b1020"),
        ],
        "cap",
      )}
      <g clipPath="url(#porthole)">{view}</g>
      {px(
        [
          [205, 44, 3, 3, C.steelD],
          [268, 44, 3, 3, C.steelD],
          [205, 106, 3, 3, C.steelD],
          [268, 106, 3, 3, C.steelD],
          // control panel
          [14, 104, 40, 40, C.out],
          [15, 105, 38, 38, C.steelD],
          [18, 108, 32, 12, "#0b1020"],
          // seat
          [84, 142, 64, 8, C.steelD],
          [84, 142, 64, 2, C.steel],
          // name plate
          [14, 24, 92, 20, C.out],
          [15, 25, 90, 18, C.cream],
        ],
        "cap2",
      )}
      <rect x={20} y={110} width={6} height={3} fill={C.mint} className="blink-slow" />
      <rect x={29} y={110} width={6} height={3} fill={C.yellow} className="blink" />
      <rect x={38} y={110} width={6} height={3} fill={C.red} className="blink-slow" />
      {px(
        [
          [18, 124, 8, 6, C.red],
          [29, 124, 8, 6, C.yellow],
          [40, 124, 8, 6, C.mint],
          [18, 133, 30, 4, C.steel],
        ],
        "btns",
      )}
      <text x={60} y={38} textAnchor="middle" className="cut-plate">
        SPUTNIK 2
      </text>
      <Laika x={77} y={66} scale={3} mood={mood} className={mood === "concerned" ? "cut-shiver" : "laika-bob"} />
    </g>
  );
}

const EARTH_LAND: Px[] = [
  [0, 0, W, 60, "#6fb1f5"],
  [0, 60, W, 40, "#9fd0fb"],
  [0, 100, W, 20, "#d6f5fb"],
  ...disc(60, 40, 12, C.yellow),
  [200, 30, 40, 6, C.white],
  [210, 24, 22, 6, C.white],
  [90, 50, 30, 5, C.white],
  ...disc(70, 150, 60, C.greenD),
  ...disc(250, 160, 80, C.greenD),
  [0, 120, W, 60, C.green],
  [0, 120, W, 3, "#81C995"],
  [30, 140, 3, 3, C.yellow],
  [120, 160, 3, 3, C.red],
  [280, 150, 3, 3, C.yellow],
  [220, 168, 3, 3, C.white],
];

// ---------- scene lists ----------
function introScenes(): Scene[] {
  return [
    {
      ms: 3500,
      caption: "1957. A little dog begins an extraordinary journey...",
      art: <CapsuleInterior mood="concerned" view={<g>{px(earth(238, 120, 44), "e")}</g>} />,
    },
    {
      ms: 3000,
      caption: "But this time, her story takes a different turn.",
      sound: [["whoosh", 200]],
      art: (
        <g>
          {px(SPACE, "sp")}
          {px(earth(64, 150, 62), "e")}
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={110 + i * 13} y={Math.round(116 - i * 6.2)} width={5} height={2} fill={C.yellow} fillOpacity={0.8} />
          ))}
          <g className="cut-fly-out">
            <g transform="translate(96 104) rotate(-25)">{px(CAPSULE, "c")}</g>
          </g>
        </g>
      ),
    },
    {
      ms: 3000,
      caption: "Far from home, a new world awaits...",
      art: (
        <CapsuleInterior
          mood="idle"
          view={
            <g className="cut-shrink" style={{ transformOrigin: "238px 76px" }}>
              {px(earth(238, 76, 26), "e")}
            </g>
          }
        />
      ),
    },
    {
      ms: 2000,
      caption: "Mars!",
      sound: [["tutorial", 100]],
      art: (
        <g>
          {px(SPACE, "sp")}
          <g className="cut-grow" style={{ transformOrigin: "160px 90px" }}>
            {px(mars(160, 90, 62), "m")}
          </g>
        </g>
      ),
    },
    {
      ms: 3500,
      caption: "A bumpy landing!",
      sound: [["boom", 1500]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <g className="cut-fall">
            <g transform="translate(150 118) rotate(20)">{px(CAPSULE, "c")}</g>
          </g>
          <g className="cut-boom">
            {px(
              [
                ...disc(140, 138, 14, C.sand),
                ...disc(168, 132, 18, "#e6a36a"),
                ...disc(196, 140, 13, C.sand),
                ...disc(156, 122, 10, C.cream),
                ...disc(182, 120, 8, C.cream),
              ],
              "d",
            )}
            <Text x={168} y={100} size={16} fill={C.yellow}>
              BUMP!
            </Text>
          </g>
        </g>
      ),
    },
    {
      ms: 3000,
      caption: "One small dog. One enormous mission.",
      sound: [["woof", 700]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <g transform="translate(176 114) rotate(-10) scale(1.6)">
            {px(CAPSULE, "c")}
            <text x={9} y={10.2} className="cut-plate" style={{ fontSize: 3 }}>
              SPUTNIK 2
            </text>
          </g>
          {px([...disc(170, 160, 6, C.sand), ...disc(236, 162, 5, C.sand)], "dust")}
          <Laika x={100} y={108} scale={1.8} mood="idle" className="cut-step-out" />
        </g>
      ),
    },
    {
      ms: 2000,
      caption: "A made-up story. The real Laika flew in 1957 and did not come home.",
      sound: [["sol", 0]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <rect x={0} y={0} width={W} height={H} fill="#0b1020" fillOpacity={0.45} />
          <Text x={160} y={84} size={46} className="cut-title">
            LAIKA
          </Text>
          <Text x={160} y={108} size={13} fill={C.yellow}>
            MISSION RED PLANET
          </Text>
        </g>
      ),
    },
  ];
}

// ---------- characters for the endings (original pixel art) ----------
/** Rescue astronaut, front view, 14×22. Same suit colours as Laika's. */
const ASTRO_STAND: Grid = [
  "....HHHHHH....",
  "...HSSSSSSH...",
  "..HSCCCCCCSH..",
  "..HSCZZCCCSH..",
  "..HSCCCCCCSH..",
  "..HSSCCCCSSH..",
  "...HSSSSSSH...",
  "....RRRRRR....",
  "..SSSSSSSSSS..",
  ".SSSSYYYYSSSS.",
  ".SSSSYRRYSSSS.",
  "SSDSSYYYYSSDSS",
  "SSDSSSSSSSSDSS",
  "SS.SSSSSSSS.SS",
  "YY.RRRRRRRR.YY",
  "...SSSSSSSS...",
  "...SSSS.SSSS..",
  "...SSSS.SSSS..",
  "...SSSS.SSSS..",
  "...DDDD.DDDD..",
  "..YYYYY.YYYYY.",
  "..YYYYY.YYYYY.",
];
const ASTRO_STRIDE: Grid = patchGrid(ASTRO_STAND, [
  [16, 0, "..SSSS..SSSS.."],
  [17, 0, "..SSSS..SSSS.."],
  [18, 0, ".SSSS....SSSS."],
  [19, 0, ".DDDD....DDDD."],
  [20, 0, "YYYYY....YYYYY"],
  [21, 0, "YYYYY....YYYYY"],
]);
/** Kneeling: the same astronaut, lower, reaching out. */
const ASTRO_KNEEL: Grid = [
  "..............",
  "..............",
  "..............",
  "..............",
  ...ASTRO_STAND.slice(0, 13),
  "SS.SSSSSSSS.SSYY",
  "YY.RRRRRRRR...YY",
  "..SSSSSSSSS...",
  "..SSSSSSSSS...",
  "..DDDDD.YYYYY.",
].map((r) => r.slice(0, 14).padEnd(14, "."));

function Astronaut({ x, y, scale = 1.6, pose = "stand" }: { x: number; y: number; scale?: number; pose?: "stand" | "walk" | "kneel" }) {
  const a = pose === "kneel" ? ASTRO_KNEEL : ASTRO_STAND;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      {pose === "walk" ? (
        <g className="laika laika-walk">
          <g className="laika-frame-a">{gridRects(outlined(ASTRO_STAND), "aa")}</g>
          <g className="laika-frame-b">{gridRects(outlined(ASTRO_STRIDE), "ab")}</g>
        </g>
      ) : (
        gridRects(outlined(a), "as")
      )}
    </g>
  );
}

/** Laika at home, without her suit, asleep: 30×10, profile, curled up. */
const LAIKA_SLEEP: Grid = [
  "....BB..BB....................",
  "...BOOBBOOB...................",
  "...OOOOOOOO..........OOOO.....",
  "..OOONNOOOOO.....OOOOOOOOOO...",
  ".OOOOOOOWWWOOOOOOOOOOOOOOOOO..",
  "NWWOOOOWWWWWWOOOOOOOOOOOOOOOW.",
  "WWWWWOWWWWWWWWWOOOOOOOOOOOOWWW",
  ".WWWWWWWWWWWWWWWWOOOOOOOOOWWW.",
  "..WWWWW.WWWWWWWWWWWWWWWWWWWW..",
  "...WWW...WWWW......WWW..WWW...",
];

/** Simple cheering person: head, hair, shirt, arms (two frames: down / up). */
function Person({ x, y, shirt, skin, hair, cheer = true, delay = 0 }: { x: number; y: number; shirt: string; skin: string; hair: string; cheer?: boolean; delay?: number }) {
  const body: Px[] = [
    [2, 0, 5, 2, hair],
    [2, 2, 5, 4, skin],
    [1, 6, 7, 7, shirt],
    [2, 13, 2, 5, C.navy],
    [5, 13, 2, 5, C.navy],
  ];
  const down: Px[] = [[0, 7, 1, 5, skin], [8, 7, 1, 5, skin]];
  const up: Px[] = [[0, 2, 1, 5, skin], [8, 2, 1, 5, skin]];
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      {px([[1, -1, 7, 1, C.out], [0, 6, 9, 1, C.out], ...body], "pb")}
      {cheer ? (
        <g className="laika" style={{ animationDelay: `${delay}s` }}>
          <g className="laika-frame-a">{px(down, "pd")}</g>
          <g className="laika-frame-b">{px(up, "pu")}</g>
        </g>
      ) : (
        px(down, "pd")
      )}
    </g>
  );
}

const CROWD: { x: number; shirt: string; skin: string; hair: string }[] = [
  { x: 14, shirt: C.red, skin: "#f2c9a0", hair: "#6b3a1e" },
  { x: 30, shirt: C.blue, skin: "#c68a5a", hair: C.out },
  { x: 46, shirt: C.yellow, skin: "#8d5a3b", hair: C.out },
  { x: 62, shirt: C.green, skin: "#f2c9a0", hair: C.yellow },
  { x: 22, shirt: "#9b6fd0", skin: "#e0b088", hair: "#8a4a2b" },
  { x: 54, shirt: C.orange, skin: "#c68a5a", hair: C.out },
  { x: 78, shirt: C.white, skin: "#8d5a3b", hair: "#3b2a22" },
];

/** The Golden Treat Award: a shiny pixel bone. */
function GoldenBone({ x, y, scale = 2 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-label="Golden Treat Award">
      {px(
        [
          [3, 2, 14, 4, C.out],
          [0, 0, 5, 4, C.out], [0, 4, 5, 4, C.out], [15, 0, 5, 4, C.out], [15, 4, 5, 4, C.out],
          [1, 1, 3, 3, C.yellow], [1, 4, 3, 3, C.yellow], [16, 1, 3, 3, C.yellow], [16, 4, 3, 3, C.yellow],
          [4, 3, 12, 2, C.yellow],
          [4, 4, 12, 1, C.orange],
          [2, 1, 1, 1, C.white], [6, 3, 4, 1, C.white],
        ],
        "bone",
      )}
    </g>
  );
}

function Bubble({ x, y, w, lines, tail = "left" }: { x: number; y: number; w: number; lines: string[]; tail?: "left" | "right" }) {
  const h = 8 + lines.length * 9;
  const tx = tail === "left" ? x + 10 : x + w - 16;
  return (
    <g aria-hidden="true">
      {px(
        [
          [x - 1, y - 1, w + 2, h + 2, C.out],
          [x, y, w, h, C.white],
          [tx, y + h, 6, 2, C.out],
          [tx + 1, y + h, 4, 1, C.white],
          [tx + (tail === "left" ? 0 : 3), y + h + 2, 3, 2, C.out],
        ],
        "bub",
      )}
      {lines.map((l, i) => (
        <text key={i} x={x + w / 2} y={y + 10 + i * 9} textAnchor="middle" className="cut-text cut-dark" style={{ fontSize: 7 }}>
          {l}
        </text>
      ))}
    </g>
  );
}

/** Small dust puffs where something lands. */
function LandingDust({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g fill="#e7b98a" aria-hidden="true">
      <g className="cut-dust-l" style={{ animationDelay: `${delay}s` }}>
        <rect x={x - 14} y={y - 4} width={10} height={5} />
        <rect x={x - 22} y={y - 8} width={6} height={4} />
      </g>
      <g className="cut-dust-r" style={{ animationDelay: `${delay}s` }}>
        <rect x={x + 18} y={y - 4} width={10} height={5} />
        <rect x={x + 30} y={y - 8} width={6} height={4} />
      </g>
    </g>
  );
}

/** Moves its children from (dx,dy) to their resting place. Reduced motion shows the resting place. */
function Move({ dx = 0, dy = 0, ms, delay = 0, steps = 16, children }: { dx?: number; dy?: number; ms: number; delay?: number; steps?: number; children: ReactNode }) {
  const style = { "--dx": `${dx}px`, "--dy": `${dy}px`, animationDuration: `${ms}ms`, animationDelay: `${delay}ms`, animationTimingFunction: `steps(${steps}, end)` } as CSSProperties;
  return (
    <g className="cut-move" style={style}>
      {children}
    </g>
  );
}
/** Visible from `at` ms (shown immediately with reduced motion). */
function From({ at, children }: { at: number; children: ReactNode }) {
  return (
    <g className="cut-from" style={{ animationDelay: `${at}ms` }}>
      {children}
    </g>
  );
}
/** Visible until `at` ms (hidden with reduced motion, which shows end states). */
function Until({ at, children }: { at: number; children: ReactNode }) {
  return (
    <g className="cut-until" style={{ animationDelay: `${at}ms` }}>
      {children}
    </g>
  );
}

const ROCKET_DOOR: Px[] = [[9, 18, 6, 9, C.out], [10, 19, 4, 7, C.steelL]];
const ROCKET_DOOR_OPEN: Px[] = [[9, 18, 6, 9, C.out], [10, 19, 4, 7, "#141c32"]];

function MarsOutpostBit() {
  const base = { condition: 100, greenhouseMode: "LOW" as const, cropProgress: 4, charge: 0.8, generation: 28 };
  return (
    <g aria-hidden="true">
      <g transform="translate(14 74)">
        <ModuleArt id="habitat" level={3} {...base} />
      </g>
      <g transform="translate(64 80) scale(0.85)">
        <ModuleArt id="greenhouse" level={3} {...base} />
      </g>
      <g transform="translate(108 84) scale(0.75)">
        <ModuleArt id="solar" level={3} {...base} />
      </g>
    </g>
  );
}

const ENCOURAGE: Record<string, string[]> = {
  "A+": ["Amazing engineering,", "Commander!"],
  A: ["Brilliant work,", "Commander!"],
  B: ["Great job! We made", "a strong outpost."],
  C: ["We made it home!", "Let's aim higher next time."],
  D: ["We made it home!", "Let's practise and try again."],
};

const HOME_ROOM: Px[] = [
  [0, 0, W, 130, "#5b3a4a"],
  [0, 0, W, 8, "#4a2e3c"],
  [0, 130, W, 50, "#8a5a3b"],
  [0, 130, W, 3, "#6b4430"],
  ...Array.from({ length: 8 }, (_, i) => [i * 42, 133, 1, 47, "#7a4e33"] as Px),
  // window with a night sky and the Moon
  [196, 22, 80, 64, C.out],
  [200, 26, 72, 56, "#1c2440"],
  [235, 26, 2, 56, C.out],
  [200, 53, 72, 2, C.out],
  ...disc(256, 40, 7, C.cream),
  [210, 32, 1, 1, C.cream], [222, 66, 1, 1, C.yellow], [248, 70, 1, 1, C.cream], [214, 72, 1, 1, C.cream],
  // warm lamp glow
  [36, 30, 22, 14, C.yellow],
  [40, 44, 14, 3, C.orange],
  [46, 47, 2, 40, C.out],
  [38, 86, 18, 4, C.out],
  // shelf with the Golden Treat Award
  [118, 58, 54, 4, "#6b4430"],
  [120, 62, 3, 6, "#6b4430"], [167, 62, 3, 6, "#6b4430"],
  // sofa with the family in the background
  [22, 92, 92, 24, "#3f6aa8"],
  [18, 86, 100, 10, "#2f528a"],
  [18, 96, 8, 22, "#2f528a"], [110, 96, 8, 22, "#2f528a"],
  // dog bed and food bowl
  [134, 150, 74, 20, C.out],
  [135, 151, 72, 18, C.red],
  [131, 158, 4, 10, C.out], [207, 158, 4, 10, C.out],
  [132, 159, 3, 8, C.red], [207, 159, 3, 8, C.red],
  [139, 156, 64, 10, C.cream],
  [139, 165, 64, 2, "#e7d4b0"],
  [135, 167, 72, 2, "#b33a30"],
  [236, 158, 22, 8, C.out],
  [237, 159, 20, 6, C.blue],
  [240, 157, 14, 3, "#8a4a2b"],
];

function outroScenes(state: MissionState): Scene[] {
  // The result is final: the score is only read here, never recalculated or changed.
  const score = computeScore(state);
  const grade = gradeFor(score.total);
  const tier = state.status === "outstanding" ? "outstanding" : "success";
  const ROCKET_X = 230;
  const ROCKET_Y = 54;
  const rocket = (open = false, flame = false) => (
    <g transform={`translate(${ROCKET_X} ${ROCKET_Y}) scale(1.7)`}>
      {px(ROCKET, "r")}
      {px(open ? ROCKET_DOOR_OPEN : ROCKET_DOOR, "d")}
      {flame && <g className="blink">{px(FLAME, "f")}</g>}
    </g>
  );
  return [
    // 1. Mission complete: a rocket comes down near the outpost; Laika notices it.
    {
      ms: 4000,
      caption: "Sol 10 is done! Look, a rocket is coming down...",
      sound: [["whoosh", 200], ["boom", 2400]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <MarsOutpostBit />
          <Move dy={-170} ms={2400} steps={24}>
            {rocket(false, false)}
          </Move>
          <LandingDust x={ROCKET_X + 20} y={124} delay={2.4} />
          <Until at={2500}>
            <Laika x={150} y={102} scale={1.7} mood="idle" />
          </Until>
          <From at={2500}>
            <Laika x={150} y={102} scale={1.7} mood="alert" />
          </From>
        </g>
      ),
    },
    // 2. The hatch opens and an astronaut steps out: "Laika!"
    {
      ms: 3500,
      caption: "The hatch opens. An astronaut steps out...",
      sound: [["voice", 1300], ["woof", 1900]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <MarsOutpostBit />
          <Until at={300}>{rocket(false)}</Until>
          <From at={300}>{rocket(true)}</From>
          <From at={500}>
            <Move dx={22} dy={-18} ms={700} delay={500} steps={7}>
              <Astronaut x={222} y={88} />
            </Move>
          </From>
          <From at={1300}>
            <Bubble x={196} y={60} w={50} lines={["Laika!"]} tail="right" />
          </From>
          <Until at={1800}>
            <Laika x={150} y={102} scale={1.7} mood="alert" />
          </Until>
          <From at={1800}>
            <Laika x={150} y={102} scale={1.7} mood="celebrate" className="laika-hop" />
          </From>
        </g>
      ),
    },
    // 3. Laika runs to the astronaut, who kneels down: "You made it, Laika. Good job!"
    {
      ms: 4500,
      caption: "“You made it, Laika. Good job!”",
      sound: [["voice", 1700], ["woof", 2300], ["woof", 2800]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <MarsOutpostBit />
          {rocket(true)}
          <Until at={1300}>
            <Astronaut x={222} y={88} />
          </Until>
          <From at={1300}>
            <Astronaut x={222} y={88} pose="kneel" />
          </From>
          <Until at={1400}>
            <Move dx={-60} ms={1400} steps={14}>
              <g transform="translate(184 106) scale(1.6)">
                <g className="laika-run">
                  <LaikaFrames mood="happy" walking />
                </g>
              </g>
            </Move>
          </Until>
          <From at={1400}>
            <Laika x={184} y={106} scale={1.6} mood="celebrate" className="laika-hop" />
          </From>
          <From at={1700}>
            <Bubble x={150} y={44} w={110} lines={["You made it, Laika.", "Good job!"]} tail="right" />
          </From>
        </g>
      ),
    },
    // 4. Together they walk into the rocket, the hatch closes and it lifts off.
    {
      ms: 4000,
      caption: "Together they board the rocket... and lift off for home!",
      sound: [["woof", 300], ["whoosh", 2400]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <MarsOutpostBit />
          <Until at={2400}>
            <Until at={1500}>{rocket(true)}</Until>
            <From at={1500}>{rocket(false)}</From>
          </Until>
          <From at={2400}>
            <g className="cut-launch">{rocket(false, true)}</g>
          </From>
          <Until at={1400}>
            <Move dx={-30} ms={1400} steps={14}>
              <Astronaut x={232} y={88} pose="walk" />
            </Move>
            <Move dx={-56} ms={1400} steps={14}>
              <g transform="translate(206 106) scale(1.6)">
                <LaikaFrames mood="happy" walking />
              </g>
            </Move>
          </Until>
        </g>
      ),
    },
    // 5. Flying back to Earth; the real score categories appear one by one.
    {
      ms: 6000,
      caption: "Flying back to Earth... How did the mission go?",
      sound: score.categories.map((_, i) => ["pop", 600 + i * 750] as [SoundName, number]),
      art: (
        <g>
          {px(SPACE, "sp")}
          {px(mars(18, 150, 34), "m")}
          <g className="cut-grow" style={{ transformOrigin: "296px 40px" }}>
            {px(earth(296, 40, 30), "e")}
          </g>
          <g className="cut-cruise">
            <g transform="translate(120 150) rotate(60) scale(1.2)">
              {px(ROCKET, "r")}
              <g className="blink">{px(FLAME, "f")}</g>
            </g>
          </g>
          <rect x={8} y={8} width={164} height={96} fill={C.out} />
          <rect x={9} y={9} width={162} height={94} fill={C.navy} />
          <Text x={90} y={21} size={8} fill={C.yellow}>
            MISSION REPORT
          </Text>
          {score.categories.map((c, i) => (
            <g key={c.id} className="cut-pop" style={{ animationDelay: `${0.6 + i * 0.75}s` }} data-outro-category={c.id}>
              <text x={14} y={35 + i * 12} className="cut-text" style={{ fontSize: 6.5 }}>
                {c.label}
              </text>
              <text x={166} y={35 + i * 12} textAnchor="end" className="cut-text" style={{ fontSize: 6.5, fill: C.yellow }}>
                {c.score}/{c.max}
              </text>
            </g>
          ))}
        </g>
      ),
    },
    // 6. FINAL MISSION GRADE: a pause, a rising sound, then the real grade.
    {
      ms: 4500,
      caption: ENDING_TEXT[tier].title,
      sound: [["rise", 500], ["pop", 1800], ["woof", 2500]],
      art: (
        <g>
          {px(SPACE, "sp")}
          {px(earth(160, 250, 110), "e")}
          <Text x={160} y={30} size={11}>
            FINAL MISSION GRADE
          </Text>
          <Until at={1800}>
            <rect x={136} y={40} width={48} height={44} fill={C.out} />
            <rect x={138} y={42} width={44} height={40} fill={C.navy} />
            <Text x={160} y={74} size={30} fill={C.steel} className="blink">
              ?
            </Text>
          </Until>
          <From at={1800}>
            <g data-testid="outro-grade" data-grade={grade} data-score={score.total}>
              <Text x={160} y={78} size={44} fill={C.yellow}>
                {grade}
              </Text>
              <Text x={160} y={96} size={10}>
                {`SCORE ${score.total} / 100`}
              </Text>
            </g>
          </From>
          <From at={2400}>
            <Laika x={66} y={112} scale={1.5} mood="celebrate" className="laika-hop" />
            <Bubble x={20} y={84} w={124} lines={ENCOURAGE[grade] ?? ENCOURAGE.C} />
          </From>
        </g>
      ),
    },
    // 7. Landing on Earth: a small crowd is waiting and cheering.
    {
      ms: 4500,
      caption: "Welcome home! A crowd is waiting for Laika.",
      sound: [["boom", 1800], ["cheer", 2300], ["woof", 2700]],
      art: (
        <g>
          {px(EARTH_LAND, "el")}
          <Move dy={-170} ms={1800} steps={18}>
            <g transform="translate(220 54) scale(1.7)">
              <Until at={2000}>{px([...ROCKET, ...ROCKET_DOOR], "r1")}</Until>
              <From at={2000}>{px([...ROCKET, ...ROCKET_DOOR_OPEN], "r2")}</From>
            </g>
          </Move>
          <LandingDust x={240} y={124} delay={1.8} />
          {CROWD.map((p, i) => (
            <Person key={i} x={p.x} y={i > 3 ? 104 : 110} shirt={p.shirt} skin={p.skin} hair={p.hair} delay={i * 0.11} />
          ))}
          <From at={2200}>
            <Move dx={40} dy={-12} ms={900} delay={2200} steps={9}>
              <Laika x={160} y={106} scale={1.6} mood="celebrate" className="laika-hop" />
            </Move>
          </From>
        </g>
      ),
    },
    // 8. The Golden Treat Award.
    {
      ms: 3500,
      caption: "For her courage, Laika gets the Golden Treat Award!",
      sound: [["sparkle", 400], ["woof", 900], ["cheer", 1200]],
      art: (
        <g>
          {px(EARTH_LAND, "el")}
          <g transform="translate(220 54) scale(1.7)">{px([...ROCKET, ...ROCKET_DOOR_OPEN], "r")}</g>
          {CROWD.map((p, i) => (
            <Person key={i} x={p.x} y={i > 3 ? 104 : 110} shirt={p.shirt} skin={p.skin} hair={p.hair} delay={i * 0.11} />
          ))}
          <Laika x={140} y={106} scale={1.6} mood="celebrate" className="laika-hop" />
          <From at={400}>
            <g className="cut-shine">
              <GoldenBone x={138} y={70} scale={2} />
            </g>
            <g fill={C.yellow} className="blink">
              <rect x={132} y={64} width={2} height={2} />
              <rect x={184} y={66} width={2} height={2} />
              <rect x={160} y={58} width={2} height={2} />
              <rect x={128} y={86} width={2} height={2} />
            </g>
          </From>
        </g>
      ),
    },
    // 9. Home at last: Laika asleep in her bed, with her family nearby.
    {
      ms: 4500,
      caption: "In our story, Laika finally has a home and a family who love her.",
      art: (
        <g>
          {px(HOME_ROOM, "room")}
          <Person x={36} y={84} shirt={C.blue} skin="#f2c9a0" hair="#6b3a1e" cheer={false} />
          <Person x={58} y={90} shirt={C.green} skin="#c68a5a" hair={C.out} cheer={false} />
          <Person x={82} y={84} shirt={C.red} skin="#8d5a3b" hair={C.out} cheer={false} />
          <GoldenBone x={126} y={48} scale={1} />
          <g transform="translate(147 141) scale(1.6)">
            <g className="cut-breathe">{gridRects(outlined(LAIKA_SLEEP), "sleep")}</g>
          </g>
          <g className="cut-zzz" aria-hidden="true">
            <Text x={150} y={130} size={9} fill={C.cream}>
              z
            </Text>
            <Text x={158} y={120} size={11} fill={C.cream}>
              Z
            </Text>
          </g>
        </g>
      ),
    },
    // 10. In Loving Memory of Laika (the real photograph). No music.
    {
      ms: MEMORIAL_MS,
      caption: "",
      silence: true,
      black: true,
      html: <MemorialScene />,
      art: <g />,
    },
  ];
}

// ---------- the memorial (moved here from the start of the game) ----------
const MEMORIAL_MS = 5000;
function MemorialScene() {
  const [shown, setShown] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(MEMORIAL_TEXT.length); // reduced motion: the whole line at once
      return;
    }
    let k = 0;
    let iv = 0;
    const start = window.setTimeout(() => {
      iv = window.setInterval(() => {
        k += 1;
        setShown(k);
        // A soft tick on every other letter keeps it quiet.
        if (MEMORIAL_TEXT[k - 1] !== " " && k % 2 === 1) playSound("type");
        if (k >= MEMORIAL_TEXT.length) window.clearInterval(iv);
      }, 85);
    }, 900);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(iv);
    };
  }, []);
  const photo = failed ? null : MEMORIAL_PHOTO;
  return (
    <div className="memorial-scene" data-testid="memorial" role="img" aria-label={MEMORIAL_TEXT}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.src} alt={photo.alt} className="memorial-photo" onError={() => setFailed(true)} />
      )}
      <p className="memorial-text" aria-hidden="true" data-testid="memorial-text">
        {MEMORIAL_TEXT.slice(0, shown)}
        <span className="type-caret">{shown < MEMORIAL_TEXT.length ? "_" : ""}</span>
      </p>
    </div>
  );
}

// ---------- failure: a short, gentle sad scene before the report ----------
function failureScenes(state: MissionState): Scene[] {
  const early = state.status === "failure";
  return [
    {
      ms: 2200,
      caption: early ? "The mission ended early. Laika is flown up to the safe orbiting ship." : "Sol 10 is over, but the base is not ready for the crew yet.",
      silence: true,
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <MarsOutpostBit />
          <Until at={1100}>
            <Laika x={150} y={102} scale={1.7} mood="idle" />
          </Until>
          <From at={1100}>
            <Laika x={150} y={102} scale={1.7} mood="concerned" />
          </From>
          <rect x={0} y={0} width={W} height={H} fill="#0b1020" className="cut-darken" />
        </g>
      ),
    },
    {
      ms: 3000,
      caption: "Laika is sad... but she is safe.",
      silence: true,
      sound: [["whine", 700]],
      art: (
        <g>
          <rect x={0} y={0} width={W} height={H} fill="#141c32" />
          {px(disc(160, 96, 70, "#1c2440"), "glow")}
          <g className="cut-head-down">
            <g transform="translate(97 30) scale(5)">
              <g className="laika-still">
                <LaikaFrames mood="concerned" />
              </g>
            </g>
          </g>
          <g className="cut-tear" fill={C.water}>
            <rect x={136} y={78} width={4} height={6} />
            <rect x={137} y={84} width={2} height={2} />
          </g>
        </g>
      ),
    },
    {
      ms: 2000,
      caption: "Every mission teaches us something. Let's try again.",
      silence: true,
      art: (
        <g>
          <rect x={0} y={0} width={W} height={H} fill="#0b1020" />
          <Laika x={142} y={44} scale={1.4} mood="resting" />
          <Text x={160} y={112} size={10} fill={C.cream}>
            Every mission teaches us something.
          </Text>
          <Text x={160} y={128} size={10} fill={C.yellow}>
            {"Let's try again."}
          </Text>
        </g>
      ),
    },
  ];
}

// ---------- player ----------
interface PlayerProps {
  scenes: Scene[];
  title: string;
  skipLabel: string;
  onDone: () => void;
}

function CutscenePlayer({ scenes, title, skipLabel, onDone }: PlayerProps) {
  const [index, setIndex] = useState(0);
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return; // skip + timer can never both fire onDone
    finished.current = true;
    stopAllSfx(); // skipping silences any whimper, bark or tick still playing
    onDone();
  }, [onDone]);

  const scene = scenes[index];
  useEffect(() => {
    const timers: number[] = [];
    for (const [name, delay = 0] of scenes[index].sound ?? []) {
      timers.push(window.setTimeout(() => playSound(name), delay));
    }
    timers.push(
      window.setTimeout(() => {
        if (index + 1 >= scenes.length) finish();
        else setIndex(index + 1);
      }, scenes[index].ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t)); // skipping cancels pending sounds too
  }, [index, scenes, finish]);

  const next = () => (index + 1 >= scenes.length ? finish() : setIndex(index + 1));
  // Sad scenes and the memorial have no background music.
  const silent = !!scene.silence;
  useEffect(() => {
    setMusicSilenced("cutscene", silent);
  }, [silent]);
  useEffect(() => () => setMusicSilenced("cutscene", false), []);

  return (
    <main className="cutscene" aria-label={title} data-testid="cutscene" data-scene={index} data-black={scene.black ? "true" : undefined}>
      <div className="cutscene-inner">
        <div className="flex items-center justify-between gap-2">
          <span className="flex gap-1" aria-hidden="true">
            {scenes.map((_, i) => (
              <span key={i} style={{ width: 10, height: 10, border: "2px solid #FFF1D0", background: i <= index ? "#F2CA76" : "transparent" }} />
            ))}
          </span>
          <button type="button" className="btn btn-gray" onClick={finish} autoFocus>
            {skipLabel}
          </button>
        </div>
        {scene.html ? (
          <div key={index} className="cutscene-html">
            {scene.html}
          </div>
        ) : (
        <div className="outpost-frame">
          <svg key={index} viewBox={`0 0 ${W} ${H}`} className="outpost-svg cut-scene" shapeRendering="crispEdges" role="img" aria-label={scene.caption}>
            <defs>
              <clipPath id="porthole">
                <circle cx={238} cy={76} r={31} />
              </clipPath>
            </defs>
            {scene.art}
          </svg>
        </div>
        )}
        <div className="panel-dark flex items-center justify-between gap-3 px-3 py-2" hidden={scene.black}>
          <p className="text-[length:calc(15px*var(--ts))] font-bold" aria-live="polite" data-testid="cutscene-caption">
            {scene.caption}
          </p>
          <button type="button" className="btn btn-small" onClick={next} aria-label="Next scene">
            Next ▶
          </button>
        </div>
      </div>
    </main>
  );
}

/** ~20 second fictional journey from Earth to Mars. Shown only for a new mission. */
export function IntroCutscene({ onDone }: { onDone: () => void }) {
  const scenes = useRef(introScenes()).current;
  return <CutscenePlayer scenes={scenes} title="Intro story" skipLabel="Skip Intro" onDone={onDone} />;
}

/** Win-only return trip. Shows the real score categories on the way; leads into the full report. */
export function OutroCutscene({ state, onDone }: { state: MissionState; onDone: () => void }) {
  const scenes = useRef(outroScenes(state)).current;
  return <CutscenePlayer scenes={scenes} title="Mission complete story" skipLabel="Skip Outro" onDone={onDone} />;
}

/** Short, gentle sad scene for an unsuccessful mission; leads into the full report. */
export function FailureCutscene({ state, onDone }: { state: MissionState; onDone: () => void }) {
  const scenes = useRef(failureScenes(state)).current;
  return <CutscenePlayer scenes={scenes} title="Mission ended story" skipLabel="Skip Cutscene" onDone={onDone} />;
}

export const INTRO_TOTAL_MS = introScenes().reduce((sum, s) => sum + s.ms, 0);
export const outroTotalMs = (state: MissionState) => outroScenes(state).reduce((sum, s) => sum + s.ms, 0);
export const failureTotalMs = (state: MissionState) => failureScenes(state).reduce((sum, s) => sum + s.ms, 0);
