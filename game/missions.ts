// One suggested "Today's mission" per sol, picked from the real outpost state.
// It is a suggestion only: the player may do anything else. No RNG is used.
import { MODULES } from "@/data/modules";
import { CONFIG } from "./config";
import { criticalResources } from "./status";
import { canUpgrade } from "./upgrades";
import { MODULE_IDS, type MissionState, type ModuleId } from "./types";

export type DailyMissionKind = "repair" | "upgrade" | "greenhouse" | "food" | "safe";

export interface DailyMission {
  sol: number;
  kind: DailyMissionKind;
  moduleId?: ModuleId;
  done: boolean;
}

/** Which buildings an upgrade suggestion checks first (most protective first). */
const UPGRADE_ORDER: readonly ModuleId[] = ["lifeSupport", "solar", "shelter", "greenhouse", "battery", "habitat"];

export function planDailyMission(s: MissionState): DailyMission {
  const base = { sol: s.sol, done: false };
  const damaged = [...MODULE_IDS]
    .filter((id) => s.modules[id].condition < 70)
    .sort((a, b) => s.modules[a].condition - s.modules[b].condition)[0];
  if (damaged && s.resources.materials >= CONFIG.repairCost) return { ...base, kind: "repair", moduleId: damaged };
  if (s.greenhouseMode === "OFF" && (s.cropProgress < CONFIG.cropEstablishSols || s.resources.food <= 8)) {
    return { ...base, kind: "greenhouse", moduleId: "greenhouse" };
  }
  // Food is running low and the crops are ready: grow more, if power allows.
  if (
    s.resources.food <= 6 &&
    s.cropProgress >= CONFIG.cropEstablishSols &&
    s.greenhouseMode !== "HIGH" &&
    s.resources.power >= 30
  ) {
    return { ...base, kind: "food", moduleId: "greenhouse" };
  }
  // Ignore "already built today" when planning: the mission is set at sol start.
  const fresh: MissionState = { ...s, status: "playing", actionsLeft: Math.max(1, s.actionsLeft), pendingEvent: null, reportPending: false };
  const upgrade = UPGRADE_ORDER.find((id) => canUpgrade(fresh, id).ok);
  if (upgrade) return { ...base, kind: "upgrade", moduleId: upgrade };
  return { ...base, kind: "safe" };
}

export function missionText(m: DailyMission): string {
  const name = m.moduleId ? MODULES[m.moduleId].name : "";
  switch (m.kind) {
    case "repair":
      return `Repair the ${name}`;
    case "upgrade":
      return `Upgrade the ${name}`;
    case "greenhouse":
      return "Turn the Greenhouse on (LOW or HIGH)";
    case "food":
      return "Set the Greenhouse to HIGH to grow more food";
    case "safe":
      return "Finish the sol with no meter in the red";
  }
}

export function missionWhy(m: DailyMission): string {
  switch (m.kind) {
    case "repair":
      return "Damaged buildings work less well.";
    case "upgrade":
      return "Stronger buildings make the mission safer.";
    case "greenhouse":
      return "Crops need power and time before food grows.";
    case "food":
      return "Food is low. More power to the plants means more food.";
    case "safe":
      return "Keep power, air, food and safety in balance.";
  }
}

/** Can today's repair/upgrade suggestion still be afforded? */
export function missionStillPossible(s: MissionState): boolean {
  const m = s.dailyMission;
  if (!m.moduleId) return true;
  if (m.kind === "repair") return s.resources.materials >= CONFIG.repairCost && s.modules[m.moduleId].condition < 100;
  if (m.kind === "upgrade") {
    const fresh: MissionState = { ...s, actionsLeft: Math.max(1, s.actionsLeft), pendingEvent: null, reportPending: false };
    return canUpgrade(fresh, m.moduleId).ok;
  }
  return true;
}

/** Checks whether the action just taken finished today's mission. */
export function missionCompleted(prev: MissionState, next: MissionState, actionType: string): boolean {
  const m = prev.dailyMission;
  if (!m || m.done || m.sol !== prev.sol || prev.status !== "playing") return false;
  switch (m.kind) {
    case "repair":
      return actionType === "REPAIR" && next.metrics.repairsDone > prev.metrics.repairsDone && next.lastAction?.moduleId === m.moduleId;
    case "upgrade":
      return actionType === "UPGRADE" && next.metrics.upgradesBuilt > prev.metrics.upgradesBuilt && next.lastAction?.moduleId === m.moduleId;
    case "greenhouse":
      return actionType === "SET_GREENHOUSE_MODE" && next.greenhouseMode !== "OFF";
    case "food":
      return actionType === "SET_GREENHOUSE_MODE" && next.greenhouseMode === "HIGH";
    case "safe": {
      if (actionType !== "ADVANCE_SOL" || next.history.length <= prev.history.length) return false;
      const end = next.history[next.history.length - 1];
      return criticalResources({ ...prev, resources: end.resources }).length === 0;
    }
  }
}
