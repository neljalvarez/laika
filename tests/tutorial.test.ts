import { describe, expect, it } from "vitest";
import { TUTORIAL_STAGES } from "@/data/tutorial";
import { createInitialState } from "@/game/initialState";
import { loadMission, migrateSave, SAVE_KEY, saveMission, type StorageLike } from "@/game/persistence";
import { missionReducer, TUTORIAL_LAST_STEP } from "@/game/reducer";
import { criticalResources, resourceStatus } from "@/game/status";
import type { GameAction, MissionState } from "@/game/types";
import { CUES, playSound, resetSoundForTests } from "@/lib/sound";
import { nextSol, start } from "./helpers";

const run = (s: MissionState, ...a: GameAction[]) => a.reduce(missionReducer, s);
const guided = () => run(createInitialState(1957, true), { type: "BEGIN_MISSION" });
const withoutTutorial = (s: MissionState) => ({ ...s, tutorial: null, notice: null });

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("tutorial", () => {
  it("has six authored stages matching the reducer's last step", () => {
    expect(TUTORIAL_STAGES.length).toBe(6);
    expect(TUTORIAL_LAST_STEP).toBe(5);
  });

  it("a new guided mission starts in tutorial stage 0 on Sol 1", () => {
    const s = guided();
    expect(s.tutorial).toMatchObject({ active: true, step: 0, completed: false });
    expect(s.sol).toBe(1);
  });

  it("steps only advance from the stage the player is really on", () => {
    let s = guided();
    s = run(s, { type: "TUTORIAL_STEP", from: 3 });
    expect(s.tutorial.step).toBe(0);
    s = run(s, { type: "TUTORIAL_STEP", from: 0 }, { type: "TUTORIAL_STEP", from: 1 });
    expect(s.tutorial.step).toBe(2);
    s = run(s, { type: "TUTORIAL_BACK" });
    expect(s.tutorial.step).toBe(1);
  });

  it("Skip Tutorial works from every stage and changes nothing but tutorial mode", () => {
    for (let stage = 0; stage <= TUTORIAL_LAST_STEP; stage++) {
      let s = guided();
      for (let i = 0; i < stage; i++) s = run(s, { type: "TUTORIAL_STEP", from: i });
      expect(s.tutorial.step).toBe(stage);
      const skipped = run(s, { type: "TUTORIAL_SKIP" });
      expect(skipped.tutorial.active).toBe(false);
      expect(skipped.tutorial.completed).toBe(true);
      expect(withoutTutorial(skipped)).toEqual(withoutTutorial(s));
      expect(skipped.sol).toBe(1);
      expect(skipped.rng).toBe(s.rng);
      expect(skipped.status).toBe("playing");
    }
  });

  it("a skipped mission plays exactly like a mission that never had a tutorial", () => {
    const skipped = nextSol(run(guided(), { type: "TUTORIAL_SKIP" }));
    const plain = nextSol(start(1957));
    expect(withoutTutorial(skipped)).toEqual(withoutTutorial(plain));
  });

  it("finishing with the real Advance completes the tutorial and advances exactly once", () => {
    let s = guided();
    for (let i = 0; i < TUTORIAL_LAST_STEP; i++) s = run(s, { type: "TUTORIAL_STEP", from: i });
    s = run(s, { type: "ADVANCE_SOL" }, { type: "ADVANCE_SOL" });
    expect(s.sol).toBe(2);
    expect(s.history.length).toBe(1);
    expect(s.tutorial).toMatchObject({ active: false, completed: true });
  });

  it("replay turns the guide back on without touching mission progress", () => {
    let s = nextSol(nextSol(run(guided(), { type: "TUTORIAL_SKIP" })));
    s = { ...s, pendingEvent: null };
    const replay = run(s, { type: "TUTORIAL_REPLAY" });
    expect(replay.tutorial).toMatchObject({ active: true, step: 0 });
    expect(withoutTutorial(replay)).toEqual(withoutTutorial(s));
    expect(run(replay, { type: "TUTORIAL_REPLAY" })).toBe(replay);
  });

  it("continuing a save does not restart a finished tutorial", () => {
    const storage = memoryStorage();
    const s = nextSol(run(guided(), { type: "TUTORIAL_SKIP" }));
    saveMission(s, storage);
    const loaded = loadMission(storage)!;
    expect(loaded.tutorial.active).toBe(false);
    expect(loaded).toEqual(s);
  });

  it("saves made before the welcome stage still load, with steps shifted by one", () => {
    const storage = memoryStorage();
    const base = guided();
    const oldActive = { ...base, tutorial: { active: true, step: 2 } };
    storage.setItem(SAVE_KEY, JSON.stringify(oldActive));
    expect(loadMission(storage)!.tutorial).toEqual({ active: true, step: 3, completed: false, v: 2 });
    const oldDone = { ...nextSol(base), tutorial: { active: false, step: 4 } };
    storage.setItem(SAVE_KEY, JSON.stringify(oldDone));
    const loaded = loadMission(storage)!;
    expect(loaded.tutorial).toEqual({ active: false, step: 4, completed: true, v: 2 });
    expect(loaded.resources).toEqual(oldDone.resources);
    expect(migrateSave(loaded)).toBe(loaded);
  });
});

describe("shared resource status", () => {
  it("flags only resources that are really critical", () => {
    const s = start();
    expect(criticalResources(s)).toEqual([]);
    const low: MissionState = { ...s, resources: { ...s.resources, power: 10, lifeSupport: 20, food: 1, radiation: 90 } };
    expect(criticalResources(low).sort()).toEqual(["food", "lifeSupport", "power", "radiation"]);
    expect(resourceStatus(low, "power").word).toBe("Critical");
    expect(resourceStatus(s, "radiation").level).toBe("ok");
  });
});

describe("sound engine", () => {
  it("defines all eleven cues with short notes", () => {
    expect(Object.keys(CUES).length).toBe(11);
    for (const cue of Object.values(CUES)) {
      expect(cue.notes.length).toBeGreaterThan(0);
      const end = Math.max(...cue.notes.map((n) => n.t + n.d));
      expect(end).toBeLessThan(1.2);
      expect(cue.gain).toBeLessThanOrEqual(0.1);
    }
  });

  it("never throws and plays nothing when audio is unavailable or locked", () => {
    resetSoundForTests();
    expect(playSound("click")).toBe(false);
    expect(() => playSound("success")).not.toThrow();
  });
});
