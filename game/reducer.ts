// The single action dispatcher for MissionState. Pure: the same state and
// action always give the same result, so React re-renders cannot double-apply.
import { advanceSol, setGreenhouseMode } from "./engine";
import { resolveEvent } from "./events";
import { applyRepair, applyUpgrade } from "./upgrades";
import type { GameAction, MissionState } from "./types";

export const TUTORIAL_LAST_STEP = 4;

export function missionReducer(state: MissionState, action: GameAction): MissionState {
  switch (action.type) {
    case "BEGIN_MISSION":
      return state.status === "intro" ? { ...state, status: "playing" } : state;
    case "SET_GREENHOUSE_MODE":
      return setGreenhouseMode(state, action.mode);
    case "UPGRADE":
      return applyUpgrade(state, action.moduleId);
    case "REPAIR":
      return applyRepair(state, action.moduleId);
    case "RESOLVE_EVENT":
      return resolveEvent(state, action.choiceId);
    case "DISMISS_OUTCOME":
      return state.eventOutcome ? { ...state, eventOutcome: null } : state;
    case "ADVANCE_SOL":
      return advanceSol(state);
    case "DISMISS_REPORT":
      return state.reportPending ? { ...state, reportPending: false } : state;
    case "TUTORIAL_STEP": {
      const t = state.tutorial;
      if (!t.active || t.step !== action.from) return state;
      if (t.step >= TUTORIAL_LAST_STEP) return { ...state, tutorial: { active: false, step: t.step } };
      return { ...state, tutorial: { active: true, step: t.step + 1 } };
    }
    case "TUTORIAL_SKIP":
      return state.tutorial.active ? { ...state, tutorial: { active: false, step: state.tutorial.step } } : state;
    case "CLEAR_NOTICE":
      return state.notice ? { ...state, notice: null } : state;
  }
}

/** Wrapper so the React reducer can also hold "no mission yet" and load saves. */
export type RootAction =
  | GameAction
  | { type: "NEW_MISSION"; state: MissionState }
  | { type: "LOAD"; state: MissionState }
  | { type: "RESET" };

export function rootReducer(state: MissionState | null, action: RootAction): MissionState | null {
  switch (action.type) {
    case "NEW_MISSION":
    case "LOAD":
      return action.state;
    case "RESET":
      return null;
    default:
      return state ? missionReducer(state, action) : state;
  }
}
