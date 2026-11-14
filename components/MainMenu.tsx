"use client";

import { LaikaFrames } from "./LaikaSprite";
import { DustLayer, MarsBackdrop, SCENE_H, SCENE_W } from "./PixelMarsOutpost";
import { C, dome, px } from "./pixel/moduleArt";
import { SoundToggle } from "./SoundToggle";

interface Props {
  hasSave: boolean;
  savedSol: number | null;
  onStart: () => void;
  onRandom: () => void;
  onContinue: () => void;
  onHowTo: () => void;
  onScience: () => void;
  onCredits: () => void;
}

export function MainMenu({ hasSave, savedSol, onStart, onRandom, onContinue, onHowTo, onScience, onCredits }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1100px] flex-col justify-center gap-3 p-3">
      <div className="outpost-frame relative">
        <svg className="outpost-svg" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} shapeRendering="crispEdges" aria-hidden="true">
          <MarsBackdrop weather="CLEAR" />
          {px(
            [
              ...dome(236, 150, 26, C.out),
              ...dome(236, 150, 25, C.cream),
              [213, 138, 46, 3, C.red],
              [228, 136, 16, 14, C.out],
              [229, 137, 14, 13, C.steelL],
              [231, 139, 10, 5, C.blueL],
              [208, 150, 56, 4, C.steel],
              [208, 154, 56, 1, C.out],
              [235, 118, 2, 7, C.steel],
              [229, 115, 14, 2, C.steelL],
            ],
            "hab",
          )}
          <g transform="translate(52 96) scale(2.6)">
            <rect x={5} y={25} width={16} height={2} fill={C.rock} fillOpacity={0.45} />
            <g className="laika-bob">
              <LaikaFrames mood="happy" />
            </g>
          </g>
          <DustLayer weather="CLEAR" />
        </svg>
        <div className="pointer-events-none absolute inset-x-0 top-0 p-[4%] text-center leading-tight">
          <h1
            className="h-pixel text-cream"
            style={{ fontSize: "clamp(22px, 5.2vw, 56px)", textShadow: "3px 3px 0 #2a1a22, -1px -1px 0 #2a1a22, 3px -1px 0 #2a1a22, -1px 3px 0 #2a1a22" }}
          >
            LAIKA
            <span className="block text-gold" style={{ fontSize: "0.5em" }}>
              Mission Red Planet
            </span>
          </h1>
          <p className="mt-1 font-extrabold text-cream" style={{ fontSize: "clamp(11px, 1.7vw, 18px)", textShadow: "2px 2px 0 #2a1a22" }}>
            One small dog. One enormous mission.
          </p>
        </div>
      </div>

      <nav className="panel" aria-label="Main menu">
        <div className="panel-title">Mission Control</div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <button type="button" className="btn btn-go" onClick={onStart}>
            Start New Mission
          </button>
          <div>
            <button type="button" className="btn w-full" onClick={onContinue} disabled={!hasSave} aria-describedby="continue-note">
              Continue Mission
            </button>
            <div id="continue-note" className="mt-1 text-center text-[12px]">
              {hasSave ? `Saved mission found${savedSol ? ` (Sol ${savedSol})` : ""}.` : "No saved mission yet."}
            </div>
          </div>
          <button type="button" className="btn btn-gray" onClick={onRandom}>
            Random Mission (no tutorial)
          </button>
          <button type="button" className="btn btn-gray" onClick={onHowTo}>
            How to Play
          </button>
          <button type="button" className="btn btn-gray" onClick={onScience}>
            NASA Science Lab
          </button>
          <button type="button" className="btn btn-gray" onClick={onCredits}>
            Credits
          </button>
          <SoundToggle small={false} />
        </div>
        <p className="border-t-[3px] border-ink p-3 text-[12px]">
          <strong>This story is fiction.</strong> The real Laika flew on Sputnik 2 in 1957 and did not survive. This
          game imagines a different ending. It is a student project and is not affiliated with or endorsed by NASA.{" "}
          <button type="button" className="cursor-pointer font-bold text-[#1f4f9c] underline" onClick={onScience}>
            See the real science and sources.
          </button>
        </p>
      </nav>
    </main>
  );
}
