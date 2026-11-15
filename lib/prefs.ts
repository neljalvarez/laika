// Player preferences that are not audio: text size, explanation style and
// automatic hints. Stored in localStorage; they never touch game mechanics.
import { useSyncExternalStore } from "react";

export type TextSize = "standard" | "large" | "xl";
export type ExplainStyle = "simple" | "detailed";
export interface UiPrefs {
  textSize: TextSize;
  explain: ExplainStyle;
  autoHints: boolean;
}

export const TEXT_SCALE: Record<TextSize, number> = { standard: 1, large: 1.15, xl: 1.3 };
export const TEXT_SIZE_LABEL: Record<TextSize, string> = { standard: "Standard", large: "Large", xl: "Extra Large" };
export { UI_PREFS_KEY } from "./prefsKey";
import { UI_PREFS_KEY } from "./prefsKey";
export const DEFAULT_UI_PREFS: UiPrefs = { textSize: "standard", explain: "detailed", autoHints: true };

let prefs: UiPrefs = DEFAULT_UI_PREFS;
let loaded = false;
const listeners = new Set<() => void>();

/** Parses stored preferences, falling back to defaults for anything unknown. */
export function parseUiPrefs(raw: string | null): UiPrefs {
  try {
    const p = raw ? (JSON.parse(raw) as Partial<UiPrefs>) : {};
    return {
      textSize: p.textSize === "large" || p.textSize === "xl" ? p.textSize : "standard",
      explain: p.explain === "simple" ? "simple" : "detailed",
      autoHints: p.autoHints !== false,
    };
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

function apply(p: UiPrefs): void {
  if (typeof document === "undefined") return;
  // Only text uses --ts, so buildings and the outpost keep their size.
  document.documentElement.style.setProperty("--ts", String(TEXT_SCALE[p.textSize]));
  document.documentElement.dataset.textSize = p.textSize;
  // Layout-following overlays (tutorial and hint spotlights) re-measure on resize.
  window.dispatchEvent(new Event("resize"));
}

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    prefs = parseUiPrefs(window.localStorage.getItem(UI_PREFS_KEY));
  } catch {
    prefs = DEFAULT_UI_PREFS;
  }
}

export function getUiPrefs(): UiPrefs {
  load();
  return prefs;
}

export function setUiPref<K extends keyof UiPrefs>(key: K, value: UiPrefs[K]): void {
  load();
  if (prefs[key] === value) return;
  prefs = { ...prefs, [key]: value };
  try {
    window.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Still applies for this visit.
  }
  apply(prefs);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useUiPrefs(): UiPrefs {
  return useSyncExternalStore(subscribe, getUiPrefs, () => DEFAULT_UI_PREFS);
}

