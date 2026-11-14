// One shared definition of "low" and "critical" for every resource, used by
// the HUD, Laika's reactions and the warning sound so they can never disagree.
import { CONFIG } from "./config";
import type { MissionState, ResourceKey } from "./types";

export type ResourceLevel = "ok" | "warn" | "bad";

export interface ResourceStatus {
  word: string;
  level: ResourceLevel;
}

const lowIsBad = (v: number, warn: number, bad: number): ResourceStatus =>
  v <= bad ? { word: "Critical", level: "bad" } : v <= warn ? { word: "Low", level: "warn" } : { word: "OK", level: "ok" };

export function resourceStatus(state: MissionState, key: ResourceKey): ResourceStatus {
  const r = state.resources;
  switch (key) {
    case "power":
      return lowIsBad(r.power, 30, CONFIG.essentialDemand);
    case "lifeSupport":
      return lowIsBad(r.lifeSupport, 45, CONFIG.lifeSupportCritical);
    case "food":
      return lowIsBad(r.food, 6, CONFIG.foodUsePerSol);
    case "materials":
      return r.materials < CONFIG.repairCost ? { word: "Low", level: "warn" } : { word: "OK", level: "ok" };
    case "radiation":
      return r.radiation >= 85
        ? { word: "Danger", level: "bad" }
        : r.radiation >= CONFIG.radiationWarning
          ? { word: "High", level: "warn" }
          : { word: "OK", level: "ok" };
  }
}

const KEYS: ResourceKey[] = ["power", "lifeSupport", "materials", "food", "radiation"];

/** Resources currently in their critical band. */
export function criticalResources(state: MissionState): ResourceKey[] {
  return KEYS.filter((k) => resourceStatus(state, k).level === "bad");
}
