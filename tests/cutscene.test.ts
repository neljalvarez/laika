import { describe, expect, it } from "vitest";
import { INTRO_TOTAL_MS } from "@/components/Cutscene";
import { gradeFor } from "@/game/scoring";
import { migrateSave } from "@/game/persistence";
import { createInitialState } from "@/game/initialState";

describe("cutscenes and grades", () => {
  it("intro runs about 20 seconds", () => {
    expect(INTRO_TOTAL_MS).toBeGreaterThanOrEqual(18000);
    expect(INTRO_TOTAL_MS).toBeLessThanOrEqual(22000);
  });
  it("grades follow the score bands", () => {
    expect(gradeFor(95)).toBe("A+");
    expect(gradeFor(81.2)).toBe("A");
    expect(gradeFor(70)).toBe("B");
    expect(gradeFor(60)).toBe("C");
    expect(gradeFor(12)).toBe("D");
  });
  it("old saves without gears migrate from upgrades already built", () => {
    const s = createInitialState(7, false);
    const old = JSON.parse(JSON.stringify(s));
    delete old.gears;
    old.metrics.upgradesBuilt = 3;
    const m = migrateSave(old);
    expect(m?.gears).toBe(3);
  });
});
