import { describe, expect, it } from "vitest";
import { getNextAction } from "@/data/guidance";
import { MODULES } from "@/data/modules";
import { CONFIG } from "@/game/config";
import { simulateSol } from "@/game/engine";
import { summarizeReport } from "@/game/summary";
import { MODULE_IDS, type MissionState } from "@/game/types";
import { nextSol, run, start } from "./helpers";

describe("next-step guidance comes from real state", () => {
  it("points at the emergency first", () => {
    const s = nextSol(start());
    expect(s.pendingEvent).not.toBeNull();
    expect(getNextAction(s)).toBe("An emergency needs your decision.");
  });

  it("suggests building, then advancing once the daily build is used", () => {
    const s = start();
    expect(getNextAction(s)).toMatch(/build once today/);
    expect(getNextAction(run(s, { type: "UPGRADE", moduleId: "solar" }))).toMatch(/Advance to the next sol/);
  });

  it("names the real problem when a resource is critical or a building is damaged", () => {
    const s = start();
    expect(getNextAction({ ...s, resources: { ...s.resources, power: 5 } })).toMatch(/Power is very low/);
    expect(getNextAction({ ...s, resources: { ...s.resources, lifeSupport: 10 } })).toMatch(/Air and water/);
    const hurt: MissionState = { ...s, modules: { ...s.modules, shelter: { level: 1, condition: 40 } } };
    expect(getNextAction(hurt)).toMatch(/Radiation Shelter is damaged/);
  });
});

describe("sol headline", () => {
  it("reports shortages before weather, and weather before calm", () => {
    const s = start();
    expect(summarizeReport(simulateSol({ ...s, cropProgress: 2 }).report).tone).toBe("good");
    expect(summarizeReport(simulateSol({ ...s, weather: "DUSTY" }).report).message).toMatch(/Dust reduced solar power/);
    const dark = simulateSol({ ...s, weather: "STORM", resources: { ...s.resources, power: 0 } }).report;
    expect(summarizeReport(dark)).toMatchObject({ tone: "bad" });
    expect(summarizeReport(dark).message).toMatch(/Not enough power/);
  });
});

describe("upgrade and repair stay distinct", () => {
  it("repair restores condition without changing level; upgrade raises level without repairing", () => {
    const base = start();
    const worn: MissionState = { ...base, modules: { ...base.modules, solar: { level: 1, condition: 50 } } };
    const repaired = run(worn, { type: "REPAIR", moduleId: "solar" });
    expect(repaired.modules.solar).toEqual({ level: 1, condition: 50 + CONFIG.repairAmount });
    expect(repaired.resources.materials).toBe(worn.resources.materials - CONFIG.repairCost);
    const upgraded = run(worn, { type: "UPGRADE", moduleId: "solar" });
    expect(upgraded.modules.solar).toEqual({ level: 2, condition: 50 });
    expect(run({ ...worn, modules: { ...worn.modules, solar: { level: 1, condition: 90 } } }, { type: "REPAIR", moduleId: "solar" }).modules.solar.condition).toBe(100);
  });

  it("every building has a before/after stat for each level", () => {
    for (const id of MODULE_IDS) {
      expect(MODULES[id].stat.values.length).toBe(3);
      expect(new Set(MODULES[id].stat.values).size).toBe(3);
    }
  });
});
