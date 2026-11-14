// Transparent scoring from logged gameplay. Six categories, 100 points total.
import { CONFIG, clamp, round1 } from "./config";
import { MODULE_IDS, type MissionState, type MissionStatus } from "./types";

export type ScoreCategoryId = "lifeSupport" | "power" | "radiation" | "food" | "materials" | "emergency";

export interface ScoreCategory {
  id: ScoreCategoryId;
  label: string;
  max: number;
  score: number;
  explanation: string;
}

export interface ScoreBreakdown {
  total: number;
  categories: ScoreCategory[];
  /** Fraction of the campaign completed (scores scale by this on an abort). */
  progress: number;
}

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/**
 * Formulas (all clamped to 0…max, then scaled by sols completed ÷ 10):
 *  Life Support 25 = 25 × min(avg reserve ÷ 75, 1) − 4 per critical sol (<25)
 *  Power        20 = 20 × min(avg battery ÷ 60, 1) − 6 per essential shortage sol
 *  Radiation    20 = 20 × (1 − final hazard ÷ 80)
 *  Food         15 = 9 × min(final food ÷ 10, 1) + 6 if crops are producing − 5 per hungry sol
 *  Materials    10 = 10 × (1 − idle materials above 10 ÷ 50)
 *  Emergency    10 = 10 × average decision quality (7 if no emergencies occurred)
 */
export function computeScore(state: MissionState): ScoreBreakdown {
  const h = state.history;
  const n = h.length;
  const progress = clamp(n / state.maxSols, 0, 1);
  const m = state.metrics;
  const r = state.resources;
  const scale = (raw: number, max: number) => round1(clamp(raw, 0, max) * progress);

  const avgLs = mean(h.map((s) => s.resources.lifeSupport));
  const avgPower = mean(h.map((s) => s.resources.power));
  const cropsProducing =
    state.cropProgress >= CONFIG.cropEstablishSols && state.modules.greenhouse.condition >= 50;
  const idle = Math.max(0, r.materials - 10);
  const avgQuality = state.decisions.length === 0 ? 0.7 : mean(state.decisions.map((d) => d.quality));

  const categories: ScoreCategory[] = [
    {
      id: "lifeSupport",
      label: "Life Support Reliability",
      max: 25,
      score: scale(25 * clamp(avgLs / 75, 0, 1) - 4 * m.lifeSupportCriticalSols, 25),
      explanation: `Average reserve was ${round1(avgLs)}/100 with ${m.lifeSupportCriticalSols} critical sol(s) below ${CONFIG.lifeSupportCritical}.`,
    },
    {
      id: "power",
      label: "Power Management",
      max: 20,
      score: scale(20 * clamp(avgPower / 60, 0, 1) - 6 * m.powerShortageSols, 20),
      explanation: `Average battery charge was ${round1(avgPower)} with ${m.powerShortageSols} essential power shortage(s).`,
    },
    {
      id: "radiation",
      label: "Radiation Protection",
      max: 20,
      score: scale(20 * (1 - r.radiation / 80), 20),
      explanation: `Final radiation hazard meter was ${r.radiation}/100 (lower is better).`,
    },
    {
      id: "food",
      label: "Food Sustainability",
      max: 15,
      score: scale(9 * clamp(r.food / 10, 0, 1) + (cropsProducing ? 6 : 0) - 5 * m.foodShortageSols, 15),
      explanation: `Ended with ${r.food} food, greenhouse ${cropsProducing ? "producing" : "not producing"}, ${m.foodShortageSols} hungry sol(s).`,
    },
    {
      id: "materials",
      label: "Material Efficiency",
      max: 10,
      score: scale(10 * (1 - idle / 50), 10),
      explanation: `Used ${m.materialsSpent} materials on ${m.upgradesBuilt} upgrade(s), ${m.repairsDone} repair(s) and event fixes; ${r.materials} left idle.`,
    },
    {
      id: "emergency",
      label: "Emergency Response",
      max: 10,
      score: scale(10 * avgQuality, 10),
      explanation:
        state.decisions.length === 0
          ? "No emergencies needed a decision."
          : `Average decision quality across ${state.decisions.length} event(s) was ${Math.round(avgQuality * 100)}%.`,
    },
  ];
  const total = round1(clamp(categories.reduce((sum, c) => sum + c.score, 0), 0, 100));
  return { total, categories, progress };
}

export const ENDING_RULES = {
  outstanding: { score: 80, minCondition: 55, lifeSupport: 50, radiationBelow: 50 },
  success: { score: 60, lifeSupport: 30, radiationBelow: 80 },
} as const;

/** Ending tier after surviving the final sol. */
export function determineEnding(state: MissionState, score: ScoreBreakdown): MissionStatus {
  const r = state.resources;
  const minCondition = Math.min(...MODULE_IDS.map((id) => state.modules[id].condition));
  const noShortages = state.metrics.powerShortageSols === 0 && state.metrics.foodShortageSols === 0;
  const o = ENDING_RULES.outstanding;
  if (
    score.total >= o.score &&
    minCondition >= o.minCondition &&
    r.lifeSupport >= o.lifeSupport &&
    r.radiation < o.radiationBelow &&
    noShortages
  ) {
    return "outstanding";
  }
  const s = ENDING_RULES.success;
  if (score.total >= s.score && r.lifeSupport >= s.lifeSupport && r.radiation < s.radiationBelow) {
    return "success";
  }
  return "partial";
}

export const ENDING_TEXT: Record<"outstanding" | "success" | "partial" | "failure", { title: string; body: string }> = {
  outstanding: {
    title: "Outstanding Success",
    body: "The outpost is stable, safe and stocked. The human crew can land and move straight in. Laika is waiting at the airlock, tail wagging.",
  },
  success: {
    title: "Successful Mission",
    body: "Laika is safe and the outpost is ready enough for the crew to arrive. A few jobs remain, but the mission did what it set out to do.",
  },
  partial: {
    title: "Mission Extension Required",
    body: "Laika made it through all 10 sols, but the outpost needs repairs before humans can live here. Mission Control has extended the mission.",
  },
  failure: {
    title: "Mission Aborted",
    body: "The automatic safety system ended the surface mission early. Laika is safe aboard the orbiting ship, and the team now knows what to fix.",
  },
};
