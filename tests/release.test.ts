// Phase 7 release checks: every upgrade changes the real engine value it
// advertises, costs exactly what it says, and earns exactly one Gear.
import { describe, expect, it } from "vitest";
import { MODULES } from "@/data/modules";
import { CONFIG } from "@/game/config";
import { batteryCapacity, greenhouseHarvestRate, shelterMultiplier, simulateSol, solarGeneration } from "@/game/engine";
import { loadMission, migrateSave, validateSave } from "@/game/persistence";
import { computeScore } from "@/game/scoring";
import { canRepair, canUpgrade } from "@/game/upgrades";
import { MODULE_IDS, type MissionState, type ModuleId } from "@/game/types";
import { nextSol, playCampaign, run, start } from "./helpers";

/** The engine value each building's "stat" row describes. */
function engineStat(s: MissionState, id: ModuleId): string {
  const full = { ...s, modules: { ...s.modules, [id]: { ...s.modules[id], condition: 100 } }, weather: "CLEAR" as const };
  switch (id) {
    case "solar":
      return String(solarGeneration(full, "CLEAR"));
    case "battery":
      return String(batteryCapacity(full));
    case "lifeSupport": {
      const line = simulateSol({ ...full, effects: [] }).report.resources.lifeSupport.lines.find((l) => l.label.startsWith("Recycled"));
      return String(line?.amount);
    }
    case "habitat": {
      const line = simulateSol({ ...full, effects: [] }).report.resources.lifeSupport.lines.find((l) => l.label.startsWith("Laika"));
      return String(-(line?.amount ?? 0));
    }
    case "shelter":
      return `${Math.round(shelterMultiplier(full.modules.shelter) * 100)}%`;
    case "greenhouse":
      return String(greenhouseHarvestRate({ ...full, cropProgress: 5 }, "HIGH"));
  }
}

describe("every upgrade does what its card says", () => {
  for (const id of MODULE_IDS) {
    it(`${MODULES[id].name}: L1 → L2 → L3`, () => {
      let s: MissionState = { ...start(4242), resources: { ...start(4242).resources, materials: 200 } };
      expect(engineStat(s, id)).toBe(MODULES[id].stat.values[0]);
      for (const level of [2, 3] as const) {
        const before = s;
        const check = canUpgrade(s, id);
        expect(check.ok).toBe(true);
        s = run(s, { type: "UPGRADE", moduleId: id });
        expect(s.modules[id].level).toBe(level);
        expect(s.gears).toBe(before.gears + 1);
        const bonus = s.gears === 2 ? 4 : 0; // "Spare parts" perk
        expect(s.resources.materials).toBe(before.resources.materials - check.cost + bonus);
        expect(s.lastAction?.cost).toBe(check.cost);
        expect(engineStat(s, id)).toBe(MODULES[id].stat.values[level - 1]);
        expect(engineStat(s, id)).not.toBe(engineStat(before, id));
        s = { ...s, actionsLeft: 1 };
      }
      expect(canUpgrade(s, id).ok).toBe(false);
    });
  }

  it("one build per sol: a second upgrade or repair the same sol is refused and free", () => {
    let s = start(99);
    s = run(s, { type: "UPGRADE", moduleId: "solar" });
    const after = s;
    s = run(s, { type: "UPGRADE", moduleId: "battery" }, { type: "REPAIR", moduleId: "habitat" });
    expect(s.resources.materials).toBe(after.resources.materials);
    expect(s.gears).toBe(after.gears);
    expect(s.modules.battery.level).toBe(1);
  });

  it("repair restores condition but never changes level or Gears", () => {
    let s = start(7);
    s = { ...s, modules: { ...s.modules, habitat: { level: 1, condition: 40 } } };
    expect(canRepair(s, "habitat").ok).toBe(true);
    const r = run(s, { type: "REPAIR", moduleId: "habitat" });
    expect(r.modules.habitat).toEqual({ level: 1, condition: 70 });
    expect(r.gears).toBe(s.gears);
    expect(r.resources.materials).toBe(s.resources.materials - CONFIG.repairCost);
  });
});

describe("saves", () => {
  it("a JSON round-trip mid-mission keeps everything, including Gears", () => {
    let s = start(31);
    s = run(s, { type: "UPGRADE", moduleId: "solar" });
    s = nextSol(s);
    const loaded = migrateSave(JSON.parse(JSON.stringify(s)));
    expect(loaded).toEqual(s);
  });
  it("a corrupt or impossible save is refused instead of loaded", () => {
    const good = start(5);
    const mem = (v: string) => ({ getItem: () => v, setItem: () => undefined, removeItem: () => undefined });
    for (const raw of ["{", "null", "42", "{}", JSON.stringify({ ...good, version: 999 })]) expect(loadMission(mem(raw))).toBeNull();
    const badLevel = { ...good, modules: { ...good.modules, solar: { level: 4, condition: 100 } } };
    const badCond = { ...good, modules: { ...good.modules, habitat: { level: 1, condition: -50 } } };
    const badStatus = { ...good, status: "exploded" };
    for (const s of [badLevel, badCond, badStatus]) expect(validateSave(JSON.parse(JSON.stringify(s)))).toBe(false);
    expect(loadMission(mem(JSON.stringify(good)))).toEqual(good);
  });
});

describe("whole missions", () => {
  it("a careful player can finish all 10 sols on every difficulty", () => {
    for (const d of ["easy", "normal", "hard"] as const) {
      const s = playCampaign(1957, "careful", d);
      expect(["success", "outstanding"]).toContain(s.status);
      expect(s.sol).toBe(CONFIG.maxSols);
    }
  });
  it("neglect ends in failure, and the score is computed from state alone", () => {
    const s = playCampaign(1957, "neglect");
    expect(s.status).toBe("failure");
    expect(computeScore(s)).toEqual(computeScore(JSON.parse(JSON.stringify(s))));
  });
});

describe("Laika reacts to the game", () => {
  it("her mood follows real game events", async () => {
    const { getLaikaLine } = await import("@/data/dialogue");
    const s = start(12);
    expect(getLaikaLine({ ...s, status: "success" }).mood).toBe("celebrate");
    expect(getLaikaLine({ ...s, status: "failure" }).mood).toBe("resting");
    expect(getLaikaLine({ ...s, cropProgress: 5, resources: { ...s.resources, food: 3 } }).mood).toBe("concerned");
    expect(getLaikaLine({ ...s, cropProgress: 5, weather: "STORM" }).mood).toBe("alert");
    const up = run(s, { type: "UPGRADE", moduleId: "solar" });
    expect(getLaikaLine(up).mood).toBe("happy");
  });
});
