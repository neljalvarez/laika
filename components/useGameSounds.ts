"use client";

// Connects the sound engine to the game: global button feedback through event
// delegation, and gameplay cues derived from real MissionState transitions
// (never from re-renders).
import { useEffect, useRef, useSyncExternalStore } from "react";
import { criticalResources } from "@/game/status";
import type { MissionState } from "@/game/types";
import {
  getAudioPrefs,
  isSoundEnabled,
  playSound,
  SERVER_PREFS,
  setAudioPref,
  setSoundEnabled,
  subscribeSound,
  unlockAudio,
  type AudioPrefKey,
  type AudioPrefs,
} from "@/lib/sound";

const INTERACTIVE = 'button, [role="button"], a[href]';

function liveControl(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(INTERACTIVE);
  if (!el) return null;
  if (el instanceof HTMLButtonElement && el.disabled) return null;
  if (el.getAttribute("aria-disabled") === "true") return null;
  return el;
}

/** Hover and click cues for every enabled control, plus the audio unlock. */
export function useUiSounds(): void {
  useEffect(() => {
    let hovered: Element | null = null;
    const unlock = () => unlockAudio();
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = liveControl(e.target);
      if (el === hovered) return; // moving inside the same button stays silent
      hovered = el;
      if (el) playSound("hover");
    };
    const onClick = (e: MouseEvent) => {
      const el = liveControl(e.target);
      if (!el) return;
      playSound(el.hasAttribute("data-module") ? "select" : "click");
    };
    const onKey = (e: KeyboardEvent) => {
      unlock();
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = liveControl(e.target);
      if (el?.hasAttribute("data-module")) playSound("select");
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}

/** Gameplay cues. Each fires once, when the underlying state actually changes. */
export function useGameSounds(mission: MissionState | null): void {
  const prev = useRef<MissionState | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = mission;
    // No cue on first load / Continue: only on changes within the same mission.
    if (!mission || !before || before.seed !== mission.seed || before.log.length > mission.log.length) return;

    const finishedNow = mission.status !== "playing" && mission.status !== "intro";
    const debriefShown = finishedNow && !mission.reportPending;
    const debriefWasShown = before.status !== "playing" && before.status !== "intro" && !before.reportPending;
    if (debriefShown && !debriefWasShown) {
      playSound(mission.status === "failure" ? "failure" : "success", 150);
      return;
    }

    const built = mission.metrics.upgradesBuilt + mission.metrics.repairsDone;
    const builtBefore = before.metrics.upgradesBuilt + before.metrics.repairsDone;
    if (built > builtBefore) playSound("upgrade", 60);

    // A rejected action sets a notice; viewing a disabled button never does.
    if (mission.notice && mission.notice !== before.notice) playSound("error", 40);

    const t = mission.tutorial;
    if (before.tutorial.active && (t.step > before.tutorial.step || (!t.active && t.completed))) playSound("tutorial", 60);

    // The new-sol splash appears as soon as the engine has advanced the sol.
    if (mission.sol > before.sol && mission.status === "playing") playSound("sol", 80);
    // A daily mission finished, or a new piece of gear unlocked: small reward jingle.
    if (mission.missionsDone.length > before.missionsDone.length) playSound("upgrade", 150);
    else if (mission.sol > before.sol && [2, 4, 6, 8].includes(mission.sol)) playSound("upgrade", 900);
    if (mission.gears > before.gears) playSound("gear", 700);
    if (mission.insightQueue.length > before.insightQueue.length && !mission.pendingEvent) playSound("tutorial", 600);

    const eventVisible = mission.pendingEvent !== null && !mission.reportPending;
    const eventWasVisible = before.pendingEvent !== null && !before.reportPending;
    if (eventVisible && !eventWasVisible) playSound(mission.pendingEvent === "resupply" ? "tutorial" : "event", 450);

    const wasCritical = new Set(criticalResources(before));
    if (criticalResources(mission).some((k) => !wasCritical.has(k))) playSound("warning", 250);
  }, [mission]);
}

/** Sound ON/OFF preference shared by every toggle button. */
export function useSoundEnabled(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);
  return [on, setSoundEnabled];
}

/** All four audio switches (music, ambience, sound effects, master). */
export function useAudioPrefs(): [AudioPrefs, (key: AudioPrefKey, on: boolean) => void] {
  const prefs = useSyncExternalStore(subscribeSound, getAudioPrefs, () => SERVER_PREFS);
  return [prefs, setAudioPref];
}
