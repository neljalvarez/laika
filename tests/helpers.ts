import { EVENTS } from "@/data/events";
import { canAfford } from "@/game/events";
import { createInitialState } from "@/game/initialState";
import { missionReducer } from "@/game/reducer";
import { canRepair, canUpgrade } from "@/game/upgrades";
import { MODULE_IDS, type GameAction, type MissionState, type ModuleId } from "@/game/types";

export function start(seed = 1957): MissionState {
  return missionReducer(createInitialState(seed, false), { type: "BEGIN_MISSION" });
}

export function run(state: MissionState, ...actions: GameAction[]): MissionState {
  return actions.reduce(missionReducer, state);
}

/** Advance one sol and acknowledge the report. */
export function nextSol(state: MissionState): MissionState {
  return run(state, { type: "ADVANCE_SOL" }, { type: "DISMISS_REPORT" });
}

export type Strategy = "careful" | "neglect";

function resolvePending(s: MissionState, strategy: Strategy): MissionState {
  if (!s.pendingEvent) return s;
  const choices = EVENTS[s.pendingEvent].choices.filter((c) => canAfford(s, c).ok);
  const sorted = [...choices].sort((a, b) => (strategy === "careful" ? b.quality - a.quality : a.quality - b.quality));
  return run(s, { type: "RESOLVE_EVENT", choiceId: sorted[0].id }, { type: "DISMISS_OUTCOME" });
}

const CAREFUL_ORDER: ModuleId[] = ["solar", "shelter", "lifeSupport", "greenhouse", "habitat", "battery"];

export function playCampaign(seed: number, strategy: Strategy): MissionState {
  let s = start(seed);
  let guard = 0;
  while (s.status === "playing" && guard++ < 50) {
    s = resolvePending(s, strategy);
    if (strategy === "careful") {
      const damaged = MODULE_IDS.find((id) => s.modules[id].condition < 65 && canRepair(s, id).ok);
      if (damaged) {
        s = run(s, { type: "REPAIR", moduleId: damaged });
      } else {
        const target = CAREFUL_ORDER.find((id) => canUpgrade(s, id).ok && s.resources.materials - canUpgrade(s, id).cost >= 8);
        if (target) s = run(s, { type: "UPGRADE", moduleId: target });
      }
      const wantHigh = s.cropProgress >= 2 && s.resources.power >= 45 && s.resources.food < 14;
      s = run(s, { type: "SET_GREENHOUSE_MODE", mode: wantHigh ? "HIGH" : "LOW" });
    } else {
      s = run(s, { type: "SET_GREENHOUSE_MODE", mode: "OFF" });
    }
    s = nextSol(s);
  }
  return s;
}
