"use client";

import { CONFIG } from "@/game/config";
import { SCIENCE_DISCLAIMER } from "@/data/science";
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

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to Play" onClose={onClose} maxWidth={760}>
      <p className="mb-2">
        You are the Mission Commander. Keep Laika safe and get the outpost ready for the human crew in{" "}
        <strong>10 sols</strong> (Mars days).
      </p>
      <ol className="mb-3 list-decimal space-y-1 pl-6 text-[14px]">
        <li>Click a building to inspect it.</li>
        <li>
          Do <strong>one</strong> engineering action each sol: upgrade <em>or</em> repair.
        </li>
        <li>Set the greenhouse to OFF, LOW or HIGH. This is free.</li>
        <li>Answer Mission Control when an emergency appears.</li>
        <li>Press Preview Next Sol to check your plan, then Advance Sol.</li>
        <li>Read the report to see what changed and why.</li>
      </ol>
      <ul className="space-y-2">
        {RULES.map((r) => (
          <li key={r.title} className="flex items-start gap-2 border-[2px] border-ink bg-white p-2 text-[13px]">
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
      <p className="mt-3 text-[13px]">
        Tip: you cannot upgrade everything. Engineers call this a <strong>trade-off</strong>.
      </p>
    </Modal>
  );
}

export function Credits({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Credits" onClose={onClose} maxWidth={640}>
      <div className="space-y-2 text-[14px]">
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
          <strong>Science:</strong> see the NASA Science Lab for sources. Game numbers are fictional units.
        </p>
        <p className="text-[12px]">{SCIENCE_DISCLAIMER}</p>
      </div>
    </Modal>
  );
}
