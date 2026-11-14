import { describe, expect, it } from "vitest";
import { EVENTS } from "@/data/events";
import { CONFIG } from "@/game/config";
import { advanceSol, simulateSol, solarGeneration } from "@/game/engine";
import { canAfford, eligibleEvents } from "@/game/events";
import { createInitialState } from "@/game/initialState";
import { clearMission, loadMission, saveMission, SAVE_KEY, type StorageLike } from "@/game/persistence";
import { missionReducer, rootReducer } from "@/game/reducer";
import { computeScore } from "@/game/scoring";
import { canRepair, canUpgrade } from "@/game/upgrades";
import type { MissionState } from "@/game/types";
import { nextSol, playCampaign, run, start } from "./helpers";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const finite = (s: MissionState) =>
  Object.values(s.resources).every((v) => Number.isFinite(v) && v >= 0) &&
  s.resources.lifeSupport <= 100 &&
  s.resources.radiation <= 100 &&
  s.resources.food <= CONFIG.foodCap;

describe("initial state", () => {
  it("1. matches the specified starting resources", () => {
    const s = createInitialState(1, true);
    expect(s.sol).toBe(1);
    expect(s.maxSols).toBe(10);
    expect(s.resources).toEqual({ power: 75, lifeSupport: 85, materials: 60, food: 12, radiation: 0 });
    expect(Object.values(s.modules).every((m) => m.level === 1 && m.condition === 100)).toBe(true);
    expect(s.greenhouseMode).toBe("LOW");
    expect(s.weather).toBe("CLEAR");
    expect(s.pendingEvent).toBeNull();
    expect(s.actionsLeft).toBe(1);
    expect(s.status).toBe("intro");
  });
});

describe("resource engine", () => {
  it("2. keeps all five resources valid and finite across whole campaigns", () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(finite(playCampaign(seed, "careful"))).toBe(true);
      expect(finite(playCampaign(seed, "neglect"))).toBe(true);
    }
  });

  it("3. clear vs dusty vs dust-storm solar generation differs as defined", () => {
    const s = start();
    expect(solarGeneration(s, "CLEAR")).toBe(20);
    expect(solarGeneration(s, "DUSTY")).toBe(15);
    expect(solarGeneration(s, "STORM")).toBe(8);
  });

  it("4. a power shortage has visible, consistent consequences", () => {
    const base = start();
    const s: MissionState = { ...base, resources: { ...base.resources, power: 0 }, weather: "STORM" };
    const sim = simulateSol(s);
    expect(sim.powerShortage).toBe(true);
    expect(sim.report.powerShortage).toBe(true);
    expect(sim.report.notes.some((n) => n.includes("POWER SHORTAGE"))).toBe(true);
    expect(sim.report.resources.lifeSupport.lines.some((l) => l.label.includes("Power shortage"))).toBe(true);
    const normal = simulateSol(base);
    expect(sim.resources.lifeSupport).toBeLessThan(normal.resources.lifeSupport);
    const after = advanceSol(s);
    expect(after.powerEmergencySols).toBe(1);
    expect(after.metrics.powerShortageSols).toBe(1);
  });

  it("5. crop establishment delays the first harvest by two sols", () => {
    let s = start();
    const food0 = s.resources.food;
    s = nextSol(s);
    expect(s.cropProgress).toBe(1);
    expect(s.resources.food).toBe(food0 - 2);
    s = { ...s, pendingEvent: null, effects: [] };
    s = nextSol(s);
    expect(s.cropProgress).toBe(2);
    expect(s.resources.food).toBe(food0 - 4);
    s = { ...s, pendingEvent: null, effects: [] };
    const sim = simulateSol(s);
    expect(sim.report.resources.food.lines.find((l) => l.label.includes("harvest"))?.amount).toBeGreaterThan(0);
  });

  it("6. OFF / LOW / HIGH change power use and food output", () => {
    const base: MissionState = { ...start(), cropProgress: 2 };
    const sims = (["OFF", "LOW", "HIGH"] as const).map((mode) => simulateSol({ ...base, greenhouseMode: mode }));
    const [off, low, high] = sims;
    expect(off.resources.power - low.resources.power).toBe(3);
    expect(off.resources.power - high.resources.power).toBe(7);
    expect(off.resources.food).toBe(10);
    expect(low.resources.food).toBe(12);
    expect(high.resources.food).toBe(15);
  });

  it("14. Sol 10 produces a debrief status, never Sol 11", () => {
    const s = playCampaign(1957, "careful");
    expect(s.sol).toBeLessThanOrEqual(10);
    expect(s.status).not.toBe("playing");
    const again = missionReducer(missionReducer(s, { type: "DISMISS_REPORT" }), { type: "ADVANCE_SOL" });
    expect(again.sol).toBe(s.sol);
    expect(again.history.length).toBe(s.history.length);
  });

  it("does not advance twice when Advance is clicked twice quickly", () => {
    const s = run(start(), { type: "ADVANCE_SOL" }, { type: "ADVANCE_SOL" });
    expect(s.sol).toBe(2);
    expect(s.history.length).toBe(1);
  });
});

describe("engineering actions", () => {
  it("7. an unaffordable upgrade or repair cannot be performed", () => {
    const base = start();
    const poor: MissionState = {
      ...base,
      resources: { ...base.resources, materials: 3 },
      modules: { ...base.modules, solar: { level: 1, condition: 50 } },
    };
    expect(canUpgrade(poor, "solar").ok).toBe(false);
    expect(canRepair(poor, "solar").ok).toBe(false);
    const after = run(poor, { type: "UPGRADE", moduleId: "solar" }, { type: "REPAIR", moduleId: "solar" });
    expect(after.modules.solar).toEqual({ level: 1, condition: 50 });
    expect(after.resources.materials).toBe(3);
    expect(after.notice).toBeTruthy();
  });

  it("8. an upgrade changes later sol calculations", () => {
    const base = start();
    const up = run(base, { type: "UPGRADE", moduleId: "solar" });
    expect(up.resources.materials).toBe(60 - 12);
    expect(solarGeneration(up)).toBe(28);
    // Battery upgrade raises usable storage.
    const full: MissionState = { ...base, resources: { ...base.resources, power: 100 } };
    const bat = run(full, { type: "UPGRADE", moduleId: "battery" });
    expect(simulateSol(bat).resources.power).toBeGreaterThan(simulateSol(full).resources.power - 0.01);
    // Life support and shelter upgrades change their own terms.
    const ls = run(base, { type: "UPGRADE", moduleId: "lifeSupport" });
    expect(simulateSol(ls).resources.lifeSupport).toBeGreaterThan(simulateSol(base).resources.lifeSupport);
    const sh = run(base, { type: "UPGRADE", moduleId: "shelter" });
    expect(simulateSol(sh).resources.radiation).toBeLessThan(simulateSol(base).resources.radiation);
    const hab = run(base, { type: "UPGRADE", moduleId: "habitat" });
    expect(simulateSol(hab).resources.lifeSupport).toBeGreaterThan(simulateSol(base).resources.lifeSupport);
    const gh = run({ ...base, cropProgress: 2 }, { type: "UPGRADE", moduleId: "greenhouse" });
    expect(simulateSol(gh).resources.food).toBeGreaterThan(simulateSol({ ...base, cropProgress: 2 }).resources.food);
  });

  it("9. only one engineering action per sol", () => {
    const s = run(start(), { type: "UPGRADE", moduleId: "solar" }, { type: "UPGRADE", moduleId: "battery" });
    expect(s.modules.solar.level).toBe(2);
    expect(s.modules.battery.level).toBe(1);
    expect(s.actionsLeft).toBe(0);
    const repaired = run(s, { type: "REPAIR", moduleId: "habitat" });
    expect(repaired.resources.materials).toBe(s.resources.materials);
    const next = nextSol(s);
    expect(next.actionsLeft).toBe(1);
  });

  it("damage reduces effectiveness and repair restores it", () => {
    const base = start();
    const hurt: MissionState = { ...base, modules: { ...base.modules, solar: { level: 1, condition: 40 } } };
    expect(solarGeneration(hurt)).toBeLessThan(20);
    const fixed = run(hurt, { type: "REPAIR", moduleId: "solar" });
    expect(fixed.modules.solar.condition).toBe(70);
    expect(solarGeneration(fixed)).toBeGreaterThan(solarGeneration(hurt));
  });
});

describe("events", () => {
  it("10. a pending mandatory event blocks advancing until resolved", () => {
    const s = nextSol(start());
    expect(s.sol).toBe(2);
    expect(s.pendingEvent).not.toBeNull();
    const blocked = run(s, { type: "ADVANCE_SOL" });
    expect(blocked.sol).toBe(2);
    expect(blocked.notice).toBeTruthy();
    const choice = EVENTS[s.pendingEvent!].choices.find((c) => canAfford(s, c).ok)!;
    const resolved = run(s, { type: "RESOLVE_EVENT", choiceId: choice.id }, { type: "DISMISS_OUTCOME" });
    expect(resolved.pendingEvent).toBeNull();
    expect(resolved.decisions.length).toBe(1);
    expect(nextSol(resolved).sol).toBe(3);
  });

  it("11. event sequence is reproducible from a saved seed", () => {
    const a = playCampaign(4242, "careful");
    const b = playCampaign(4242, "careful");
    expect(a.decisions).toEqual(b.decisions);
    expect(a.resources).toEqual(b.resources);
    const seqs = new Set([1, 2, 3, 4, 5, 6].map((seed) => playCampaign(seed, "careful").seenEvents.join(",")));
    expect(seqs.size).toBeGreaterThan(1);
  });

  it("every event always has at least one free choice, and unaffordable ones are refused", () => {
    for (const e of Object.values(EVENTS)) {
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
      expect(e.choices.some((c) => Object.keys(c.cost).length === 0)).toBe(true);
    }
    const base = nextSol(start());
    const broke: MissionState = { ...base, pendingEvent: "panel_dust", resources: { ...base.resources, materials: 0 } };
    const refused = run(broke, { type: "RESOLVE_EVENT", choiceId: "clean" });
    expect(refused.pendingEvent).toBe("panel_dust");
    expect(refused.notice).toBeTruthy();
  });

  it("event choices have real mechanical consequences", () => {
    const base: MissionState = { ...nextSol(start()), pendingEvent: "solar_radiation" };
    const stay = run(base, { type: "RESOLVE_EVENT", choiceId: "stay" });
    const shelter = run(base, { type: "RESOLVE_EVENT", choiceId: "shelter" });
    expect(stay.resources.radiation - base.resources.radiation).toBe(26);
    expect(shelter.resources.radiation).toBeLessThan(stay.resources.radiation);
    expect(shelter.effects.some((e) => e.sheltering)).toBe(true);
  });

  it("the selector does not stack hazards on a resource already in trouble", () => {
    const base = nextSol(nextSol(nextSol({ ...start(), seenEvents: [] })));
    const weak: MissionState = {
      ...base,
      sol: 5,
      pendingEvent: null,
      seenEvents: [],
      resources: { ...base.resources, lifeSupport: 20, power: 10, food: 1, radiation: 90 },
    };
    const ids = eligibleEvents(weak).map((e) => e.id);
    expect(ids).toEqual(["resupply"]);
  });
});

describe("persistence", () => {
  it("12. save/load preserves the exact gameplay state and no reroll happens", () => {
    const storage = memoryStorage();
    let s = nextSol(start(777));
    s = run(s, { type: "UPGRADE", moduleId: "solar" });
    expect(saveMission(s, storage)).toBe(true);
    const loaded = loadMission(storage);
    expect(loaded).toEqual(s);
    const choice = EVENTS[s.pendingEvent!].choices.find((c) => canAfford(s, c).ok)!.id;
    const cont = (x: MissionState) =>
      nextSol(run(x, { type: "RESOLVE_EVENT", choiceId: choice }, { type: "DISMISS_OUTCOME" }));
    expect(cont(loaded!)).toEqual(cont(s));
  });

  it("rejects corrupt or outdated saves", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, "{not json");
    expect(loadMission(storage)).toBeNull();
    storage.setItem(SAVE_KEY, JSON.stringify({ ...start(), version: 0 }));
    expect(loadMission(storage)).toBeNull();
    expect(loadMission(null)).toBeNull();
    expect(saveMission(start(), null)).toBe(false);
  });

  it("13. restart clears the old state", () => {
    const storage = memoryStorage();
    saveMission(nextSol(start()), storage);
    expect(clearMission(storage)).toBe(true);
    expect(loadMission(storage)).toBeNull();
    expect(rootReducer(start(), { type: "RESET" })).toBeNull();
    const fresh = createInitialState(5, false);
    expect(fresh.sol).toBe(1);
    expect(fresh.history).toEqual([]);
  });
});

describe("endings and scoring", () => {
  it("15. mission failure can occur and has a reason", () => {
    const base = start();
    const s: MissionState = { ...base, resources: { ...base.resources, lifeSupport: 2 } };
    const after = advanceSol(s);
    expect(after.status).toBe("failure");
    expect(after.failureReason).toMatch(/life-support/i);
  });

  it("two sols in a row without essential power aborts the mission", () => {
    const base = start();
    let s: MissionState = { ...base, resources: { ...base.resources, power: 0 }, weather: "STORM", forecast: "STORM" };
    s = nextSol(s);
    expect(s.status).toBe("playing");
    s = { ...s, pendingEvent: null, weather: "STORM", resources: { ...s.resources, power: 0 } };
    s = advanceSol(s);
    expect(s.status).toBe("failure");
    expect(s.failureReason).toMatch(/power/i);
  });

  it("16. score categories add up and total ≤ 100", () => {
    for (const strategy of ["careful", "neglect"] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const score = computeScore(playCampaign(seed, strategy));
        const sum = score.categories.reduce((a, c) => a + c.score, 0);
        expect(score.categories.map((c) => c.max).reduce((a, b) => a + b, 0)).toBe(100);
        expect(Math.abs(sum - score.total)).toBeLessThan(0.11);
        expect(score.total).toBeLessThanOrEqual(100);
        for (const c of score.categories) {
          expect(c.score).toBeGreaterThanOrEqual(0);
          expect(c.score).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  it("17. a reasonable strategy reaches a successful ending", () => {
    const results = Array.from({ length: 30 }, (_, i) => playCampaign(i + 1, "careful").status);
    const good = results.filter((r) => r === "success" || r === "outstanding").length;
    expect(playCampaign(1957, "careful").status).toMatch(/success|outstanding/);
    expect(good).toBeGreaterThanOrEqual(24);
  });

  it("18. a neglectful strategy leads to failure or a poor outcome", () => {
    const results = Array.from({ length: 30 }, (_, i) => playCampaign(i + 1, "neglect"));
    for (const r of results) expect(["failure", "partial"]).toContain(r.status);
    const careful = computeScore(playCampaign(1957, "careful")).total;
    const neglect = computeScore(playCampaign(1957, "neglect")).total;
    expect(careful).toBeGreaterThan(neglect + 15);
  });
});
