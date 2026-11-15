"use client";

import { MEMORIAL_PHOTO } from "@/data/memorial";
import { MUSIC_TRACKS } from "@/lib/sound";

import { CONFIG } from "@/game/config";
import { SCIENCE_DISCLAIMER } from "@/data/science";
import { TUTORIAL_STAGES } from "@/data/tutorial";
import { Modal } from "./Modal";
import { PixelSprite } from "./pixel/PixelSprite";
import { ICONS, type IconName } from "./pixel/sprites";

const RULES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "power",
    title: "Power",
    text: `Solar panels charge the battery. The habitat and life support always need ${CONFIG.essentialDemand} power per sol. Dust means less sunlight. ${CONFIG.powerEmergencyLimit} sols in a row without enough essential power ends the mission.`,
  },
  {
    icon: "lifeSupport",
    title: "Life Support",
    text: "Laika's air and water. It goes down a little every sol, and the Life Support Unit recycles some back. If it reaches 0 the mission ends.",
  },
  {
    icon: "materials",
    title: "Materials",
    text: "You start with 60 and they do not grow back. Upgrades, repairs and some emergency fixes all use the same pile.",
  },
  {
    icon: "food",
    title: "Food",
    text: `Laika eats ${CONFIG.foodUsePerSol} per sol. The greenhouse needs ${CONFIG.cropEstablishSols} powered sols before its first harvest. ${CONFIG.foodEmergencyLimit} hungry sols in a row ends the mission.`,
  },
  {
    icon: "radiation",
    title: "Radiation Hazard",
    text: "A made-up risk score that only goes up. A stronger shelter makes it rise more slowly. Reaching 100 ends the mission.",
  },
];

interface HowToPlayProps {
  onClose: () => void;
  /** In a mission: restart the guided training without touching mission progress. */
  onReplay?: () => void;
}

export function HowToPlay({ onClose, onReplay }: HowToPlayProps) {
  return (
    <Modal title="How to Play" onClose={onClose} maxWidth={760}>
      <p className="mb-2">
        You are the Mission Commander. Keep Laika safe and get the outpost ready for the human crew in{" "}
        <strong>10 sols</strong> (Mars days).
      </p>
      <ol className="mb-3 list-decimal space-y-1 pl-6 text-[length:calc(14px*var(--ts))]">
        <li>Click a building to see what it does.</li>
        <li>
          In the Engineering tab, do <strong>one</strong> build each sol. <strong>Upgrade</strong> makes a building stronger.{" "}
          <strong>Repair</strong> fixes damage.
        </li>
        <li>Set the greenhouse to OFF, LOW or HIGH. This is free.</li>
        <li>Answer Mission Control when an emergency appears.</li>
        <li>Press Preview Next Sol to check your plan, then Advance Sol.</li>
        <li>Read the short report. Press View Full Report to see every number.</li>
      </ol>
      <ul className="space-y-2">
        {RULES.map((r) => (
          <li key={r.title} className="flex items-start gap-2 border-[2px] border-ink bg-white p-2 text-[length:calc(13px*var(--ts))]">
            <span className="border-[2px] border-ink bg-navy p-1">
              <PixelSprite grid={ICONS[r.icon]} scale={3} />
            </span>
            <span>
              <strong className="uppercase">{r.title}: </strong>
              {r.text}
            </span>
          </li>
        ))}
      </ul>
      <h2 className="h-pixel mt-3 text-[length:calc(14px*var(--ts))]">Controls</h2>
      <ul className="list-disc pl-6 text-[length:calc(13px*var(--ts))]">
        <li>Mouse or touch: click or tap a building to select it. Its name and job appear at the top of the scene.</li>
        <li>Keyboard: Tab moves between buildings and buttons. Enter or Space selects.</li>
        <li>Settings has separate switches for music, ambience and sound effects. Nothing important is sound-only.</li>
      </ul>
      <h2 className="h-pixel mt-3 text-[length:calc(14px*var(--ts))]">Upgrades and events</h2>
      <ul className="list-disc pl-6 text-[length:calc(13px*var(--ts))]">
        <li>Every upgrade earns 1 Gear. At 2, 4 and 6 Gears you unlock a small bonus (see the Gears chip beside the outpost).</li>
        <li>Each building has 3 levels. Upgrades cost materials and make the building work better for the rest of the mission.</li>
        <li>Worn or damaged buildings work less well. A repair costs {CONFIG.repairCost} materials and restores {CONFIG.repairAmount}% condition.</li>
        <li>Events give you 2–3 choices. Each shows its cost now and what happens later. You must choose before the sol continues.</li>
      </ul>
      <h2 className="h-pixel mt-3 text-[length:calc(14px*var(--ts))]">Training recap</h2>
      <ol className="list-decimal pl-6 text-[length:calc(13px*var(--ts))]">
        {TUTORIAL_STAGES.map((s) => (
          <li key={s.title}>
            <strong>{s.title}:</strong> {s.lines[s.lines.length - 1]}
          </li>
        ))}
      </ol>
      {onReplay && (
        <div className="mt-2">
          <button type="button" className="btn btn-small" onClick={onReplay}>
            Replay guided training
          </button>
          <span className="ml-2 text-[length:calc(12px*var(--ts))]">Your mission progress is kept.</span>
        </div>
      )}
      <p className="mt-3 text-[length:calc(13px*var(--ts))]">
        Tip: you cannot upgrade everything. Engineers call this a <strong>trade-off</strong>.
      </p>
    </Modal>
  );
}

export function Credits({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Credits" onClose={onClose} maxWidth={640}>
      <div className="space-y-2 text-[length:calc(14px*var(--ts))]">
        <p>
          <strong>LAIKA: MISSION RED PLANET</strong> — a NASA Space Apps Challenge student project.
        </p>
        <p>
          <strong>Story:</strong> alternate history. The real Laika flew on Sputnik 2 in 1957 and did not survive. Our
          story imagines a kinder ending to honor her.
        </p>
        <p>
          <strong>Art:</strong> all pixel art is original and drawn in code for this project. No outside art assets or
          fonts are loaded.
        </p>
        <p>
          <strong>Music:</strong> “Against the Crimson Sky” (main menu), “Below the Red Horizon” and “Last Light On The Ridge”
          (gameplay), custom-made for this project by the team ({MUSIC_TRACKS.length} tracks).
          Sound effects and the Mars wind are synthesized by the game.
        </p>
        <p>
          <strong>Memorial photograph:</strong>{" "}
          {MEMORIAL_PHOTO ? (
            <>
              {MEMORIAL_PHOTO.credit}. {MEMORIAL_PHOTO.license}.
            </>
          ) : (
            "not included yet. The opening shows the dedication text only until a photograph with verified reuse rights is added."
          )}
        </p>
        <p>
          <strong>Science:</strong> see the NASA Science Lab for sources. Game numbers are fictional units.
        </p>
        <p className="text-[length:calc(12px*var(--ts))]">{SCIENCE_DISCLAIMER}</p>
      </div>
    </Modal>
  );
}
