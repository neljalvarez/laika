// Central, typed difficulty settings. NORMAL reproduces the original balance
// exactly; Easy and Hard only change the values listed here.
import { CONFIG } from "./config";

export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  title: string;
  blurb: string;
  startMaterials: number;
  /** Scheduled Mission Control deliveries: materials arriving at the start of a sol. */
  deliveries: readonly { sol: number; amount: number }[];
  /** One-time rescue when materials are nearly gone at the start of a sol. */
  emergencyResupply: { atOrBelow: number; amount: number } | null;
  /** Whether the random "Supply Drone" choice event can appear. */
  randomResupply: boolean;
  /** Chance of an event on sols 4–9 (sols 2–3 always have one). */
  eventChance: number;
  /** Chance that the next sol is dusty. */
  dustyChance: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    title: "Junior Explorer",
    blurb: "More supplies. More room to learn.",
    startMaterials: 80,
    deliveries: [
      { sol: 3, amount: 10 },
      { sol: 5, amount: 10 },
      { sol: 7, amount: 10 },
    ],
    emergencyResupply: { atOrBelow: 5, amount: 12 },
    randomResupply: true,
    eventChance: 0.7,
    dustyChance: 0.2,
  },
  normal: {
    id: "normal",
    label: "Normal",
    title: "Mission Commander",
    blurb: "Balanced resources and challenges.",
    startMaterials: CONFIG.start.materials,
    deliveries: [],
    emergencyResupply: null,
    randomResupply: true,
    eventChance: CONFIG.eventChance,
    dustyChance: CONFIG.dustyChance,
  },
  hard: {
    id: "hard",
    label: "Hard",
    title: "Mars Engineer",
    blurb: "Fewer supplies. Tougher decisions.",
    startMaterials: 45,
    deliveries: [{ sol: 5, amount: 10 }],
    emergencyResupply: null,
    randomResupply: false,
    eventChance: 1,
    dustyChance: 0.4,
  },
};

export const DIFFICULTY_ORDER: readonly Difficulty[] = ["easy", "normal", "hard"];

/** Saves from before difficulty existed (value "standard") play as Normal. */
export function normalizeDifficulty(value: unknown): Difficulty {
  return value === "easy" || value === "hard" ? value : "normal";
}

export function difficultyOf(state: { difficulty: unknown }): DifficultyConfig {
  return DIFFICULTIES[normalizeDifficulty(state.difficulty)];
}
