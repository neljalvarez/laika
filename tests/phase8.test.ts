import { describe, expect, it } from "vitest";
import { failureTotalMs, outroTotalMs } from "@/components/Cutscene";
import { SIMPLE } from "@/data/simple";
import { EVENTS } from "@/data/events";
import { TUTORIAL_STAGES } from "@/data/tutorial";
import { getHint } from "@/game/hints";
import { computeScore } from "@/game/scoring";
import { MODULE_IDS, type MissionState } from "@/game/types";
import { parseUiPrefs, TEXT_SCALE } from "@/lib/prefs";
import { playCampaign, run, start } from "./helpers";

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

describe("endings", () => {
  const won = playCampaign(1957, "careful");
  const lost = playCampaign(1957, "neglect");
  it("the success ending lasts 35–45 s including the memorial", () => {
    expect(["success", "outstanding"]).toContain(won.status);
    const ms = outroTotalMs(won);
    expect(ms).toBeGreaterThanOrEqual(35000);
    expect(ms).toBeLessThanOrEqual(45000);
  });
  it("the failure scene lasts 6–8 s", () => {
    expect(lost.status).toBe("failure");
    const ms = failureTotalMs(lost);
    expect(ms).toBeGreaterThanOrEqual(6000);
    expect(ms).toBeLessThanOrEqual(8000);
  });
  it("building the cinematics never changes the mission or its score", () => {
    for (const s of [won, lost]) {
      const before = computeScore(s);
      const frozen = deepFreeze(JSON.parse(JSON.stringify(s)) as MissionState);
      expect(() => outroTotalMs(frozen)).not.toThrow();
      expect(() => failureTotalMs(frozen)).not.toThrow();
      expect(computeScore(frozen)).toEqual(before);
    }
  });
});

describe("hints", () => {
  it("are read-only and point at a real target", () => {
    const s = deepFreeze(start(1957));
    const h = getHint(s);
    expect(h).not.toBeNull();
    expect(h!.target.length).toBeGreaterThan(0);
  });
  it("point at a damaged building the player can repair", () => {
    const s = { ...start(1957), modules: { ...start(1957).modules, battery: { level: 1 as const, condition: 30 } } };
    expect(getHint(s)).toMatchObject({ kind: "repair", moduleId: "battery" });
  });
  it("never suggest building after today's build is used", () => {
    let s = start(1957);
    s = run(s, { type: "UPGRADE", moduleId: "solar" });
    s = { ...s, modules: { ...s.modules, battery: { level: 1 as const, condition: 30 } } };
    const h = getHint(s);
    expect(h?.kind).not.toBe("repair");
  });
  it("point at the food system when food is about to run out", () => {
    const s = { ...start(1957), resources: { ...start(1957).resources, food: 2 } };
    expect(getHint(s)).toMatchObject({ kind: "food", moduleId: "greenhouse" });
  });
  it("say 'advance' when nothing is urgent and nothing is pending", () => {
    let s = start(1957);
    s = run(s, { type: "UPGRADE", moduleId: "lifeSupport" });
    expect(getHint(s)?.kind).toBe("advance");
  });
  it("are silent during the tutorial", () => {
    const s = { ...start(1957), tutorial: { ...start(1957).tutorial, active: true } };
    expect(getHint(s)).toBeNull();
  });
});

describe("reading preferences", () => {
  it("default to Standard text, Detailed explanations and automatic hints on", () => {
    expect(parseUiPrefs(null)).toEqual({ textSize: "standard", explain: "detailed", autoHints: true });
    expect(parseUiPrefs("{bad json")).toEqual({ textSize: "standard", explain: "detailed", autoHints: true });
    expect(parseUiPrefs(JSON.stringify({ textSize: "xl", explain: "simple", autoHints: false }))).toEqual({ textSize: "xl", explain: "simple", autoHints: false });
  });
  it("scale text by 100 / 115 / 130%", () => {
    expect(TEXT_SCALE).toEqual({ standard: 1, large: 1.15, xl: 1.3 });
  });
  it("Simple mode has a short line for every building, event and tutorial step", () => {
    for (const id of MODULE_IDS) expect(SIMPLE.modules[id].length).toBeLessThanOrEqual(45);
    for (const id of Object.keys(EVENTS) as (keyof typeof EVENTS)[]) expect(SIMPLE.events[id].length).toBeLessThanOrEqual(45);
    expect(SIMPLE.tutorial).toHaveLength(TUTORIAL_STAGES.length);
    expect(SIMPLE.notEnough(14, 10)).toContain("14");
  });
});
