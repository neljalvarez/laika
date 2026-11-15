// Gears: a small progress reward for upgrading. One Gear per successful
// upgrade; three modest milestone perks. Everything is derived from the gear
// count stored in the save, so nothing can be granted twice.
import type { MissionState } from "./types";

export interface GearPerk {
  at: number;
  id: "parts" | "tools" | "builders";
  name: string;
  text: string;
}

export const GEAR_RULES = {
  /** One-time materials when the 2nd Gear is earned. */
  partsBonus: 4,
  /** Extra condition restored by every repair from 4 Gears. */
  repairBonus: 10,
  /** Materials saved on every upgrade from 6 Gears. */
  upgradeDiscount: 2,
} as const;

export const GEAR_PERKS: readonly GearPerk[] = [
  { at: 2, id: "parts", name: "Spare parts", text: `+${GEAR_RULES.partsBonus} materials, one time` },
  { at: 4, id: "tools", name: "Better tools", text: `Repairs fix ${GEAR_RULES.repairBonus}% more` },
  { at: 6, id: "builders", name: "Expert builders", text: `Upgrades cost ${GEAR_RULES.upgradeDiscount} less` },
];

export const gearCount = (s: Pick<MissionState, "gears">): number => (Number.isFinite(s.gears) ? s.gears : 0);

export function hasPerk(s: Pick<MissionState, "gears">, id: GearPerk["id"]): boolean {
  const perk = GEAR_PERKS.find((p) => p.id === id);
  return perk !== undefined && gearCount(s) >= perk.at;
}

export function repairBonus(s: Pick<MissionState, "gears">): number {
  return hasPerk(s, "tools") ? GEAR_RULES.repairBonus : 0;
}

export function upgradeDiscount(s: Pick<MissionState, "gears">): number {
  return hasPerk(s, "builders") ? GEAR_RULES.upgradeDiscount : 0;
}

/** The perk unlocked by reaching exactly this many Gears, if any. */
export function perkAt(count: number): GearPerk | undefined {
  return GEAR_PERKS.find((p) => p.at === count);
}
