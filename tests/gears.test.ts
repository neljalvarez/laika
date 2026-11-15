import { describe, expect, it } from "vitest";
import { CONFIG } from "@/game/config";
import { GEAR_PERKS, GEAR_RULES } from "@/game/gears";
import { loadMission, SAVE_KEY, saveMission, type StorageLike } from "@/game/persistence";
import { gradeFor } from "@/game/scoring";
import { canUpgrade, repairAmountFor, upgradeCost } from "@/game/upgrades";
import type { MissionState, ModuleId } from "@/game/types";
import { nextSol, playCampaign, run, start } from "./helpers";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}
/** Upgrade one building per sol, ignoring events, with plenty of materials. */
function upgradeMany(ids: ModuleId[]): MissionState {
  let s: MissionState = { ...start(5), resources: { ...start(5).resources, materials: 200 } };
  for (const id of ids) {
    s = run({ ...s, pendingEvent: null }, { type: "UPGRADE", moduleId: id });
    s = { ...nextSol(s), pendingEvent: null };
  }
  return s;
}

describe("Gears", () => {
  it("each successful upgrade earns exactly one Gear; repairs and failed upgrades earn none", () => {
    const s = start();
    expect(s.gears).toBe(0);
    const up = run(s, { type: "UPGRADE", moduleId: "solar" });
    expect(up.gears).toBe(1);
    expect(run(up, { type: "UPGRADE", moduleId: "battery" }).gears).toBe(1); // no builds left today
    const worn: MissionState = { ...s, modules: { ...s.modules, solar: { level: 1, condition: 50 } } };
    expect(run(worn, { type: "REPAIR", moduleId: "solar" }).gears).toBe(0);
    const poor: MissionState = { ...s, resources: { ...s.resources, materials: 2 } };
    expect(run(poor, { type: "UPGRADE", moduleId: "solar" }).gears).toBe(0);
  });

  it("2 Gears: a one-time materials bonus, logged, never repeated", () => {
    let s = run(start(), { type: "UPGRADE", moduleId: "solar" });
    s = { ...nextSol(s), pendingEvent: null };
    const before = s.resources.materials;
    s = run(s, { type: "UPGRADE", moduleId: "battery" });
    expect(s.gears).toBe(2);
    expect(s.resources.materials).toBe(before - CONFIG.upgradeCost.battery[0] + GEAR_RULES.partsBonus);
    expect(s.log.some((e) => e.title === "Gear reward: Spare parts")).toBe(true);
    s = { ...nextSol(s), pendingEvent: null };
    const m3 = s.resources.materials;
    s = run(s, { type: "UPGRADE", moduleId: "shelter" });
    expect(s.resources.materials).toBe(m3 - CONFIG.upgradeCost.shelter[0]);
    expect(s.log.filter((e) => e.title === "Gear reward: Spare parts").length).toBe(1);
  });

  it("4 Gears: repairs fix more. 6 Gears: upgrades cost less", () => {
    const four = upgradeMany(["solar", "battery", "shelter", "lifeSupport"]);
    expect(four.gears).toBe(4);
    expect(repairAmountFor(start())).toBe(CONFIG.repairAmount);
    expect(repairAmountFor(four)).toBe(CONFIG.repairAmount + GEAR_RULES.repairBonus);
    const hurt: MissionState = { ...four, modules: { ...four.modules, habitat: { level: 1, condition: 40 } } };
    expect(run(hurt, { type: "REPAIR", moduleId: "habitat" }).modules.habitat.condition).toBe(40 + 30 + 10);
    expect(upgradeCost(four, "greenhouse")).toBe(CONFIG.upgradeCost.greenhouse[0]);
    const six = upgradeMany(["solar", "battery", "shelter", "lifeSupport", "habitat", "greenhouse"]);
    expect(six.gears).toBe(6);
    expect(upgradeCost(six, "solar")).toBe(CONFIG.upgradeCost.solar[1] - GEAR_RULES.upgradeDiscount);
    expect(canUpgrade(six, "solar").cost).toBe(CONFIG.upgradeCost.solar[1] - GEAR_RULES.upgradeDiscount);
  });

  it("total free materials from Gears is capped at one small bonus per mission", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = playCampaign(seed, "careful", "easy");
      const rewards = s.log.filter((e) => e.title === "Gear reward: Spare parts").length;
      expect(rewards).toBeLessThanOrEqual(1);
      expect(s.gears).toBe(s.metrics.upgradesBuilt);
    }
    expect(GEAR_PERKS.map((p) => p.at)).toEqual([2, 4, 6]);
  });

  it("Gears persist in saves and a reload cannot re-grant the bonus", () => {
    const storage = memoryStorage();
    let s = run(start(), { type: "UPGRADE", moduleId: "solar" });
    s = run({ ...nextSol(s), pendingEvent: null }, { type: "UPGRADE", moduleId: "battery" });
    saveMission(s, storage);
    const loaded = loadMission(storage)!;
    expect(loaded.gears).toBe(2);
    expect(loaded.resources.materials).toBe(s.resources.materials);
    expect(loaded).toEqual(s);
  });

  it("older saves count past upgrades as Gears without free materials", () => {
    const storage = memoryStorage();
    const base = run(start(), { type: "UPGRADE", moduleId: "solar" });
    const old: Record<string, unknown> = { ...base };
    delete old.gears;
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    const loaded = loadMission(storage)!;
    expect(loaded.gears).toBe(1);
    expect(loaded.resources.materials).toBe(base.resources.materials);
  });

  it("letter grades follow the score", () => {
    expect([95, 85, 75, 65, 40].map(gradeFor)).toEqual(["A+", "A", "B", "C", "D"]);
  });
});
