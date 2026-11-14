// Engineering actions: upgrades and repairs. One action per sol.
import { MODULES } from "@/data/modules";
import { CONFIG, clamp } from "./config";
import type { MissionState, ModuleId } from "./types";

export interface ActionCheck {
  ok: boolean;
  reason: string | null;
  cost: number;
}

export function upgradeCost(state: MissionState, id: ModuleId): number | null {
  const level = state.modules[id].level;
  if (level >= 3) return null;
  return CONFIG.upgradeCost[id][level - 1];
}

function commonBlock(state: MissionState): string | null {
  if (state.status !== "playing") return "The mission is not in progress.";
  if (state.reportPending) return "Read the sol report first.";
  if (state.pendingEvent) return "Answer the emergency first.";
  if (state.actionsLeft <= 0) return "You already built today. Advance the sol to build again.";
  return null;
}

export function canUpgrade(state: MissionState, id: ModuleId): ActionCheck {
  const cost = upgradeCost(state, id);
  if (cost === null) return { ok: false, reason: "Already at the top level.", cost: 0 };
  const block = commonBlock(state);
  if (block) return { ok: false, reason: block, cost };
  if (state.resources.materials < cost)
    return { ok: false, reason: `Not enough materials. Needs ${cost}, you have ${state.resources.materials}.`, cost };
  return { ok: true, reason: null, cost };
}

export function canRepair(state: MissionState, id: ModuleId): ActionCheck {
  const cost = CONFIG.repairCost;
  if (state.modules[id].condition >= 100) return { ok: false, reason: "Already in perfect condition.", cost };
  const block = commonBlock(state);
  if (block) return { ok: false, reason: block, cost };
  if (state.resources.materials < cost)
    return { ok: false, reason: `Not enough materials. Needs ${cost}, you have ${state.resources.materials}.`, cost };
  return { ok: true, reason: null, cost };
}

export function applyUpgrade(state: MissionState, id: ModuleId, bonus = false): MissionState {
  const check = canUpgrade(state, id);
  if (!check.ok) return { ...state, notice: check.reason };
  const level = (state.modules[id].level + 1) as 2 | 3;
  const before = state.modules[id].condition;
  const condition = bonus ? clamp(before + CONFIG.minigameBonus, 0, 100) : before;
  return {
    ...state,
    resources: { ...state.resources, materials: state.resources.materials - check.cost },
    modules: { ...state.modules, [id]: { level, condition } },
    actionsLeft: state.actionsLeft - 1,
    notice: null,
    metrics: {
      ...state.metrics,
      materialsSpent: state.metrics.materialsSpent + check.cost,
      upgradesBuilt: state.metrics.upgradesBuilt + 1,
    },
    lastAction: { kind: "upgrade", moduleId: id, sol: state.sol },
    log: [
      ...state.log,
      {
        sol: state.sol,
        kind: "engineering",
        title: `Upgraded ${MODULES[id].name} to Level ${level}`,
        detail: `Materials −${check.cost}. ${MODULES[id].levelEffects[level - 1]}${
          bonus && condition > before ? ` Hands-on bonus: condition ${before} → ${condition}.` : ""
        }`,
      },
    ],
  };
}

export function applyRepair(state: MissionState, id: ModuleId, bonus = false): MissionState {
  const check = canRepair(state, id);
  if (!check.ok) return { ...state, notice: check.reason };
  const before = state.modules[id].condition;
  const condition = clamp(before + CONFIG.repairAmount + (bonus ? CONFIG.minigameBonus : 0), 0, 100);
  return {
    ...state,
    resources: { ...state.resources, materials: state.resources.materials - check.cost },
    modules: { ...state.modules, [id]: { ...state.modules[id], condition } },
    actionsLeft: state.actionsLeft - 1,
    notice: null,
    metrics: {
      ...state.metrics,
      materialsSpent: state.metrics.materialsSpent + check.cost,
      repairsDone: state.metrics.repairsDone + 1,
    },
    lastAction: { kind: "repair", moduleId: id, sol: state.sol },
    log: [
      ...state.log,
      {
        sol: state.sol,
        kind: "engineering",
        title: `Repaired ${MODULES[id].name}`,
        detail: `Materials −${check.cost}. Condition ${before} → ${condition}.${bonus ? " Hands-on bonus included." : ""}`,
      },
    ],
  };
}
