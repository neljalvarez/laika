"use client";

// The interactive pixel-art outpost. Everything is drawn on a 320×180 logical
// grid and scaled up with crisp edges. All visuals derive from MissionState.
import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MODULES } from "@/data/modules";
import type { LaikaMood } from "@/data/dialogue";
import { MODULE_IDS, type GreenhouseMode, type ModuleId, type ModuleState, type Weather } from "@/game/types";
import { LaikaFrames } from "./LaikaSprite";
import { C, ModuleArt, dome, px, type Px } from "./pixel/moduleArt";
import { gridRects } from "./pixel/PixelSprite";
import { ICONS, type GearItem } from "./pixel/sprites";
import { playSound } from "@/lib/sound";

export const SCENE_W = 320;
export const SCENE_H = 180;
const HORIZON = 96;
// ---- Camera -----------------------------------------------------------------
// The camera frames only the playable outpost: a 236-unit-wide window (the old
// view was 320 wide, so everything is about 1.36x larger) with roughly a
// quarter of sky. Building positions are computed from the visible window, so
// hit areas, brackets, labels and Laika's paths always line up with the art.
const MIN_VW = 236;
const MIN_VH = 190;
const MAX_VH = 330;
const SKY_SHARE = 0.24;
const CELL = 76; // 48 of building + a 28-unit lane where Laika can stand
const GROUND_EXTRA = 200; // extra ground drawn below the original 180-unit art

export interface OutpostLayout {
  vx: number;
  vy: number;
  vw: number;
  vh: number;
  /** Top-left corner of each module's 48×40 art box. */
  pos: Record<ModuleId, { x: number; y: number }>;
  /** Where Laika stands next to each building (top-left of her 26×26 sprite). */
  visit: Record<ModuleId, { x: number; y: number }>;
  home: { x: number; y: number };
  shelter: { x: number; y: number };
  /** Y of the open ground between the two rows, where Laika can walk without crossing a building. */
  lane: number;
}

const GRID: ModuleId[][] = [
  ["solar", "habitat", "greenhouse"],
  ["battery", "lifeSupport", "shelter"],
];

/** Pure layout for a frame of the given pixel size (exported for tests). */
export function computeLayout(width: number, height: number): OutpostLayout {
  const aspect = width > 0 && height > 0 ? width / height : MIN_VW / MIN_VH;
  const vh = Math.round(Math.min(MAX_VH, Math.max(MIN_VH, MIN_VW / aspect)));
  const vw = Math.round(Math.min(SCENE_W, Math.max(MIN_VW, vh * aspect)));
  const vx = Math.round((SCENE_W - vw) / 2);
  const vy = HORIZON - Math.round(vh * SKY_SHARE);
  const extra = vy + vh - HORIZON - 144; // ground depth beyond the minimum
  const cell = Math.max(CELL, Math.floor((vw - 8) / 3));
  const x0 = vx + Math.round((vw - cell * 3) / 2) + Math.floor((cell - 48) / 2) - 8;
  const rows = [HORIZON + 2 + Math.round(extra * 0.35), HORIZON + 74 + Math.round(extra * 0.75)];
  const pos = {} as OutpostLayout["pos"];
  const visit = {} as OutpostLayout["visit"];
  GRID.forEach((row, r) =>
    row.forEach((id, c) => {
      pos[id] = { x: x0 + c * cell, y: rows[r] };
      visit[id] = { x: x0 + c * cell + 47, y: rows[r] + 20 };
    }),
  );
  const home = { x: pos.battery.x + 47, y: pos.battery.y + 24 };
  visit.battery = { x: pos.battery.x + 34, y: pos.battery.y + 24 }; // home is beside it already
  const lane = Math.round((rows[0] + 54 + rows[1]) / 2) - 26;
  return { vx, vy, vw, vh, pos, visit, home, shelter: { x: pos.shelter.x - 25, y: pos.shelter.y + 22 }, lane };
}

type Pt = { x: number; y: number };
/** Waypoints from `from` to `to`: top-row buildings are reached along the open lane between the rows. */
export function walkRoute(l: OutpostLayout, from: Pt, id: ModuleId, back = false): Pt[] {
  const to = l.visit[id];
  if (!GRID[0].includes(id)) return [back ? from : to];
  return back
    ? [{ x: to.x, y: l.lane }, { x: from.x, y: l.lane }, from]
    : [{ x: from.x, y: l.lane }, { x: to.x, y: l.lane }, to];
}
const DRAW_ORDER: ModuleId[] = ["solar", "habitat", "greenhouse", "battery", "lifeSupport", "shelter"];

// Deterministic pseudo-random scatter so the art is identical on every render.
function scatter(count: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(s / 0x7fffffff);
  }
  return out;
}

const SKY_BANDS: [y: number, h: number, fill: string][] = [
  [0, 18, "#141C32"],
  [18, 14, "#1c2440"],
  [32, 12, "#27334C"],
  [44, 10, "#4a3148"],
  [54, 10, "#7a3b3d"],
  [64, 12, "#A94F36"],
  [76, 12, "#D7864E"],
  [88, 8, "#F2CA76"],
];

function mountains(seed: number, base: number, minH: number, maxH: number, step: number, fill: string): Px[] {
  const rnd = scatter(Math.ceil(SCENE_W / step) + 1, seed);
  const out: Px[] = [];
  let h = (minH + maxH) / 2;
  rnd.forEach((r, i) => {
    h = Math.max(minH, Math.min(maxH, h + Math.round((r - 0.5) * 3) * 4));
    out.push([i * step, base - h, step, h, fill]);
  });
  return out;
}

const BACKDROP: Px[] = (() => {
  const a: Px[] = [];
  for (const [y, h, fill] of SKY_BANDS) a.push([0, y, SCENE_W, h, fill]);
  // Dithered band edges
  for (const [y, , fill] of SKY_BANDS.slice(1)) {
    for (let x = 0; x < SCENE_W; x += 4) a.push([x + ((y / 2) % 2) * 2, y - 1, 2, 1, fill]);
  }
  a.push(...mountains(7, HORIZON, 10, 30, 8, "#6b3038"));
  a.push(...mountains(21, HORIZON, 4, 16, 6, "#8a3f33"));
  a.push([0, HORIZON, SCENE_W, SCENE_H - HORIZON, C.rust]);
  a.push([0, HORIZON, SCENE_W, 2, "#bb5d3c"]);
  const r = scatter(360, 99);
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(r[i * 3] * SCENE_W);
    const y = HORIZON + 3 + Math.floor(r[i * 3 + 1] * (SCENE_H - HORIZON - 4));
    const tone = r[i * 3 + 2];
    a.push([x, y, tone > 0.5 ? 2 : 1, 1, tone > 0.66 ? C.sand : tone > 0.33 ? "#8a3f33" : "#bb5d3c"]);
  }
  // Craters
  for (const [cx, cy, w] of [
    [40, 150, 14],
    [236, 172, 18],
    [140, 122, 10],
    [300, 112, 12],
  ] as const) {
    a.push([cx - w / 2, cy, w, 2, "#8a3f33"], [cx - w / 2 + 1, cy - 1, w - 2, 1, C.rock], [cx - w / 2 + 2, cy + 2, w - 4, 1, C.sand]);
  }
  // Rocks
  for (const [x, y] of [
    [18, 168],
    [126, 174],
    [222, 150],
    [306, 170],
    [92, 118],
  ] as const) {
    a.push([x, y, 6, 3, C.rock], [x + 1, y - 1, 4, 1, C.rock], [x + 1, y, 2, 1, "#8a3f33"]);
  }
  return a;
})();

// More ground below the original art, for the closer gameplay camera.
const GROUND_EXT: Px[] = (() => {
  const a: Px[] = [[0, SCENE_H, SCENE_W, GROUND_EXTRA, C.rust]];
  const r = scatter(240, 91);
  for (let i = 0; i < 240; i += 3) {
    a.push([Math.floor(r[i] * SCENE_W), SCENE_H + Math.floor(r[i + 1] * GROUND_EXTRA), r[i + 2] > 0.5 ? 3 : 2, 1, r[i + 2] > 0.6 ? C.sand : "#8a3f33"]);
  }
  for (const [x, y] of [[70, 196], [200, 214], [118, 250], [262, 238], [150, 290], [60, 320]] as const) {
    a.push([x, y, 6, 3, C.rock], [x + 1, y - 1, 4, 1, C.rock], [x + 1, y, 2, 1, "#8a3f33"]);
  }
  return a;
})();

const STARS: Px[] = scatter(60, 5)
  .reduce<Px[]>((acc, v, i, arr) => {
    if (i % 2 === 0) acc.push([Math.floor(v * SCENE_W), Math.floor(arr[i + 1] * 62), 1, 1, i % 6 === 0 ? C.yellow : C.cream]);
    return acc;
  }, []);

function cables(l: OutpostLayout): Px[] {
  const y = l.pos.battery.y + 21;
  const x1 = l.pos.battery.x + 10;
  const x2 = l.pos.shelter.x + 38;
  const a: Px[] = [[x1, y, x2 - x1, 2, C.steelD], [x1, y, x2 - x1, 1, C.steel]];
  for (const id of GRID[0]) {
    const p = l.pos[id];
    a.push([p.x + 23, p.y + 40, 2, y + 1 - (p.y + 40), C.steelD]);
  }
  for (let x = x1; x < x2; x += 20) a.push([x, y - 1, 3, 4, C.orange], [x, y - 1, 3, 1, C.yellow]);
  return a;
}

const DUST: { x: number; y: number; d: number; w: number }[] = scatter(54, 31).reduce<
  { x: number; y: number; d: number; w: number }[]
>((acc, v, i, arr) => {
  if (i % 3 === 0) acc.push({ x: Math.floor(v * SCENE_W), y: 50 + Math.floor(arr[i + 1] * 250), d: arr[i + 2] * 8, w: 1 + (i % 2) });
  return acc;
}, []);

/** Sky, mountains and ground only — reused on the title screen. */
// Extra night sky above the original 320×180 art, used when the scene is taller.
const MAX_UNITS = 360;
const DEEP_SKY: Px[] = (() => {
  const depth = MAX_UNITS - 140;
  // Stepped bands that blend into the original sky (#141C32 at y=0): no visible seam.
  const a: Px[] = [
    [0, -depth, SCENE_W, depth, "#0b1020"],
    [0, -120, SCENE_W, 120, "#0f1528"],
    [0, -50, SCENE_W, 50, "#141C32"],
  ];
  const r = scatter(160, 77);
  for (let i = 0; i < 80; i += 2) {
    a.push([Math.floor(r[i] * SCENE_W), -Math.floor(r[i + 1] * (MAX_UNITS - 140)), 1, 1, i % 10 === 0 ? C.yellow : C.cream]);
  }
  return a;
})();

// Mars' two small moons (lumpy, grey) and the orbiting crew ship that takes Laika
// to safety in the story. Original pixel art; only seen when the sky is extended.
const MOONS: Px[] = [
  // Phobos (bigger, closer)
  [58, -74, 7, 1, "#9aa6c0"],
  [56, -73, 11, 4, "#9aa6c0"],
  [57, -69, 9, 2, "#7d8fb8"],
  [59, -72, 2, 1, "#66708c"],
  [63, -70, 2, 1, "#66708c"],
  // Deimos (tiny, far)
  [236, -152, 3, 1, "#b9c2d6"],
  [235, -151, 5, 2, "#9aa6c0"],
];
const SHIP: Px[] = [
  [0, 2, 4, 1, C.blue],
  [0, 1, 4, 1, C.blueL],
  [4, 0, 6, 4, C.suit],
  [4, 3, 6, 1, C.steelL],
  [6, 1, 2, 1, C.red],
  [10, 1, 4, 1, C.blueL],
  [10, 2, 4, 1, C.blue],
  [5, 4, 1, 1, C.orange],
];

export const MarsBackdrop = memo(function MarsBackdrop({ weather }: { weather: Weather }) {
  return (
    <g>
      {px(DEEP_SKY.slice(0, 3), "deep")}
      <g className="stars">{px(DEEP_SKY.slice(3), "dst")}</g>
      {px(MOONS, "moon")}
      <g className="orbit-ship" aria-hidden="true">
        <g transform="translate(20 -104)">{px(SHIP, "ship")}</g>
      </g>
      {px(BACKDROP.slice(0, SKY_BANDS.length), "sky")}
      <g className="stars">{px(STARS, "st")}</g>
      {weather !== "STORM" && <g>{px([...dome(252, 56, 5, C.cream), [247, 56, 10, 4, C.cream], [248, 60, 8, 1, C.cream]], "sun")}</g>}
      {px(BACKDROP.slice(SKY_BANDS.length), "bg")}
      {px(GROUND_EXT, "gx")}
      {weather !== "CLEAR" && (
        <rect x={0} y={0} width={SCENE_W} height={SCENE_H + GROUND_EXTRA} fill={C.sand} fillOpacity={weather === "STORM" ? 0.34 : 0.14} />
      )}
    </g>
  );
});

export const DustLayer = memo(function DustLayer({ weather }: { weather: Weather }) {
  const count = weather === "STORM" ? DUST.length : weather === "DUSTY" ? 12 : 6;
  return (
    <g className={`dust dust-${weather.toLowerCase()}`} aria-hidden="true">
      {DUST.slice(0, count).map((p, i) => (
        <rect
          key={i}
          className="dust-mote"
          x={p.x}
          y={p.y}
          width={weather === "STORM" ? p.w + 2 : p.w}
          height={1}
          fill={C.cream}
          fillOpacity={weather === "STORM" ? 0.7 : 0.45}
          style={{ animationDelay: `-${p.d}s` }}
        />
      ))}
    </g>
  );
});

function conditionWord(c: number): string {
  if (c >= 85) return "good";
  if (c >= 60) return "worn";
  if (c >= 40) return "damaged";
  return "badly damaged";
}

interface OutpostProps {
  modules: Record<ModuleId, ModuleState>;
  weather: Weather;
  greenhouseMode: GreenhouseMode;
  cropProgress: number;
  charge: number;
  generation: number;
  selected: ModuleId | null;
  onSelect: (id: ModuleId) => void;
  mood: LaikaMood;
  sheltering: boolean;
  highlight?: ModuleId | null;
  interactive?: boolean;
  /** Module that was just upgraded or repaired (brief flash + floating text). */
  flash?: { id: ModuleId; text: string } | null;
  /** Grow taller (more sky) to fill the frame instead of leaving empty space. */
  fill?: boolean;
  /** Brief celebratory bounce after a successful engineering action. */
  laikaBurst?: boolean;
  gear?: GearItem[];
  /** After a build, Laika walks to this building, cheers, and walks back. Change `key` to trigger. */
  visit?: { id: ModuleId; key: number } | null;
  /** Mouth animation while Laika is speaking. */
  talking?: boolean;
}

export function PixelMarsOutpost({
  modules,
  weather,
  greenhouseMode,
  cropProgress,
  charge,
  generation,
  selected,
  onSelect,
  mood,
  sheltering,
  highlight = null,
  interactive = true,
  flash = null,
  laikaBurst = false,
  gear = [],
  fill = false,
  visit = null,
  talking = false,
}: OutpostProps) {
  // The camera window follows the frame's shape, so the outpost always fills it.
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: MIN_VW, h: MIN_VH });
  useEffect(() => {
    const frame = svgRef.current?.parentElement;
    if (!fill || !frame || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { width, height } = frame.getBoundingClientRect();
      if (width < 10 || height < 10) return;
      setSize((s) => (s.w === Math.round(width) && s.h === Math.round(height) ? s : { w: Math.round(width), h: Math.round(height) }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [fill]);
  const layout = useMemo(() => (fill ? computeLayout(size.w, size.h) : computeLayout(MIN_VW, MIN_VH)), [fill, size]);
  const cableArt = useMemo(() => cables(layout), [layout]);
  const top = layout.vy;
  const midX = layout.vx + layout.vw / 2;
  const [hot, setHot] = useState<ModuleId | null>(null);
  const homePos = sheltering ? layout.shelter : layout.home;
  // Presentation only: go → cheer → back. The upgrade itself is already done.
  const [trip, setTrip] = useState<{ id: ModuleId; phase: "go" | "cheer" | "back"; step: number } | null>(null);
  const visitKey = visit?.key ?? 0;
  const legs = visit ? walkRoute(layout, homePos, visit.id).length : 1;
  useEffect(() => {
    if (!visit) return;
    const id = visit.id;
    const n = legs;
    const leg = 1700 / n;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    setTrip({ id, phase: "go", step: 0 });
    for (let i = 1; i < n; i++) at(i * leg, () => setTrip({ id, phase: "go", step: i }));
    at(1700, () => {
      setTrip({ id, phase: "cheer", step: 0 });
      playSound("woof");
    });
    for (let i = 0; i < n; i++) at(3200 + i * leg, () => setTrip({ id, phase: "back", step: i }));
    at(4900, () => setTrip(null));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // Only a new visit key starts a trip.
  }, [visitKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const laikaPos = !trip
    ? homePos
    : trip.phase === "cheer"
      ? layout.visit[trip.id]
      : walkRoute(layout, homePos, trip.id, trip.phase === "back")[trip.step] ?? homePos;
  const legMs = trip && trip.phase !== "cheer" ? Math.round(1700 / walkRoute(layout, homePos, trip.id).length) - 60 : 1600;
  const tripWalking = trip !== null && trip.phase !== "cheer";
  const cheering = trip?.phase === "cheer";

  // Walk cycle only while Laika is actually changing position (purely visual).
  const [walking, setWalking] = useState(false);
  const wasSheltering = useRef(sheltering);
  useEffect(() => {
    if (wasSheltering.current === sheltering) return;
    wasSheltering.current = sheltering;
    setWalking(true);
    const timer = window.setTimeout(() => setWalking(false), 1700);
    return () => window.clearTimeout(timer);
  }, [sheltering]);
  // Touch screens have no hover, so the selected building keeps its name strip.
  const tip = hot ?? highlight ?? selected;

  const onKey = (e: KeyboardEvent<SVGGElement>, id: ModuleId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <svg
      ref={svgRef}
      className={`outpost-svg${fill ? " outpost-fill" : ""}`}
      viewBox={`${layout.vx} ${layout.vy} ${layout.vw} ${layout.vh}`}
      data-camera={`${layout.vw}x${layout.vh}`}
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      role="group"
      aria-label={`Mars outpost. Weather: ${weather.toLowerCase()}. Select a module to inspect it.`}
    >
      <MarsBackdrop weather={weather} />
      {px(cableArt, "cb")}

      {DRAW_ORDER.map((id) => {
        const p = layout.pos[id];
        const m = modules[id];
        const isSel = selected === id;
        const isHot = hot === id;
        const info = MODULES[id];
        const bracket = isSel ? C.yellow : C.cream;
        return (
          <g
            key={id}
            transform={`translate(${p.x} ${p.y})`}
            className={`module-hit${highlight === id ? " tutorial-pulse" : ""}${flash?.id === id ? " module-flash" : ""}${isSel ? " module-selected" : ""}`}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? isSel : undefined}
            aria-label={`${info.name}, level ${m.level} of 3, condition ${Math.round(m.condition)} percent, ${conditionWord(m.condition)}`}
            onClick={
              interactive
                ? () => {
                    setHot(id); // touch devices have no hover: a tap shows the tooltip too
                    onSelect(id);
                  }
                : undefined
            }
            onKeyDown={interactive ? (e) => onKey(e, id) : undefined}
            onMouseEnter={() => setHot(id)}
            onMouseLeave={() => setHot((h) => (h === id ? null : h))}
            onFocus={() => setHot(id)}
            onBlur={() => setHot((h) => (h === id ? null : h))}
            data-module={id}
          >
            <rect x={-3} y={-8} width={54} height={62} fill="transparent" />
            <g className="module-art">
              <ModuleArt
                id={id}
                level={m.level}
                condition={m.condition}
                greenhouseMode={greenhouseMode}
                cropProgress={cropProgress}
                charge={charge}
                generation={generation}
              />
            </g>
            {isSel && (
              // Persistent "selected" marker, distinct from the hover brackets.
              <g className="select-marker" fill={C.yellow}>
                <rect x={20} y={-10} width={9} height={1} fill={C.out} />
                <rect x={21} y={-9} width={7} height={2} />
                <rect x={22} y={-7} width={5} height={1} />
                <rect x={23} y={-6} width={3} height={1} />
                <rect x={24} y={-5} width={1} height={1} />
              </g>
            )}
            {flash?.id === id && (
              <text x={24} y={-12} textAnchor="middle" className="scene-label scene-label-hot float-up">
                {flash.text}
              </text>
            )}
            {/* Level pips: filled = built */}
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x={16 + i * 6} y={41} width={5} height={4} fill={C.out} />
                <rect x={17 + i * 6} y={42} width={3} height={2} fill={i < m.level ? C.yellow : C.rock} />
              </g>
            ))}
            {m.condition < 60 && (
              <g transform="translate(38 -8)" className="blink">
                {gridRects(ICONS.warning, "w")}
              </g>
            )}
            {(isSel || isHot || highlight === id) && (
              <g fill={bracket}>
                <rect x={-3} y={-3} width={6} height={1} />
                <rect x={-3} y={-3} width={1} height={6} />
                <rect x={45} y={-3} width={6} height={1} />
                <rect x={50} y={-3} width={1} height={6} />
                <rect x={-3} y={46} width={6} height={1} />
                <rect x={-3} y={41} width={1} height={6} />
                <rect x={45} y={46} width={6} height={1} />
                <rect x={50} y={41} width={1} height={6} />
              </g>
            )}
            <text
              x={24}
              y={52.5}
              textAnchor="middle"
              className={`scene-label${isSel || isHot ? " scene-label-hot" : ""}`}
            >
              {info.name.toUpperCase()}
              {m.condition < 60 ? " !" : ""}
            </text>
          </g>
        );
      })}

      <g
        className="laika-walker"
        style={{ transform: `translate(${laikaPos.x}px, ${laikaPos.y}px)`, transitionDuration: `${legMs}ms` }}
      >
        <rect x={5} y={25} width={16} height={2} fill={C.rock} fillOpacity={0.45} />
        <g
          className={mood === "celebrate" ? "laika-hop" : laikaBurst || cheering ? "laika-hop-brief" : walking || tripWalking ? undefined : "laika-bob"}
          data-laika-trip={trip ? `${trip.id}:${trip.phase}` : "home"}
        >
          <LaikaFrames mood={trip ? "happy" : mood} walking={walking || tripWalking} gear={gear} talking={talking && !trip} />
        </g>
      </g>

      <DustLayer weather={weather} />
      {tip && (
        // Retro status strip: always in the same place, so it never covers a building.
        <g pointerEvents="none" aria-hidden="true">
          <rect x={midX - 102} y={top + 3} width={204} height={17} fill={C.out} />
          <rect x={midX - 101} y={top + 4} width={202} height={15} fill={C.navy} />
          <rect x={midX - 101} y={top + 4} width={202} height={1} fill={C.blueL} />
          <text x={midX} y={top + 10.5} textAnchor="middle" className="scene-label scene-label-hot">
            {MODULES[tip].name.toUpperCase()} · LEVEL {modules[tip].level}
          </text>
          <text x={midX} y={top + 16.5} textAnchor="middle" className="scene-label scene-tip">
            {MODULES[tip].tip}
          </text>
        </g>
      )}
      {/* Keep the unused-id lint quiet and document coverage of all six modules. */}
      <desc>{MODULE_IDS.join(", ")}</desc>
    </svg>
  );
}
