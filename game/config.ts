// Centralised balancing targets. These are fictional game units chosen for
// teaching trade-offs — they are NOT physical NASA specifications.
import type { GreenhouseMode, ModuleId, Weather } from "./types";

export const SAVE_VERSION = 1;
export const TUTORIAL_SEED = 1957;

export const CONFIG = {
  maxSols: 10,
  start: {
    power: 75,
    lifeSupport: 85,
    materials: 60,
    food: 12,
    radiation: 0,
  },
  actionsPerSol: 1,

  // Power
  batteryCapacity: [100, 125, 150] as const,
  solarOutput: [20, 28, 36] as const,
  weatherMult: { CLEAR: 1.0, DUSTY: 0.75, STORM: 0.4 } as Record<Weather, number>,
  essentialDemand: 18,
  greenhousePower: { OFF: 0, LOW: 3, HIGH: 7 } as Record<GreenhouseMode, number>,
  /** Life-support reserve lost on a sol where essential systems lack power. */
  shortageLifeSupportPenalty: 6,
  /** Consecutive essential-power-shortage sols that abort the mission. */
  powerEmergencyLimit: 2,

  // Life support
  lifeSupportUse: [8, 7, 6] as const, // by Habitat level
  lifeSupportRecovery: [5, 8, 11] as const, // by Life Support Unit level
  lifeSupportCritical: 25,

  // Food
  foodUsePerSol: 2,
  foodCap: 30,
  cropEstablishSols: 2,
  greenhouseFood: { OFF: 0, LOW: 2, HIGH: 5 } as Record<GreenhouseMode, number>,
  /** Extra harvest per active sol by Greenhouse level. */
  greenhouseLevelBonus: [0, 1, 2] as const,
  /** Consecutive hungry sols that abort the mission. */
  foodEmergencyLimit: 2,
  hungerLifeSupportPenalty: 4,

  // Radiation hazard (abstract 0–100 meter, not a dose)
  radiationBaseline: 4,
  shelterMult: [0.7, 0.45, 0.25] as const,
  radiationWarning: 60,
  radiationAbort: 100,

  // Durability
  wearPerSol: 2,
  dustyPanelWear: 3,
  stormPanelWear: 6,
  shortageBatteryWear: 5,
  repairCost: 6,
  repairAmount: 30,

  upgradeCost: {
    solar: [12, 18],
    battery: [10, 15],
    lifeSupport: [14, 20],
    shelter: [14, 20],
    habitat: [15, 22],
    greenhouse: [12, 18],
  } as Record<ModuleId, readonly [number, number]>,

  // Weather
  dustyChance: 0.3,
  /** Chance that a sol between 4 and 9 has an event (sols 2–3 always do). */
  eventChance: 0.85,
} as const;

/** Damaged equipment works less well: 100% condition → 1.0, 0% → 0.4. */
export function conditionFactor(condition: number): number {
  const c = Math.max(0, Math.min(100, condition));
  return 0.4 + 0.6 * (c / 100);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
