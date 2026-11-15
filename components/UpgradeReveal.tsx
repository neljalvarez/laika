"use client";

// Presentation only: shown after the engine has already applied an upgrade.
// Closing or skipping it changes nothing in the game.
import { MODULES } from "@/data/modules";
import { perkAt } from "@/game/gears";
import type { GreenhouseMode, ModuleId } from "@/game/types";
import { Modal } from "./Modal";
import { C, ModuleArt } from "./pixel/moduleArt";

const SPARKS: [x: number, y: number, delay: number][] = [
  [2, 2, 0],
  [50, 6, 0.15],
  [-2, 24, 0.3],
  [54, 28, 0.1],
  [10, -8, 0.25],
  [40, -6, 0.4],
  [24, -11, 0.05],
];

interface Props {
  moduleId: ModuleId;
  /** The new level (already applied by the engine). */
  level: number;
  condition: number;
  greenhouseMode: GreenhouseMode;
  cropProgress: number;
  charge: number;
  generation: number;
  materialsLeft: number;
  /** Materials actually spent (after any Gear discount). */
  cost: number;
  /** Total Gears after this upgrade. */
  gears: number;
  onClose: () => void;
}

export function UpgradeReveal({ moduleId, level, condition, greenhouseMode, cropProgress, charge, generation, materialsLeft, cost, gears, onClose }: Props) {
  const perk = perkAt(gears);
  const info = MODULES[moduleId];
  return (
    <Modal
      title={`${info.name} upgraded!`}
      maxWidth={520}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-go" onClick={onClose} data-autofocus>
          Continue
        </button>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center" data-testid="upgrade-reveal">
        <div className="border-[3px] border-ink bg-rust p-2" style={{ lineHeight: 0 }}>
          <svg viewBox="-6 -14 60 62" width={240} height={248} shapeRendering="crispEdges" role="img" aria-label={`${info.name}, now level ${level}`}>
            <rect x={-6} y={38} width={60} height={10} fill="#8a3f33" />
            <g className="reveal-building">
              <ModuleArt
                id={moduleId}
                level={level}
                condition={condition}
                greenhouseMode={greenhouseMode}
                cropProgress={cropProgress}
                charge={charge}
                generation={generation}
              />
            </g>
            {SPARKS.map(([x, y, delay], i) => (
              <g key={i} className="reveal-spark" style={{ animationDelay: `${delay}s` }} fill={C.yellow}>
                <rect x={x} y={y - 1} width={1} height={3} />
                <rect x={x - 1} y={y} width={3} height={1} />
              </g>
            ))}
          </svg>
        </div>
        <div className="h-pixel text-[length:calc(20px*var(--ts))]">
          Level {level - 1} <span aria-hidden="true">→</span>
          <span className="sr-only"> to </span> Level {level}
        </div>
        <table className="report" style={{ maxWidth: 420 }}>
          <tbody>
            <tr>
              <th scope="row">{info.stat.label}</th>
              <td className="font-extrabold">
                {info.stat.values[level - 2]} → {info.stat.values[level - 1]}
              </td>
            </tr>
            <tr>
              <th scope="row">Materials spent</th>
              <td className="font-extrabold">{cost}</td>
            </tr>
            <tr>
              <th scope="row">Materials left</th>
              <td className="font-extrabold">{materialsLeft}</td>
            </tr>
            <tr>
              <th scope="row">Gears</th>
              <td className="font-extrabold" data-testid="reveal-gears">
                +1 (now {gears})
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-[length:calc(13px*var(--ts))]">{info.levelEffects[level - 1]}</p>
        {perk && (
          <p className="border-[3px] border-ink bg-gold p-2 text-[length:calc(14px*var(--ts))] font-bold" data-testid="reveal-perk">
            Gear reward unlocked: {perk.name}! {perk.text}.
          </p>
        )}
      </div>
    </Modal>
  );
}
