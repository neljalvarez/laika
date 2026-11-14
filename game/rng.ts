// Tiny seeded PRNG (mulberry32). The state is a plain integer kept in
// MissionState so every roll is reproducible and survives save/load.

export interface Roll {
  value: number; // 0 ≤ value < 1
  next: number; // next PRNG state
}

export function nextRandom(state: number): Roll {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, next };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}
