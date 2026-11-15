// Central text table for the two explanation styles. "Detailed" uses the
// existing authored text; "Simple" uses the short lines below. Both styles
// always show the same costs, numbers and warnings — only wording changes.
import type { EventId, ModuleId } from "@/game/types";
import { useUiPrefs } from "@/lib/prefs";

export const SIMPLE = {
  mission: "Keep Laika safe for 10 sols.",
  upgrade: "Upgrade: Improve performance.",
  repair: "Repair: Fix damage. Same level.",
  notEnough: (need: number, have: number) => `Not enough materials to upgrade (need ${need}, have ${have}).`,
  notEnoughRepair: (need: number, have: number) => `Not enough materials to repair (need ${need}, have ${have}).`,
  modules: {
    habitat: "Habitat: Laika's home. Keeps air in.",
    solar: "Solar Array: Makes power from sunlight.",
    battery: "Battery: Saves power for dark, dusty sols.",
    lifeSupport: "Life Support: Cleans air and water.",
    shelter: "Shelter: Blocks radiation.",
    greenhouse: "Greenhouse: Uses power to grow food.",
  } satisfies Record<ModuleId, string>,
  events: {
    dust_storm: "Dust storm: Less solar power.",
    solar_radiation: "Sun storm: Radiation is coming.",
    water_recycler: "Recycler broke: Less clean air and water.",
    panel_dust: "Dusty panels: Less solar power.",
    habitat_malfunction: "Habitat leak: Air is escaping.",
    greenhouse_fault: "Lamps broke: Plants need light.",
    resupply: "Supply drone: Pick one crate.",
  } satisfies Record<EventId, string>,
  tutorial: [
    "Hi! I'm Laika. Keep our base safe for 10 sols.",
    "Click the solar panels. They make power.",
    "These bars show our supplies. Keep Rad Hazard low!",
    "Click the greenhouse. It grows food with power.",
    "Check what happens next before you go on.",
    "Ready? Press ADVANCE SOL.",
  ],
} as const;

export function upgradeReason(simple: boolean, reason: string | null, need: number, have: number, kind: "upgrade" | "repair"): string | null {
  if (!simple || !reason) return reason;
  if (reason.startsWith("Not enough materials")) return kind === "upgrade" ? SIMPLE.notEnough(need, have) : SIMPLE.notEnoughRepair(need, have);
  return reason;
}

/** True when the player picked the Simple explanation style. */
export function useSimple(): boolean {
  return useUiPrefs().explain === "simple";
}
