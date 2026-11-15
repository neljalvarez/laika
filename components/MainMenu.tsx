"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { MEMORIAL_PHOTO, MEMORIAL_TEXT, OPENING } from "@/data/memorial";
import { playSound } from "@/lib/sound";
import { ROCKET } from "./Cutscene";
import { LaikaFrames } from "./LaikaSprite";
import { C, dome, px, type Px } from "./pixel/moduleArt";
import { PixelSprite } from "./pixel/PixelSprite";
import { ICONS, type IconName } from "./pixel/sprites";

interface Props {
  hasSave: boolean;
  savedSol: number | null;
  onStart: () => void;
  onRandom: () => void;
  onContinue: () => void;
  onHowTo: () => void;
  onScience: () => void;
  onCredits: () => void;
  onSettings: () => void;
  onWatchIntro: () => void;
}

const W = 320;
const H = 200;
const HORIZON = 118;

function scatter(count: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(s / 0x7fffffff);
  }
  return out;
}

/** Original sunset scene for the title screen: starry sky, low sun, mesas, rocks. */
const SCENE: Px[] = (() => {
  const a: Px[] = [
    [0, 0, W, 40, "#141C32"],
    [0, 40, W, 22, "#27254a"],
    [0, 62, W, 18, "#4a3148"],
    [0, 80, W, 14, "#7a3b3d"],
    [0, 94, W, 12, "#b5533a"],
    [0, 106, W, 12, "#e0903f"],
  ];
  const r = scatter(140, 23);
  for (let i = 0; i < 60; i += 2) a.push([Math.floor(r[i] * W), Math.floor(r[i + 1] * 70), 1, 1, i % 8 === 0 ? C.yellow : C.cream]);
  // clouds
  a.push([40, 84, 44, 3, "#c9634a"], [52, 81, 22, 3, "#c9634a"], [236, 76, 50, 3, "#c9634a"], [250, 73, 24, 3, "#c9634a"]);
  // low sun
  a.push(...dome(150, HORIZON, 22, "#f2ca76"), ...dome(150, HORIZON, 15, "#ffe19a"));
  // mesas
  a.push([0, 100, 46, 18, "#6b3038"], [8, 94, 26, 6, "#6b3038"], [86, 104, 40, 14, "#7a3540"], [94, 99, 20, 5, "#7a3540"]);
  a.push([196, 102, 54, 16, "#6b3038"], [206, 96, 30, 6, "#6b3038"], [280, 98, 40, 20, "#7a3540"], [290, 92, 22, 6, "#7a3540"]);
  // ground
  a.push([0, HORIZON, W, H - HORIZON, C.rust], [0, HORIZON, W, 2, "#c9634a"]);
  for (let i = 60; i < 138; i += 3) {
    const x = Math.floor(r[i] * W);
    const y = HORIZON + 4 + Math.floor(r[i + 1] * (H - HORIZON - 6));
    a.push([x, y, r[i + 2] > 0.5 ? 3 : 2, 1, r[i + 2] > 0.6 ? C.sand : "#8a3f33"]);
  }
  // foreground rocks
  for (const [x, y, w] of [
    [10, 186, 26],
    [70, 190, 18],
    [250, 188, 30],
    [296, 182, 22],
    [150, 192, 14],
  ] as const) {
    a.push(...dome(x + w / 2, y + 10, Math.round(w / 2), C.rock), [x + 3, y + 3, Math.round(w / 3), 2, "#7a3540"]);
  }
  return a;
})();

const MENU: { label: string; icon: IconName; key: "howto" | "science" | "settings" | "credits" }[] = [
  { label: "How to Play", icon: "book", key: "howto" },
  { label: "Science Lab", icon: "flask", key: "science" },
  { label: "Settings", icon: "gear", key: "settings" },
  { label: "Credits", icon: "star", key: "credits" },
];

export function MainMenu({ hasSave, savedSol, onStart, onRandom, onContinue, onHowTo, onScience, onCredits, onSettings, onWatchIntro }: Props) {
  const handlers = { howto: onHowTo, science: onScience, settings: onSettings, credits: onCredits };
  const phase = useOpening();
  const opening = phase !== "ready";
  return (
    <main className={`title-screen${opening ? " title-opening" : ""}`} data-opening={phase}>
      {phase === "memorial" && <Memorial />}
      <section className="title-scene md:order-2" aria-label="LAIKA: Mission Red Planet">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
          {px(SCENE, "s")}
          <rect x={208} y={182} width={84} height={4} fill={C.rock} fillOpacity={0.5} />
          {/* The rocket comes down during the opening and rests exactly here. */}
          <g className="title-rocket">
            <g className="title-flame">
              <rect x={244} y={182} width={18} height={6} fill="#f2ca76" />
              <rect x={248} y={188} width={10} height={6} fill="#e0903f" />
            </g>
            <g transform="translate(214 62) scale(3)">{px(ROCKET, "r")}</g>
          </g>
          <g className="title-dust" fill="#e7b98a">
            <rect className="title-dust-l" x={196} y={180} width={10} height={4} />
            <rect className="title-dust-l" x={184} y={176} width={6} height={4} />
            <rect className="title-dust-r" x={296} y={180} width={10} height={4} />
            <rect className="title-dust-r" x={308} y={176} width={6} height={4} />
          </g>
          <g transform="translate(118 110) scale(2.8)" className="title-reveal">
            <rect x={5} y={25} width={16} height={2} fill={C.rock} fillOpacity={0.45} />
            <g className="laika-bob">
              <LaikaFrames mood="happy" />
            </g>
          </g>
        </svg>
        <div className="title-logo title-reveal">
          <h1>LAIKA</h1>
          <p>— MISSION: RED PLANET —</p>
        </div>
        <p className="title-reveal absolute inset-x-0 bottom-0 bg-[rgba(20,28,50,0.82)] px-3 py-1 text-center text-[11px] text-cream">
          <strong>This story is fiction.</strong> The real Laika flew on Sputnik 2 in 1957 and did not survive. A student project, not
          affiliated with or endorsed by NASA.
        </p>
      </section>

      <nav className="menu-panel title-reveal md:order-1" aria-label="Main menu" inert={opening}>
        <div className="flex items-center justify-center gap-2 pb-1" aria-hidden="true">
          <span style={{ width: 34, height: 4, background: "#c9463b", boxShadow: "0 7px 0 #e0903f, 0 14px 0 #c9463b" }} />
          <span className="rounded-full border-[3px] border-cream p-[6px]">
            <PixelSprite grid={ICONS.paw} scale={3} />
          </span>
          <span style={{ width: 34, height: 4, background: "#c9463b", boxShadow: "0 7px 0 #e0903f, 0 14px 0 #c9463b" }} />
        </div>

        <button type="button" className="btn btn-go btn-menu" onClick={onStart}>
          Start New Mission
        </button>
        <div>
          <button type="button" className="btn btn-menu" onClick={onContinue} disabled={!hasSave} aria-describedby="continue-note">
            Continue
          </button>
          <div id="continue-note" className="mt-1 text-center text-[11px]">
            {hasSave ? `Saved mission found${savedSol ? ` (Sol ${savedSol})` : ""}.` : "No saved mission yet."}
          </div>
        </div>

        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-[2px] flex-1 bg-gold" />
          <span className="text-gold">✦</span>
          <span className="h-[2px] flex-1 bg-gold" />
        </div>

        {MENU.map((m) => (
          <button key={m.key} type="button" className="btn btn-gray btn-menu" onClick={handlers[m.key]}>
            <PixelSprite grid={ICONS[m.icon]} scale={2} />
            <span>{m.label}</span>
          </button>
        ))}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <button type="button" className="btn btn-gray btn-small" onClick={onRandom}>
            Random Mission
          </button>
          <button type="button" className="btn btn-gray btn-small" onClick={onWatchIntro}>
            Watch Intro
          </button>
        </div>
      </nav>
    </main>
  );
}

const SESSION_KEY = "laika-mission-red-planet/opening-seen";
type OpeningPhase = "memorial" | "landing" | "ready";

/**
 * Opening sequence, once per browser session: 2 s memorial, the rocket lands
 * at 3 s, the menu is ready at 3.5 s. All timers are cleared on unmount.
 */
function useOpening(): OpeningPhase {
  const [phase, setPhase] = useState<OpeningPhase>("memorial");
  // Before the first paint: skip everything if this session has already seen it.
  const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useIsoLayoutEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Storage blocked: just play it.
    }
    if (seen) {
      setPhase("ready");
      return;
    }
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Not remembered; harmless.
    }
    const timers = [
      window.setTimeout(() => setPhase("landing"), OPENING.memorialEnd),
      window.setTimeout(() => playSound("boom"), OPENING.rocketLands), // silent until the player has interacted
      window.setTimeout(() => setPhase("ready"), OPENING.menuReady),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  return phase;
}

/** A quiet tribute to the real Laika. No button: it passes on its own. */
function Memorial() {
  const [failed, setFailed] = useState(false);
  const photo = failed ? null : MEMORIAL_PHOTO;
  return (
    <div className="memorial" role="img" aria-label={MEMORIAL_TEXT} data-testid="memorial">
      <div className="memorial-inner">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} alt={photo.alt} className="memorial-photo" onError={() => setFailed(true)} />
        )}
        <p className="memorial-text">{MEMORIAL_TEXT}</p>
      </div>
    </div>
  );
}
