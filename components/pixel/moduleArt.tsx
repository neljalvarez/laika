// Original pixel art for the six outpost modules, drawn from rectangles on a
// 48×40 logical grid. Level, condition and operating state change the drawing.
import type { ReactElement } from "react";
import type { GreenhouseMode, ModuleId } from "@/game/types";
import { gridRects } from "./PixelSprite";
import { ICONS } from "./sprites";

export type Px = [x: number, y: number, w: number, h: number, fill: string, opacity?: number];

export const C = {
  out: "#2a1a22",
  cream: "#FFF1D0",
  shade: "#e0cfa8",
  white: "#ffffff",
  suit: "#eef1f6",
  suitShade: "#b9c2d6",
  red: "#e2483d",
  steel: "#66708c",
  steelL: "#9aa6c0",
  steelD: "#3f4963",
  blue: "#2f6fd0",
  blueL: "#6fb1f5",
  water: "#5fb7f0",
  glass: "#8fdcec",
  glassL: "#d6f5fb",
  green: "#4fae5d",
  greenD: "#2f7d45",
  mint: "#81C995",
  yellow: "#F2CA76",
  orange: "#e0903f",
  navy: "#141C32",
  rust: "#A94F36",
  sand: "#D7864E",
  rock: "#542D30",
  soil: "#6b3b2a",
} as const;

export function px(list: Px[], key: string): ReactElement[] {
  return list.map(([x, y, w, h, fill, o], i) => (
    <rect key={`${key}${i}`} x={x} y={y} width={w} height={h} fill={fill} fillOpacity={o ?? 1} />
  ));
}

/** A filled pixel half-circle sitting on baseY. */
export function dome(cx: number, baseY: number, r: number, fill: string): Px[] {
  const out: Px[] = [];
  for (let i = 0; i < r; i++) {
    const dy = r - i - 0.5;
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    out.push([cx - half, baseY - r + i, half * 2, 1, fill]);
  }
  return out;
}

function habitat(level: number): Px[] {
  const a: Px[] = [];
  if (level >= 3) {
    a.push(...dome(41, 36, 8, C.out), ...dome(41, 36, 7, C.cream), [36, 32, 10, 1, C.red], [40, 30, 3, 2, C.yellow]);
  }
  a.push(...dome(23, 36, 21, C.out), ...dome(23, 36, 20, C.cream));
  a.push([5, 31, 36, 5, C.shade], [5, 27, 36, 2, C.red]);
  a.push([13, 19, 6, 1, C.white], [10, 21, 3, 1, C.white], [9, 23, 1, 2, C.white]);
  a.push([15, 18, 1, 9, C.shade], [31, 18, 1, 9, C.shade]);
  a.push([19, 27, 9, 9, C.out], [20, 28, 7, 8, C.steelL], [21, 29, 5, 3, C.blueL], [25, 33, 1, 1, C.out]);
  a.push([8, 30, 6, 4, C.out], [9, 31, 4, 2, level >= 2 ? C.yellow : C.blue], [9, 31, 2, 1, C.blueL]);
  a.push([33, 30, 6, 4, C.out], [34, 31, 4, 2, level >= 2 ? C.yellow : C.blue], [34, 31, 2, 1, C.blueL]);
  a.push([1, 36, 46, 3, C.steel], [1, 36, 46, 1, C.steelL], [1, 39, 46, 1, C.out]);
  if (level === 1) {
    a.push([23, 11, 1, 5, C.steelL], [22, 10, 3, 1, C.red]);
  } else {
    a.push([23, 10, 1, 6, C.steel], [18, 6, 11, 1, C.steelL], [19, 7, 9, 1, C.suit], [21, 8, 5, 1, C.steelL], [22, 9, 3, 1, C.steel], [23, 4, 1, 2, C.red]);
  }
  return a;
}

function solarPanel(x0: number, y0: number, gold: boolean): Px[] {
  const a: Px[] = [];
  for (let i = 0; i < 3; i++) {
    const x = x0 + 2 - i;
    const y = y0 + i * 3;
    a.push([x - 1, y, 15, 3, C.out], [x, y, 13, 3, C.blue], [x, y, 13, 1, C.blueL], [x + 4, y, 1, 3, C.blueL], [x + 8, y, 1, 3, C.blueL]);
  }
  a.push([x0 - 1, y0 + 9, 15, 1, gold ? C.yellow : C.steelL]);
  a.push([x0 + 6, y0 + 10, 2, 7, C.steel], [x0 + 3, y0 + 17, 8, 1, C.steelD]);
  return a;
}

function solar(level: number): Px[] {
  const a: Px[] = [];
  if (level >= 3) a.push(...solarPanel(10, 9, true), ...solarPanel(26, 9, true));
  if (level === 1) a.push(...solarPanel(8, 20, false), ...solarPanel(27, 20, false));
  else a.push(...solarPanel(2, 20, level >= 3), ...solarPanel(18, 20, level >= 3), ...solarPanel(34, 20, level >= 3));
  a.push([1, 38, 46, 1, C.steelD], [1, 39, 46, 1, C.out]);
  return a;
}

function battery(level: number, charge: number): Px[] {
  const lit = Math.max(0, Math.min(4, Math.ceil(charge * 4)));
  const cell = (x: number): Px[] => [
    [x, 21, 9, 16, C.out],
    [x + 1, 22, 7, 14, C.steelL],
    [x + 2, 20, 5, 1, C.steelD],
    [x + 2, 24, 5, 2, charge > 0.66 ? C.mint : C.steelD],
    [x + 2, 28, 5, 2, charge > 0.33 ? C.mint : C.steelD],
    [x + 2, 32, 5, 2, charge > 0.05 ? C.yellow : C.steelD],
  ];
  const a: Px[] = [];
  if (level >= 3) {
    a.push([17, 4, 14, 9, C.out], [18, 5, 12, 7, C.steelL], [20, 7, 3, 3, C.orange], [25, 7, 3, 3, C.orange], [18, 5, 12, 1, C.suit]);
  }
  a.push(...cell(3));
  if (level >= 2) a.push(...cell(36));
  a.push([13, 13, 22, 24, C.out], [14, 14, 20, 22, C.steel], [14, 14, 20, 2, C.steelL], [16, 11, 16, 2, C.steelD]);
  a.push([17, 18, 14, 13, C.navy]);
  a.push([24, 19, 3, 2, C.yellow], [23, 21, 3, 2, C.yellow], [21, 23, 7, 2, C.yellow], [23, 25, 3, 2, C.yellow], [22, 27, 3, 2, C.yellow]);
  for (let i = 0; i < 4; i++) a.push([17 + i * 4, 33, 2, 2, i < lit ? C.mint : C.steelD]);
  a.push([1, 37, 46, 2, C.steelD], [1, 39, 46, 1, C.out]);
  return a;
}

function lifeSupport(level: number): Px[] {
  const a: Px[] = [];
  a.push([5, 27, 10, 1, C.yellow], [5, 28, 10, 3, C.orange], [3, 28, 3, 9, C.orange], [9, 26, 2, 6, C.steel]);
  a.push([33, 27, 10, 1, C.yellow], [33, 28, 10, 3, C.orange], [42, 28, 3, 9, C.orange], [37, 26, 2, 6, C.steel]);
  if (level >= 2) {
    a.push([36, 14, 9, 23, C.out], [37, 15, 7, 21, C.glassL], [37, 22, 7, 14, C.water], [37, 22, 7, 1, C.white], [38, 12, 5, 2, C.steel]);
  }
  if (level >= 3) {
    a.push([3, 14, 9, 23, C.out], [4, 15, 7, 21, C.glassL], [4, 20, 7, 16, C.mint], [4, 20, 7, 1, C.white], [5, 12, 5, 2, C.steel]);
  }
  a.push(...dome(24, 17, 10, C.out), ...dome(24, 17, 9, C.suit));
  a.push([14, 17, 20, 20, C.out], [15, 17, 18, 19, C.suit], [29, 17, 4, 19, C.suitShade]);
  a.push([15, 19, 18, 1, C.steelL], [15, 33, 18, 1, C.steelL]);
  a.push([23, 22, 2, 2, C.water], [22, 24, 4, 2, C.water], [21, 26, 6, 3, C.water], [22, 29, 4, 1, C.water], [22, 26, 1, 2, C.white]);
  a.push([21, 4, 6, 3, C.out], [22, 5, 4, 2, C.blue], [23, 2, 2, 2, C.steelL]);
  a.push([1, 36, 46, 3, C.steelD], [1, 36, 46, 1, C.steel], [1, 39, 46, 1, C.out]);
  return a;
}

function shelter(level: number): Px[] {
  const a: Px[] = [];
  if (level >= 3) {
    a.push(...dome(6, 38, 7, C.rock), ...dome(6, 38, 6, C.rust), ...dome(42, 38, 7, C.rock), ...dome(42, 38, 6, C.rust));
    a.push([3, 34, 3, 1, C.sand], [40, 34, 3, 1, C.sand]);
  }
  const r = level >= 2 ? 20 : 18;
  a.push(...dome(24, 37, r, C.out), ...dome(24, 37, r - 1, level >= 2 ? C.steelD : C.steel));
  if (level >= 2) a.push(...dome(24, 37, 16, C.steel));
  a.push(...dome(24, 37, 13, C.steelL), ...dome(24, 37, 11, C.steel));
  a.push([12, 27, 2, 10, C.steelL], [34, 27, 2, 10, C.steelL], [23, 37 - r + 1, 2, 3, C.steelL]);
  a.push([18, 23, 13, 14, C.out], [19, 24, 11, 13, C.yellow]);
  if (level >= 3) a.push([15, 21, 18, 2, C.steelL], [15, 21, 18, 1, C.suit]);
  a.push([1, 37, 46, 2, C.steelD], [1, 39, 46, 1, C.out]);
  return a;
}

function greenhouse(level: number, mode: GreenhouseMode, crop: number): Px[] {
  const a: Px[] = [];
  a.push(...dome(24, 36, 21, C.out), ...dome(24, 36, 20, C.suit), ...dome(24, 36, 19, C.glass));
  a.push([11, 21, 4, 1, C.glassL], [9, 23, 2, 2, C.glassL], [27, 19, 3, 1, C.glassL]);
  a.push([24, 17, 1, 19, C.suit], [13, 22, 1, 14, C.suit], [35, 22, 1, 14, C.suit], [6, 27, 36, 1, C.suit]);
  const lamp = mode === "OFF" ? C.steelD : C.yellow;
  a.push([15, 24, 8, 1, lamp], [26, 24, 8, 1, lamp]);
  if (mode === "HIGH") a.push([16, 25, 6, 1, C.cream, 0.7], [27, 25, 6, 1, C.cream, 0.7]);
  a.push([5, 33, 38, 3, C.soil]);
  const slots = level >= 3 ? [8, 12, 16, 20, 28, 32, 36, 40] : level === 2 ? [9, 15, 20, 28, 33, 39] : [10, 18, 30, 38];
  const leaf = mode === "OFF" ? C.greenD : C.green;
  for (const x of slots) {
    if (crop <= 0) a.push([x, 32, 1, 1, leaf]);
    else if (crop === 1) a.push([x, 31, 1, 2, C.greenD], [x - 1, 31, 3, 1, leaf]);
    else a.push([x, 29, 1, 4, C.greenD], [x - 1, 29, 3, 2, leaf], [x - 1, 31, 1, 1, leaf], [x + 1, 30, 1, 1, C.red]);
  }
  a.push([2, 36, 44, 3, C.steel], [2, 36, 44, 1, C.steelL], [2, 39, 44, 1, C.out]);
  return a;
}

function damage(condition: number): Px[] {
  const a: Px[] = [];
  if (condition < 70) {
    a.push([13, 25, 1, 2, C.out], [14, 27, 1, 2, C.out], [13, 29, 1, 2, C.out], [15, 29, 1, 1, C.out]);
  }
  if (condition < 40) {
    a.push([33, 23, 1, 2, C.out], [32, 25, 1, 2, C.out], [33, 27, 1, 2, C.out], [34, 27, 2, 1, C.out]);
    a.push([29, 30, 5, 4, C.out], [30, 31, 3, 2, "#8a4a2b"]);
  }
  return a;
}

export interface ModuleArtProps {
  id: ModuleId;
  level: number;
  condition: number;
  greenhouseMode: GreenhouseMode;
  cropProgress: number;
  charge: number;
}

export function ModuleArt({ id, level, condition, greenhouseMode, cropProgress, charge }: ModuleArtProps) {
  let body: Px[];
  switch (id) {
    case "habitat":
      body = habitat(level);
      break;
    case "solar":
      body = solar(level);
      break;
    case "battery":
      body = battery(level, charge);
      break;
    case "lifeSupport":
      body = lifeSupport(level);
      break;
    case "shelter":
      body = shelter(level);
      break;
    case "greenhouse":
      body = greenhouse(level, greenhouseMode, cropProgress);
      break;
  }
  return (
    <g>
      {px(body, "b")}
      {id === "shelter" && <g transform="translate(20 26)">{gridRects(ICONS.radiation, "r")}</g>}
      {px(damage(condition), "d")}
      {condition < 40 && (
        <g className="smoke">
          {px(
            [
              [30, 20, 3, 2, "#3f4963", 0.8],
              [32, 16, 4, 3, "#66708c", 0.7],
              [30, 11, 5, 3, "#9aa6c0", 0.5],
            ],
            "s",
          )}
        </g>
      )}
    </g>
  );
}
