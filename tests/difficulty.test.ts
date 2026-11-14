import { describe, expect, it } from "vitest";
import { DIFFICULTIES, DIFFICULTY_ORDER, normalizeDifficulty } from "@/game/difficulty";
import { createInitialState } from "@/game/initialState";
import { loadMission, SAVE_KEY, saveMission, type StorageLike } from "@/game/persistence";
import { computeScore } from "@/game/scoring";
import type { MissionState } from "@/game/types";
import { nextSol, playCampaign, run, start } from "./helpers";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}
const clearEvent = (s: MissionState): MissionState => ({ ...s, pendingEvent: null });
const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

describe("difficulty settings", () => {
  it("each difficulty starts with its own materials; everything else starts the same", () => {
    expect(start(1, "easy").resources.materials).toBe(80);
    expect(start(1, "normal").resources.materials).toBe(60);
    expect(start(1, "hard").resources.materials).toBe(45);
    for (const d of DIFFICULTY_ORDER) {
      const s = start(1, d);
      expect(s.difficulty).toBe(d);
      expect(s.resources.power).toBe(75);
      expect(s.resources.lifeSupport).toBe(85);
      expect(s.resources.food).toBe(12);
    }
  });

  it("Normal is the original balance: no scheduled deliveries, same defaults", () => {
    expect(createInitialState(1957, false)).toEqual(createInitialState(1957, false, "normal"));
    expect(DIFFICULTIES.normal.deliveries).toEqual([]);
    expect(DIFFICULTIES.normal.emergencyResupply).toBeNull();
    for (const seed of seeds) expect(playCampaign(seed, "careful").deliveries).toEqual([]);
  });

  it("Easy deliveries arrive once each on sols 3, 5 and 7 and are logged", () => {
    let s = start(7, "easy");
    const seen: number[] = [];
    while (s.status === "playing" && s.sol < 9) {
      const before = s.resources.materials;
      s = clearEvent(nextSol(clearEvent(s)));
      if (s.resources.materials > before) seen.push(s.sol);
    }
    expect(seen).toEqual([3, 5, 7]);
    expect(s.deliveries.filter((d) => d.kind === "scheduled").map((d) => d.sol)).toEqual([3, 5, 7]);
    expect(s.log.filter((e) => e.title === "Supply delivery arrived").length).toBe(3);
  });

  it("supplies are finite on every difficulty", () => {
    for (const d of DIFFICULTY_ORDER) {
      const cfg = DIFFICULTIES[d];
      const cap = cfg.deliveries.reduce((a, x) => a + x.amount, 0) + (cfg.emergencyResupply?.amount ?? 0);
      for (const seed of seeds) {
        const s = playCampaign(seed, "neglect", d);
        const got = s.deliveries.reduce((a, x) => a + x.amount, 0);
        expect(got).toBeLessThanOrEqual(cap);
        expect(s.deliveries.filter((x) => x.kind === "emergency").length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("the Easy emergency resupply triggers once when materials are nearly gone", () => {
    let s: MissionState = { ...start(3, "easy"), resources: { ...start(3, "easy").resources, materials: 2 } };
    s = clearEvent(nextSol(s));
    expect(s.deliveries).toEqual([{ sol: 2, amount: 12, kind: "emergency" }]);
    expect(s.resources.materials).toBe(14);
    s = { ...s, resources: { ...s.resources, materials: 0 } };
    s = clearEvent(nextSol(nextSol(clearEvent(nextSol(s)))));
    expect(s.deliveries.filter((d) => d.kind === "emergency").length).toBe(1);
    const normal = clearEvent(nextSol({ ...start(3), resources: { ...start(3).resources, materials: 2 } }));
    expect(normal.deliveries).toEqual([]);
  });

  it("reloading a save cannot claim a delivery twice", () => {
    const storage = memoryStorage();
    let s = clearEvent(nextSol(clearEvent(nextSol(start(11, "easy")))));
    expect(s.sol).toBe(3);
    const materials = s.resources.materials;
    saveMission(s, storage);
    const loaded = loadMission(storage)!;
    expect(loaded.resources.materials).toBe(materials);
    expect(loaded.deliveries).toEqual(s.deliveries);
    expect(loaded.difficulty).toBe("easy");
    expect(nextSol(loaded)).toEqual(nextSol(s));
  });

  it("saves from before difficulty existed load as Normal with no deliveries", () => {
    const storage = memoryStorage();
    const legacy = { ...nextSol(start(5)), difficulty: "standard", deliveries: undefined };
    storage.setItem(SAVE_KEY, JSON.stringify(legacy));
    const loaded = loadMission(storage)!;
    expect(loaded.difficulty).toBe("normal");
    expect(loaded.deliveries).toEqual([]);
    expect(loaded.resources).toEqual(legacy.resources);
    expect(normalizeDifficulty("standard")).toBe("normal");
  });

  it("no difficulty is invincible, and all can be finished with care", () => {
    for (const d of DIFFICULTY_ORDER) {
      const neglect = seeds.map((seed) => playCampaign(seed, "neglect", d).status);
      expect(neglect.every((r) => r === "failure" || r === "partial")).toBe(true);
      const careful = seeds.map((seed) => playCampaign(seed, "careful", d));
      const finished = careful.filter((s) => s.status !== "failure").length;
      expect(finished).toBe(seeds.length);
    }
  });

  it("Easy is at least as forgiving as Hard for the same careful play", () => {
    const avg = (d: "easy" | "normal" | "hard") =>
      seeds.reduce((a, seed) => a + computeScore(playCampaign(seed, "careful", d)).total, 0) / seeds.length;
    expect(avg("easy")).toBeGreaterThan(avg("hard"));
  });

  it("difficulty never changes during a mission", () => {
    const s = run(start(2, "hard"), { type: "UPGRADE", moduleId: "solar" });
    expect(nextSol(s).difficulty).toBe("hard");
  });
});
