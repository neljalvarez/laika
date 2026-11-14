import { describe, expect, it } from "vitest";
import { GEAR, LAIKA_FRAMES, PALETTE, earnedGear, withGear } from "@/components/pixel/sprites";
import { EVENTS } from "@/data/events";
import { MODULES } from "@/data/modules";
import { SCIENCE_CARDS, scienceCard } from "@/data/science";
import { CONFIG } from "@/game/config";
import { bestDecision, engineeringLesson, whatToImprove } from "@/game/debrief";
import { INSIGHTS, INSIGHT_ORDER } from "@/game/insights";
import { missionText, planDailyMission } from "@/game/missions";
import { loadMission, SAVE_KEY, type StorageLike } from "@/game/persistence";
import { MODULE_IDS, type MissionState } from "@/game/types";
import { nextSol, playCampaign, run, start } from "./helpers";

const clearEvent = (s: MissionState): MissionState => ({ ...s, pendingEvent: null });
function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("science cards", () => {
  it("has the five required topics plus the Laika history card", () => {
    expect(SCIENCE_CARDS.map((c) => c.id)).toEqual(["power", "radiation", "water", "food", "reliability", "laika"]);
  });
  it("every card has an official https source, a simplification and a game link", () => {
    for (const c of SCIENCE_CARDS) {
      expect(c.sources.length).toBeGreaterThan(0);
      for (const s of c.sources) expect(s.url).toMatch(/^https:\/\/(www\.)?(nasa\.gov|jpl\.nasa\.gov|starchild\.gsfc\.nasa\.gov|swri\.org)\//);
      expect(c.simplified.length).toBeGreaterThan(20);
      expect(c.mechanic.length).toBeGreaterThan(10);
    }
  });
  it("every building's 'why' line links to a real card, and every insight too", () => {
    for (const id of MODULE_IDS) expect(scienceCard(MODULES[id].card)).toBeDefined();
    for (const id of INSIGHT_ORDER) expect(scienceCard(INSIGHTS[id].card)).toBeDefined();
  });
});

describe("event explanations", () => {
  it("every choice has an engineering idea and an after-choice explanation", () => {
    for (const e of Object.values(EVENTS)) {
      for (const c of e.choices) {
        expect(c.idea.length).toBeGreaterThan(10);
        expect(c.after.length).toBeGreaterThan(10);
      }
    }
  });
  it("the outcome shows the explanation for the choice actually taken", () => {
    const s = run({ ...nextSol(start()), pendingEvent: "dust_storm" }, { type: "RESOLVE_EVENT", choiceId: "conserve" });
    expect(s.eventOutcome?.after).toBe(EVENTS.dust_storm.choices[0].after);
  });
});

describe("daily missions", () => {
  it("suggests repairing the most damaged building first", () => {
    const s = start();
    const hurt: MissionState = { ...s, modules: { ...s.modules, battery: { level: 1, condition: 50 }, shelter: { level: 1, condition: 40 } } };
    expect(planDailyMission(hurt)).toMatchObject({ kind: "repair", moduleId: "shelter" });
  });
  it("Sol 1 suggests an affordable upgrade and completing it marks the mission done", () => {
    const s = start();
    expect(s.dailyMission).toMatchObject({ sol: 1, kind: "upgrade", moduleId: "lifeSupport", done: false });
    const other = run(s, { type: "UPGRADE", moduleId: "solar" });
    expect(other.dailyMission.done).toBe(false);
    const done = run(s, { type: "UPGRADE", moduleId: "lifeSupport" });
    expect(done.dailyMission.done).toBe(true);
    expect(done.missionsDone).toEqual([1]);
    expect(done.log.some((e) => e.title === "Daily mission complete")).toBe(true);
  });
  it("a new mission is planned each sol, and missions never touch resources", () => {
    const s = start();
    const a = run(s, { type: "UPGRADE", moduleId: "lifeSupport" });
    const b = run(s, { type: "UPGRADE", moduleId: "lifeSupport" });
    expect(a.resources).toEqual(b.resources);
    const n = nextSol(a);
    expect(n.dailyMission.sol).toBe(2);
    expect(n.resources.materials).toBe(s.resources.materials - CONFIG.upgradeCost.lifeSupport[0]);
    expect(missionText(n.dailyMission).length).toBeGreaterThan(5);
  });
  it("the 'safe' mission completes only when no meter ends the sol in the red", () => {
    const s = start();
    const safe = { ...s, dailyMission: { sol: 1, kind: "safe" as const, done: false } };
    expect(nextSol(safe).missionsDone).toEqual([1]);
    const risky = { ...safe, resources: { ...safe.resources, radiation: 95 } };
    expect(nextSol(risky).missionsDone).toEqual([]);
  });
  it("suggests HIGH greenhouse when food is low and crops are ready", () => {
    const s = start();
    const hungry: MissionState = { ...s, cropProgress: 2, resources: { ...s.resources, food: 4 } };
    expect(planDailyMission(hungry)).toMatchObject({ kind: "food", moduleId: "greenhouse" });
    const done = run({ ...hungry, dailyMission: planDailyMission(hungry) }, { type: "SET_GREENHOUSE_MODE", mode: "HIGH" });
    expect(done.dailyMission.done).toBe(true);
  });
  it("re-plans when an emergency spends the materials the mission needed", () => {
    const s = start();
    const poor: MissionState = { ...s, sol: 2, pendingEvent: "panel_dust", resources: { ...s.resources, materials: 16 }, dailyMission: { sol: 2, kind: "upgrade", moduleId: "lifeSupport", done: false } };
    const after = run(poor, { type: "RESOLVE_EVENT", choiceId: "clean" });
    expect(after.resources.materials).toBe(12);
    expect(after.dailyMission.moduleId).not.toBe("lifeSupport");
  });
  it("a careful player completes most daily missions", () => {
    const s = playCampaign(1957, "careful");
    expect(s.missionsDone.length).toBeGreaterThanOrEqual(4);
  });
});

describe("minigame bonus", () => {
  it("a won minigame adds the bonus to a repair and to an upgrade; skipping gives the normal result", () => {
    const base = start();
    const worn: MissionState = { ...base, modules: { ...base.modules, solar: { level: 1, condition: 50 } } };
    expect(run(worn, { type: "REPAIR", moduleId: "solar" }).modules.solar.condition).toBe(80);
    expect(run(worn, { type: "REPAIR", moduleId: "solar", bonus: true }).modules.solar.condition).toBe(90);
    expect(run(worn, { type: "UPGRADE", moduleId: "solar" }).modules.solar).toEqual({ level: 2, condition: 50 });
    expect(run(worn, { type: "UPGRADE", moduleId: "solar", bonus: true }).modules.solar).toEqual({ level: 2, condition: 60 });
    expect(run(base, { type: "UPGRADE", moduleId: "solar", bonus: true }).modules.solar.condition).toBe(100);
  });
  it("the bonus never changes cost or allows a second build", () => {
    const s = run(start(), { type: "UPGRADE", moduleId: "solar", bonus: true }, { type: "REPAIR", moduleId: "habitat", bonus: true });
    expect(s.resources.materials).toBe(60 - 12);
    expect(s.actionsLeft).toBe(0);
  });
});

describe("engineering insights", () => {
  it("appear for real situations, once each, and never change resources", () => {
    let s = start();
    const r0 = s.resources;
    s = run(s, { type: "SET_GREENHOUSE_MODE", mode: "HIGH" });
    expect(s.insightQueue).toEqual(["foodPower"]);
    expect(s.resources).toEqual(r0);
    s = run(s, { type: "SET_GREENHOUSE_MODE", mode: "LOW" }, { type: "SET_GREENHOUSE_MODE", mode: "HIGH" });
    expect(s.insights.filter((i) => i === "foodPower").length).toBe(1);
    s = run(s, { type: "DISMISS_INSIGHT" });
    expect(s.insightQueue).toEqual([]);
    expect(s.insights).toContain("foodPower");
    s = run(s, { type: "UPGRADE", moduleId: "lifeSupport" });
    expect(s.insightQueue).toEqual(["repairUpgrade", "recycle"]);
  });
  it("crops and radiation insights follow the real events", () => {
    let s = start();
    s = clearEvent(nextSol(s));
    s = clearEvent(nextSol(s));
    expect(s.insights).toContain("crops");
    s = run({ ...s, pendingEvent: "solar_radiation" }, { type: "RESOLVE_EVENT", choiceId: "shelter" });
    expect(s.insights).toContain("radiation");
  });
});

describe("debrief lines come from the record", () => {
  it("best decision is a real high-quality choice; neutral when there is none", () => {
    const s = playCampaign(1957, "careful");
    const best = bestDecision(s)!;
    const strong = s.decisions.find((d) => d.quality >= 1 && d.eventId !== "resupply")!;
    expect(best.title).toContain(strong.choiceLabel);
    expect(bestDecision(start())).toBeNull();
  });
  it("lesson reflects shortages when they happened", () => {
    const s = playCampaign(3, "neglect");
    const lesson = engineeringLesson(s);
    if (s.metrics.powerShortageSols > 0) expect(lesson.title).toBe("Power comes first");
    else if (s.metrics.foodShortageSols > 0) expect(lesson.title).toBe("Food takes planning");
    expect(whatToImprove(s)).not.toBeNull();
  });
});

describe("Laika's gear", () => {
  it("unlocks by sol reached, with the medal only for a successful mission", () => {
    expect(earnedGear(1, false)).toEqual([]);
    expect(earnedGear(4, false).map((g) => g.id)).toEqual(["patch", "antenna"]);
    expect(earnedGear(10, false).map((g) => g.id)).not.toContain("medal");
    expect(earnedGear(10, true).map((g) => g.id)).toContain("medal");
  });
  it("gear keeps every frame 24×24 with known colours", () => {
    for (const frames of Object.values(LAIKA_FRAMES)) {
      for (const f of frames) {
        const g = withGear(f, GEAR);
        expect(g.length).toBe(24);
        for (const row of g) {
          expect(row.length).toBe(24);
          for (const ch of row) expect(ch === "." || ch in PALETTE).toBe(true);
        }
      }
    }
  });
});

describe("save compatibility", () => {
  it("a Phase 3 save without missions or insights still loads and gets a mission", () => {
    const storage = memoryStorage();
    const old: Record<string, unknown> = { ...nextSol(start(9)) };
    delete old.dailyMission;
    delete old.missionsDone;
    delete old.insights;
    delete old.insightQueue;
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    const loaded = loadMission(storage)!;
    expect(loaded.dailyMission.sol).toBe(2);
    expect(loaded.missionsDone).toEqual([]);
    expect(loaded.insights).toEqual([]);
    expect(loaded.resources).toEqual(old.resources);
  });
});
