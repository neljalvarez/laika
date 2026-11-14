import { CONFIG, SAVE_VERSION } from "./config";
import { DIFFICULTIES, type Difficulty } from "./difficulty";
import { planDailyMission } from "./missions";
import { nextRandom } from "./rng";
import type { MissionState, Weather } from "./types";

export function createInitialState(seed: number, tutorial: boolean, difficulty: Difficulty = "normal"): MissionState {
  const state = createBaseState(seed, tutorial, difficulty);
  return { ...state, dailyMission: planDailyMission(state) };
}

function createBaseState(seed: number, tutorial: boolean, difficulty: Difficulty): MissionState {
  const diff = DIFFICULTIES[difficulty];
  // First roll decides the Sol 2 forecast so it is visible from Sol 1.
  const roll = nextRandom(seed | 0);
  const forecast: Weather = roll.value < diff.dustyChance ? "DUSTY" : "CLEAR";
  return {
    version: SAVE_VERSION,
    seed,
    rng: roll.next,
    difficulty,
    deliveries: [],
    status: "intro",
    sol: 1,
    maxSols: CONFIG.maxSols,
    resources: { ...CONFIG.start, materials: diff.startMaterials },
    modules: {
      habitat: { level: 1, condition: 100 },
      solar: { level: 1, condition: 100 },
      battery: { level: 1, condition: 100 },
      lifeSupport: { level: 1, condition: 100 },
      shelter: { level: 1, condition: 100 },
      greenhouse: { level: 1, condition: 100 },
    },
    greenhouseMode: "LOW",
    cropProgress: 0,
    weather: "CLEAR",
    forecast,
    stormSolsLeft: 0,
    pendingEvent: null,
    eventOutcome: null,
    seenEvents: [],
    effects: [],
    actionsLeft: CONFIG.actionsPerSol,
    powerEmergencySols: 0,
    foodEmergencySols: 0,
    reportPending: false,
    lastReport: null,
    log: [
      {
        sol: 1,
        kind: "system",
        title: "Mission start",
        detail: "Laika has arrived at the outpost. Prepare the base for the human crew over 10 sols.",
      },
    ],
    history: [],
    decisions: [],
    metrics: {
      powerShortageSols: 0,
      foodShortageSols: 0,
      lifeSupportCriticalSols: 0,
      materialsSpent: 0,
      upgradesBuilt: 0,
      repairsDone: 0,
    },
    lastAction: null,
    tutorial: { active: tutorial, step: 0, completed: false, v: 2 },
    failureReason: null,
    notice: null,
    dailyMission: { sol: 1, kind: "safe", done: false },
    missionsDone: [],
    insights: [],
    insightQueue: [],
  };
}
