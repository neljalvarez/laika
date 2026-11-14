// Engineering insights: short ideas the player meets through real play.
// Detected by comparing the state before and after an action. Purely
// educational: they never change resources, score or difficulty.
import { EVENTS } from "@/data/events";
import type { GameAction, MissionState } from "./types";

export type InsightId =
  | "weather"
  | "battery"
  | "crops"
  | "foodPower"
  | "repairUpgrade"
  | "radiation"
  | "recycle"
  | "tradeoff";

export interface Insight {
  id: InsightId;
  text: string;
  /** Science Lab card that explains it. */
  card: string;
}

export const INSIGHTS: Record<InsightId, Insight> = {
  weather: { id: "weather", text: "Solar power depends on the weather. Dust means less sunlight.", card: "power" },
  battery: { id: "battery", text: "Stored energy keeps systems running when the panels make too little.", card: "power" },
  crops: { id: "crops", text: "Food production needs planning: crops take time to grow.", card: "food" },
  foodPower: { id: "foodPower", text: "More food needs more power. Power for plants is power taken from somewhere else.", card: "food" },
  repairUpgrade: { id: "repairUpgrade", text: "Repairing fixes damage. Upgrading makes a building better than before.", card: "reliability" },
  radiation: { id: "radiation", text: "Shielding and sheltering lower radiation risk, but they cost time or materials.", card: "radiation" },
  recycle: { id: "recycle", text: "Recycling air and water makes supplies last much longer.", card: "water" },
  tradeoff: { id: "tradeoff", text: "Materials are limited. Every build means something else waits.", card: "reliability" },
};

export const INSIGHT_ORDER: readonly InsightId[] = [
  "weather",
  "battery",
  "crops",
  "foodPower",
  "repairUpgrade",
  "radiation",
  "recycle",
  "tradeoff",
];

export function detectInsights(prev: MissionState, next: MissionState, action: GameAction): InsightId[] {
  if (next === prev) return [];
  const found: InsightId[] = [];
  const advanced = action.type === "ADVANCE_SOL" && next.history.length > prev.history.length;
  if (advanced && next.status === "playing" && next.weather !== "CLEAR") found.push("weather");
  if (advanced && next.lastReport) {
    const p = next.lastReport.resources.power;
    if (p.after < p.before && !next.lastReport.powerShortage) found.push("battery");
  }
  if (prev.cropProgress < 2 && next.cropProgress >= 2) found.push("crops");
  if (action.type === "SET_GREENHOUSE_MODE" && action.mode === "HIGH" && next.greenhouseMode === "HIGH") found.push("foodPower");
  const built = next.metrics.upgradesBuilt + next.metrics.repairsDone > prev.metrics.upgradesBuilt + prev.metrics.repairsDone;
  if (built) found.push("repairUpgrade");
  if (built && action.type === "UPGRADE" && (action.moduleId === "lifeSupport" || action.moduleId === "habitat")) found.push("recycle");
  if (action.type === "RESOLVE_EVENT" && prev.pendingEvent && EVENTS[prev.pendingEvent].id === "solar_radiation" && !next.pendingEvent) {
    found.push("radiation");
  }
  if (prev.resources.materials > 15 && next.resources.materials <= 15) found.push("tradeoff");
  return found.filter((id) => !next.insights.includes(id));
}
