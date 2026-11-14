"use client";

// The interactive pixel-art outpost. Everything is drawn on a 320×180 logical
// grid and scaled up with crisp edges. All visuals derive from MissionState.
import { memo, useState, type KeyboardEvent } from "react";
import { MODULES } from "@/data/modules";
import type { LaikaMood } from "@/data/dialogue";
import { MODULE_IDS, type GreenhouseMode, type ModuleId, type ModuleState, type Weather } from "@/game/types";
import { LaikaFrames } from "./LaikaSprite";
import { C, ModuleArt, dome, px, type Px } from "./pixel/moduleArt";
import { gridRects } from "./pixel/PixelSprite";
import { ICONS } from "./pixel/sprites";

export const SCENE_W = 320;
export const SCENE_H = 180;
const HORIZON = 96;
/** The dashboard crops the top of the sky so the outpost fills the frame. */
const VIEW_TOP = 40;

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
export const MarsBackdrop = memo(function MarsBackdrop({ weather }: { weather: Weather }) {
  return (
    <g>
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
  selected: ModuleId | null;
  onSelect: (id: ModuleId) => void;
  mood: LaikaMood;
  sheltering: boolean;
  highlight?: ModuleId | null;
  interactive?: boolean;
}

export function PixelMarsOutpost({
  modules,
  weather,
  greenhouseMode,
  cropProgress,
  charge,
  selected,
  onSelect,
  mood,
  sheltering,
  highlight = null,
  interactive = true,
}: OutpostProps) {
  const [hot, setHot] = useState<ModuleId | null>(null);
  const laikaPos = sheltering ? { x: 240, y: 146 } : { x: 124, y: 148 };

  const onKey = (e: KeyboardEvent<SVGGElement>, id: ModuleId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <svg
      className="outpost-svg"
      viewBox={`0 ${VIEW_TOP} ${SCENE_W} ${SCENE_H - VIEW_TOP}`}
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
            className={`module-hit${highlight === id ? " tutorial-pulse" : ""}`}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? isSel : undefined}
            aria-label={`${info.name}, level ${m.level} of 3, condition ${Math.round(m.condition)} percent, ${conditionWord(m.condition)}`}
            onClick={interactive ? () => onSelect(id) : undefined}
            onKeyDown={interactive ? (e) => onKey(e, id) : undefined}
            onMouseEnter={() => setHot(id)}
            onMouseLeave={() => setHot((h) => (h === id ? null : h))}
            onFocus={() => setHot(id)}
            onBlur={() => setHot((h) => (h === id ? null : h))}
            data-module={id}
          >
            <rect x={-3} y={-8} width={54} height={62} fill="transparent" />
            <ModuleArt
              id={id}
              level={m.level}
              condition={m.condition}
              greenhouseMode={greenhouseMode}
              cropProgress={cropProgress}
              charge={charge}
            />
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
        <g className={mood === "celebrate" ? "laika-hop" : "laika-bob"}>
          <LaikaFrames mood={mood} />
        </g>
      </g>

      <DustLayer weather={weather} />
      {/* Keep the unused-id lint quiet and document coverage of all six modules. */}
      <desc>{MODULE_IDS.join(", ")}</desc>
    </svg>
  );
}
