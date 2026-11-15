import { describe, expect, it } from "vitest";
import { computeLayout, walkRoute } from "@/components/PixelMarsOutpost";
import { channelGain, MUSIC_TRACKS, type AudioPrefs, type AudioVolumes } from "@/lib/sound";
import { MEMORIAL_TEXT, OPENING } from "@/data/memorial";
import { MODULE_IDS } from "@/game/types";
import { existsSync } from "node:fs";
import path from "node:path";

const FRAMES: [number, number][] = [
  [710, 589],
  [1250, 1200],
  [368, 296],
  [900, 400],
  [400, 900],
];

describe("outpost camera", () => {
  it("is zoomed in: never wider than the old 320-unit view, and about 1.36x at normal sizes", () => {
    expect(computeLayout(710, 589).vw).toBe(236);
    for (const [w, h] of FRAMES) expect(computeLayout(w, h).vw).toBeLessThanOrEqual(320);
  });
  it("keeps the sky to about a quarter of the scene", () => {
    for (const [w, h] of FRAMES) {
      const l = computeLayout(w, h);
      expect((96 - l.vy) / l.vh).toBeLessThanOrEqual(0.25);
    }
  });
  it("keeps every building, its label and Laika's spots inside the view, without overlaps", () => {
    for (const [w, h] of FRAMES) {
      const l = computeLayout(w, h);
      const boxes = MODULE_IDS.map((id) => ({ id, x: l.pos[id].x, y: l.pos[id].y }));
      for (const b of boxes) {
        expect(b.x - 3).toBeGreaterThanOrEqual(l.vx);
        expect(b.x + 51).toBeLessThanOrEqual(l.vx + l.vw);
        expect(b.y + 54).toBeLessThanOrEqual(l.vy + l.vh);
        for (const o of boxes) {
          if (o.id === b.id) continue;
          const apart = Math.abs(o.x - b.x) >= 54 || Math.abs(o.y - b.y) >= 62;
          expect(apart).toBe(true);
        }
      }
      for (const spot of [...MODULE_IDS.map((id) => l.visit[id]), l.home, l.shelter]) {
        expect(spot.x).toBeGreaterThanOrEqual(l.vx);
        expect(spot.x + 26).toBeLessThanOrEqual(l.vx + l.vw);
        expect(spot.y + 27).toBeLessThanOrEqual(l.vy + l.vh);
      }
    }
  });
});

describe("Laika's walking routes", () => {
  it("never pass over a building on the way to any building and back", () => {
    for (const [w, h] of FRAMES) {
      const l = computeLayout(w, h);
      for (const id of MODULE_IDS) {
        for (const back of [false, true]) {
          const pts = [back ? l.visit[id] : l.home, ...walkRoute(l, l.home, id, back)];
          for (let i = 1; i < pts.length; i++) {
            for (let t = 0; t <= 1; t += 0.05) {
              const feetX = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t + 13;
              const feetY = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t + 26;
              for (const other of MODULE_IDS) {
                const b = l.pos[other];
                const over = feetX > b.x + 6 && feetX < b.x + 42 && feetY > b.y + 6 && feetY < b.y + 34;
                expect(over, `${w}x${h} ${id} ${back ? "back" : "go"} crosses ${other}`).toBe(false);
              }
            }
          }
        }
      }
    }
  });
});

describe("audio channels", () => {
  const on: AudioPrefs = { master: true, music: true, ambience: true, sfx: true };
  const vol: AudioVolumes = { master: 70, music: 40, ambience: 30, sfx: 60 };
  it("scales with the channel and the master slider", () => {
    expect(channelGain("music", on, vol)).toBeCloseTo(0.7 * 0.4 * 0.5);
    expect(channelGain("music", on, { ...vol, music: 80 })).toBeCloseTo(0.7 * 0.8 * 0.5);
  });
  it("master at zero or off silences everything", () => {
    for (const k of ["music", "ambience", "sfx"] as const) {
      expect(channelGain(k, on, { ...vol, master: 0 })).toBe(0);
      expect(channelGain(k, { ...on, master: false }, vol)).toBe(0);
    }
  });
  it("music off leaves ambience and effects alone", () => {
    const p = { ...on, music: false };
    expect(channelGain("music", p, vol)).toBe(0);
    expect(channelGain("ambience", p, vol)).toBeGreaterThan(0);
    expect(channelGain("sfx", p, vol)).toBeGreaterThan(0);
  });
  it("ships the supplied music files", () => {
    expect(MUSIC_TRACKS).toHaveLength(2);
    for (const t of MUSIC_TRACKS) expect(existsSync(path.join(process.cwd(), "public", t.src))).toBe(true);
  });
});

describe("opening", () => {
  it("uses the exact dedication and a 2 s memorial inside a 3.5 s opening", () => {
    expect(MEMORIAL_TEXT).toBe("In Loving Memory of Laika");
    expect(OPENING.memorialEnd).toBe(2000);
    expect(OPENING.rocketLands).toBe(3000);
    expect(OPENING.menuReady).toBe(3500);
  });
});
