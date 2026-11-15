// Visual hints: pick ONE useful thing to point at, from the real game state.
// Pure and read-only: a hint never spends, advances, resolves or switches anything.
import { CONFIG } from "./config";
import { difficultyOf } from "./difficulty";
import { simulateSol } from "./engine";
import { canRepair, canUpgrade } from "./upgrades";
import { MODULE_IDS, type MissionState, type ModuleId } from "./types";

export type HintKind = "event" | "repair" | "power" | "food" | "radiation" | "air" | "supplies" | "mission" | "advance";

export interface Hint {
  kind: HintKind;
  /** CSS selector of the real control to spotlight. */
  target: string;
  /** A few words at most. */
  label: string;
  /** Optional building to also pulse in the scene. */
  moduleId?: ModuleId;
}

const mod = (id: ModuleId) => `[data-module="${id}"]`;

export function getHint(s: MissionState): Hint | null {
  if (s.status !== "playing" || s.tutorial.active) return null;
  if (s.pendingEvent) return { kind: "event", target: '[data-testid="event-choices"]', label: "Pick a choice" };

  const sim = simulateSol(s);
  const canBuild = s.actionsLeft > 0;
  const r = s.resources;

  // 1. A damaged building the player can actually afford to repair today.
  if (canBuild) {
    const damaged = MODULE_IDS.filter((id) => s.modules[id].condition < 60 && canRepair(s, id).ok).sort(
      (a, b) => s.modules[a].condition - s.modules[b].condition,
    )[0];
    if (damaged) return { kind: "repair", target: mod(damaged), label: "Damaged: repair?", moduleId: damaged };
  }
  // 2. Power will run short.
  if (sim.powerShortage || r.power < 25) {
    if (s.greenhouseMode === "HIGH") return { kind: "power", target: mod("greenhouse"), label: "Low power: greenhouse uses a lot", moduleId: "greenhouse" };
    if (canBuild && canUpgrade(s, "solar").ok) return { kind: "power", target: mod("solar"), label: "Low power: Solar Array", moduleId: "solar" };
    return { kind: "power", target: '[data-meter="power"]', label: "Low power" };
  }
  // 3. Food will run out.
  if (sim.foodShortage || r.food <= 4) return { kind: "food", target: mod("greenhouse"), label: "Food low: Greenhouse", moduleId: "greenhouse" };
  // 4. Radiation is getting high.
  if (r.radiation >= 50) {
    if (canBuild && canUpgrade(s, "shelter").ok) return { kind: "radiation", target: mod("shelter"), label: "Radiation high: Shelter", moduleId: "shelter" };
    return { kind: "radiation", target: '[data-meter="radiation"]', label: "Radiation high" };
  }
  // 5. Air and water are low.
  if (r.lifeSupport < CONFIG.lifeSupportCritical + 10) {
    if (canBuild && canUpgrade(s, "lifeSupport").ok) return { kind: "air", target: mod("lifeSupport"), label: "Air low: Life Support", moduleId: "lifeSupport" };
    return { kind: "air", target: '[data-meter="lifeSupport"]', label: "Air low" };
  }
  // 6. Nothing affordable today: point at supplies only if a delivery really is coming.
  if (canBuild && !MODULE_IDS.some((id) => canUpgrade(s, id).ok || canRepair(s, id).ok)) {
    const next = difficultyOf(s).deliveries.find((d) => d.sol > s.sol);
    if (next) return { kind: "supplies", target: '[data-meter="materials"]', label: `Supplies arrive Sol ${next.sol}` };
  }
  // 7. Today's mission, if it can be done right now.
  const m = s.dailyMission;
  if (m && !s.missionsDone.includes(s.sol) && m.moduleId && canBuild) {
    const doable = m.kind === "upgrade" ? canUpgrade(s, m.moduleId).ok : m.kind === "repair" ? canRepair(s, m.moduleId).ok : true;
    if (doable) return { kind: "mission", target: mod(m.moduleId), label: "Today's mission", moduleId: m.moduleId };
  }
  // 8. All good: the next step is to advance.
  return { kind: "advance", target: "#btn-advance", label: "Ready? Advance Sol" };
}
