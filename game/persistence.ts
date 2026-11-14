// Versioned LocalStorage persistence with guarded browser access.
import { SAVE_VERSION } from "./config";
import { MODULE_IDS, type MissionState } from "./types";

export const SAVE_KEY = "laika-mission-red-planet/save";

/** Minimal storage surface so tests can pass an in-memory fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // e.g. storage blocked by privacy settings
  }
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Structural validation so a corrupt or outdated save is never loaded. */
export function validateSave(data: unknown): data is MissionState {
  if (!isObj(data)) return false;
  if (data.version !== SAVE_VERSION) return false;
  if (!isNum(data.seed) || !isNum(data.rng) || !isNum(data.sol) || !isNum(data.maxSols)) return false;
  if (typeof data.status !== "string") return false;
  const r = data.resources;
  if (!isObj(r)) return false;
  for (const k of ["power", "lifeSupport", "materials", "food", "radiation"]) {
    if (!isNum(r[k])) return false;
  }
  const m = data.modules;
  if (!isObj(m)) return false;
  for (const id of MODULE_IDS) {
    const mod = m[id];
    if (!isObj(mod) || !isNum(mod.level) || !isNum(mod.condition)) return false;
  }
  return (
    Array.isArray(data.log) &&
    Array.isArray(data.history) &&
    Array.isArray(data.effects) &&
    Array.isArray(data.decisions) &&
    Array.isArray(data.seenEvents) &&
    isObj(data.metrics) &&
    isObj(data.tutorial) &&
    isNum(data.actionsLeft)
  );
}

export function saveMission(state: MissionState, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // quota exceeded or storage unavailable
  }
}

export function loadMission(storage: StorageLike | null = browserStorage()): MissionState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return validateSave(data) ? data : null;
  } catch {
    return null;
  }
}

export function clearMission(storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
