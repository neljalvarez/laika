import { describe, expect, it } from "vitest";
import { ICONS, LAIKA_FRAMES, PALETTE } from "@/components/pixel/sprites";

describe("pixel sprites", () => {
  it("every Laika frame is a 24×24 grid using known palette colours", () => {
    for (const [name, frames] of Object.entries(LAIKA_FRAMES)) {
      for (const grid of frames) {
        expect(grid.length, name).toBe(24);
        for (const row of grid) {
          expect(row.length, `${name}: ${row}`).toBe(24);
          for (const ch of row) expect(ch === "." || ch in PALETTE, `${name}: ${ch}`).toBe(true);
        }
      }
    }
  });

  it("there are six distinct Laika reaction variants", () => {
    const firsts = Object.values(LAIKA_FRAMES).map((f) => f[0].join("\n"));
    expect(firsts.length).toBe(6);
    expect(new Set(firsts).size).toBe(6);
  });

  it("every icon is a 9×9 grid", () => {
    for (const [name, grid] of Object.entries(ICONS)) {
      expect(grid.length, name).toBe(9);
      for (const row of grid) {
        expect(row.length, `${name}: ${row}`).toBe(9);
        for (const ch of row) expect(ch === "." || ch in PALETTE, `${name}: ${ch}`).toBe(true);
      }
    }
  });
});
