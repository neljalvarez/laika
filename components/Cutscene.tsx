"use client";

// In-engine cutscenes: a tiny timed scene player plus the intro and win-outro
// stories. Everything is drawn with the game's own pixel art (no video files).
// Cutscenes are presentation only: they never change mission state.
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { computeScore, ENDING_TEXT, gradeFor } from "@/game/scoring";
import type { MissionState } from "@/game/types";
import { playSound, type SoundName } from "@/lib/sound";
import { LaikaFrames } from "./LaikaSprite";
import { MarsBackdrop } from "./PixelMarsOutpost";
import { C, px, type Px } from "./pixel/moduleArt";
import { earnedGear, type GearItem, type LaikaVariant } from "./pixel/sprites";

const W = 320;
const H = 180;

interface Scene {
  ms: number;
  caption: string;
  /** Sound cue when the scene starts, with an optional delay. */
  sound?: [SoundName, number?][];
  art: ReactElement;
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

function outroScenes(state: MissionState): Scene[] {
  const score = computeScore(state);
  const gear = earnedGear(state.sol, true);
  const tier = state.status === "outstanding" ? "outstanding" : "success";
  return [
    {
      ms: 2500,
      caption: "Mission complete! The outpost is ready for the crew.",
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <Laika x={136} y={104} scale={1.9} mood="celebrate" gear={gear} className="laika-hop" />
          <Text x={160} y={64} size={20} fill={C.yellow}>
            MISSION COMPLETE!
          </Text>
        </g>
      ),
    },
    {
      ms: 3000,
      caption: "Time to go home. Woof!",
      sound: [["woof", 300], ["whoosh", 2200]],
      art: (
        <g>
          <MarsBackdrop weather="CLEAR" />
          <g transform="translate(206 76) scale(2)">{px(ROCKET, "r")}</g>
          <g className="cut-board">
            <Laika x={70} y={112} scale={1.6} mood="happy" gear={gear} className="laika-hop" />
          </g>
        </g>
      ),
    },
    {
      ms: 6000,
      caption: "Flying back to Earth... How did the mission go?",
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
          <rect x={8} y={8} width={150} height={96} fill={C.out} />
          <rect x={9} y={9} width={148} height={94} fill={C.navy} />
          <Text x={83} y={21} size={8} fill={C.yellow}>
            MISSION REPORT
          </Text>
          {score.categories.map((c, i) => (
            <g key={c.id} className="cut-pop" style={{ animationDelay: `${0.5 + i * 0.8}s` }} data-outro-category={c.id}>
              <text x={14} y={35 + i * 12} className="cut-text" style={{ fontSize: 6.5 }}>
                {c.label}
              </text>
              <text x={152} y={35 + i * 12} textAnchor="end" className="cut-text" style={{ fontSize: 6.5, fill: C.yellow }}>
                {c.score}/{c.max}
              </text>
            </g>
          ))}
        </g>
      ),
    },
    {
      ms: 3200,
      caption: ENDING_TEXT[tier].title,
      sound: [["gear", 1100]],
      art: (
        <g>
          {px(SPACE, "sp")}
          {px(earth(160, 250, 110), "e")}
          <Text x={160} y={44} size={12}>
            FINAL SCORE
          </Text>
          <g className="cut-pop" style={{ animationDelay: "1.1s" }} data-testid="outro-grade">
            <Text x={160} y={96} size={50} fill={C.yellow}>
              {String(score.total)}
            </Text>
            <Text x={160} y={122} size={16}>
              {`GRADE ${gradeFor(score.total)}`}
            </Text>
          </g>
        </g>
      ),
    },
    {
      ms: 3000,
      caption: "Welcome home, Laika! (In our story, she makes it back.)",
      sound: [["woof", 600]],
      art: (
        <g>
          {px(EARTH_LAND, "el")}
          <g transform="translate(200 62) scale(1.8)">{px(ROCKET, "r")}</g>
          <Laika x={110} y={114} scale={1.8} mood="celebrate" gear={gear} className="laika-hop" />
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

  return (
    <main className="cutscene" aria-label={title} data-testid="cutscene" data-scene={index}>
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
        <div className="panel-dark flex items-center justify-between gap-3 px-3 py-2">
          <p className="text-[15px] font-bold" aria-live="polite" data-testid="cutscene-caption">
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

export const INTRO_TOTAL_MS = introScenes().reduce((sum, s) => sum + s.ms, 0);
