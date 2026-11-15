"use client";

// The interactive pixel-art outpost. Everything is drawn on a 320×180 logical
// grid and scaled up with crisp edges. All visuals derive from MissionState.
import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MODULES } from "@/data/modules";
import type { LaikaMood } from "@/data/dialogue";
import { MODULE_IDS, type GreenhouseMode, type ModuleId, type ModuleState, type Weather } from "@/game/types";
import { LaikaFrames } from "./LaikaSprite";
import { C, ModuleArt, dome, px, type Px } from "./pixel/moduleArt";
import { gridRects } from "./pixel/PixelSprite";
import { ICONS, type GearItem } from "./pixel/sprites";

export const SCENE_W = 320;
export const SCENE_H = 180;
const HORIZON = 96;
/** The dashboard crops the top of the sky so the outpost fills the frame. */
const VIEW_TOP = 40;
/** In "fill" mode the scene may grow upward into extra starry sky, never past this. */
const MAX_UNITS = 360;

/** Top-left corner of each module's 48×40 art box. */
const POSITIONS: Record<ModuleId, { x: number; y: number }> = {
  solar: { x: 8, y: 88 },
  habitat: { x: 110, y: 88 },
  greenhouse: { x: 212, y: 88 },
  battery: { x: 58, y: 126 },
  lifeSupport: { x: 162, y: 126 },
  shelter: { x: 264, y: 126 },
};
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

const STARS: Px[] = scatter(60, 5)
  .reduce<Px[]>((acc, v, i, arr) => {
    if (i % 2 === 0) acc.push([Math.floor(v * SCENE_W), Math.floor(arr[i + 1] * 62), 1, 1, i % 6 === 0 ? C.yellow : C.cream]);
    return acc;
  }, []);

const CABLES: Px[] = (() => {
  const a: Px[] = [[30, 147, 260, 2, C.steelD], [30, 147, 260, 1, C.steel]];
  for (const id of ["solar", "habitat", "greenhouse"] as ModuleId[]) {
    const p = POSITIONS[id];
    a.push([p.x + 23, p.y + 40, 2, 148 - (p.y + 40), C.steelD]);
  }
  for (let x = 30; x < 290; x += 20) a.push([x, 146, 3, 4, C.orange], [x, 146, 3, 1, C.yellow]);
  return a;
})();

const DUST: { x: number; y: number; d: number; w: number }[] = scatter(54, 31).reduce<
  { x: number; y: number; d: number; w: number }[]
>((acc, v, i, arr) => {
  if (i % 3 === 0) acc.push({ x: Math.floor(v * SCENE_W), y: 50 + Math.floor(arr[i + 1] * 120), d: arr[i + 2] * 8, w: 1 + (i % 2) });
  return acc;
}, []);

/** Sky, mountains and ground only — reused on the title screen. */
// Extra night sky above the original 320×180 art, used when the scene is taller.
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
      {weather !== "CLEAR" && (
        <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill={C.sand} fillOpacity={weather === "STORM" ? 0.34 : 0.14} />
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
}: OutpostProps) {
  // How many scene units tall the view is. 140 = the original framing.
  const svgRef = useRef<SVGSVGElement>(null);
  const [units, setUnits] = useState(SCENE_H - VIEW_TOP);
  useEffect(() => {
    const frame = svgRef.current?.parentElement;
    if (!fill || !frame || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { width, height } = frame.getBoundingClientRect();
      if (width < 10 || height < 10) return;
      const want = Math.round((SCENE_W * height) / width);
      setUnits(Math.max(SCENE_H - VIEW_TOP, Math.min(MAX_UNITS, want)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [fill]);
  const top = fill ? SCENE_H - units : VIEW_TOP;
  const [hot, setHot] = useState<ModuleId | null>(null);
  const laikaPos = sheltering ? { x: 240, y: 146 } : { x: 124, y: 148 };

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
  const tip = hot ?? highlight;

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
      viewBox={`0 ${top} ${SCENE_W} ${SCENE_H - top}`}
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      role="group"
      aria-label={`Mars outpost. Weather: ${weather.toLowerCase()}. Select a module to inspect it.`}
    >
      <MarsBackdrop weather={weather} />
      {px(CABLES, "cb")}

      {DRAW_ORDER.map((id) => {
        const p = POSITIONS[id];
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

      <g className="laika-walker" style={{ transform: `translate(${laikaPos.x}px, ${laikaPos.y}px)` }}>
        <rect x={5} y={25} width={16} height={2} fill={C.rock} fillOpacity={0.45} />
        <g className={mood === "celebrate" ? "laika-hop" : laikaBurst ? "laika-hop-brief" : walking ? undefined : "laika-bob"}>
          <LaikaFrames mood={mood} walking={walking} gear={gear} />
        </g>
      </g>

      <DustLayer weather={weather} />
      {tip && (
        // Retro status strip: always in the same place, so it never covers a building.
        <g pointerEvents="none" aria-hidden="true">
          <rect x={58} y={top + 3} width={204} height={17} fill={C.out} />
          <rect x={59} y={top + 4} width={202} height={15} fill={C.navy} />
          <rect x={59} y={top + 4} width={202} height={1} fill={C.blueL} />
          <text x={160} y={top + 10.5} textAnchor="middle" className="scene-label scene-label-hot">
            {MODULES[tip].name.toUpperCase()} · LEVEL {modules[tip].level}
          </text>
          <text x={160} y={top + 16.5} textAnchor="middle" className="scene-label scene-tip">
            {MODULES[tip].tip}
          </text>
        </g>
      )}
      {/* Keep the unused-id lint quiet and document coverage of all six modules. */}
      <desc>{MODULE_IDS.join(", ")}</desc>
    </svg>
  );
}
