import type { ModuleId } from "@/game/types";
import { CONFIG } from "@/game/config";

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  short: string;
  /** One-line tooltip shown when a building is hovered, focused or tapped. */
  tip: string;
  role: string;
  /** Plain-language effect at each level (index 0 = level 1). */
  levelEffects: readonly string[];
  /** Short "why does this matter?" line, linked to a Science Lab card. */
  why: string;
  card: string;
  /** One headline number per level, for "before → after" displays. */
  stat: { label: string; values: readonly string[] };
  damageNote: string;
}

const c = CONFIG;

export const MODULES: Record<ModuleId, ModuleInfo> = {
  habitat: {
    id: "habitat",
    name: "Habitat",
    short: "HAB",
    why: "A sealed habitat keeps air in. Leaks waste life support.",
    card: "water",
    stat: { label: "Life support used per sol", values: c.lifeSupportUse.map(String) },
    tip: "Laika's sealed home on Mars.",
    role: "Laika's sealed home. A better habitat leaks less air and heat.",
    levelEffects: [
      `Uses ${c.lifeSupportUse[0]} life support per sol.`,
      `Uses ${c.lifeSupportUse[1]} life support per sol.`,
      `Uses ${c.lifeSupportUse[2]} life support per sol.`,
    ],
    damageNote: "Damage makes the habitat leak, using extra life support.",
  },
  solar: {
    id: "solar",
    name: "Solar Array",
    short: "SOLAR",
    why: "Mars can get dusty. Less sunlight means less electricity from solar panels.",
    card: "power",
    stat: { label: "Power per clear sol", values: c.solarOutput.map(String) },
    tip: "Produces electricity from sunlight.",
    role: "Turns sunlight into electricity. Dust in the sky or on the panels lowers output.",
    levelEffects: [
      `Makes ${c.solarOutput[0]} power per clear sol.`,
      `Makes ${c.solarOutput[1]} power per clear sol.`,
      `Makes ${c.solarOutput[2]} power per clear sol.`,
    ],
    damageNote: "Damaged panels make less power.",
  },
  battery: {
    id: "battery",
    name: "Battery Station",
    short: "BATT",
    why: "Batteries save power for dusty sols, when the panels make less.",
    card: "power",
    stat: { label: "Power storage", values: c.batteryCapacity.map(String) },
    tip: "Stores electricity for dusty sols.",
    role: "Stores electricity for dusty sols. Extra power above capacity is wasted.",
    levelEffects: [
      `Stores up to ${c.batteryCapacity[0]} power.`,
      `Stores up to ${c.batteryCapacity[1]} power.`,
      `Stores up to ${c.batteryCapacity[2]} power.`,
    ],
    damageNote: "Damaged batteries hold less charge.",
  },
  lifeSupport: {
    id: "lifeSupport",
    name: "Life Support",
    short: "LIFE",
    why: "Life support recycles air and water. Damaged equipment works less well.",
    card: "water",
    stat: { label: "Life support recycled per sol", values: c.lifeSupportRecovery.map(String) },
    tip: "Recycles the outpost's air and water.",
    role: "Cleans and recycles air and water so the reserve lasts longer.",
    levelEffects: [
      `Recovers ${c.lifeSupportRecovery[0]} life support per sol.`,
      `Recovers ${c.lifeSupportRecovery[1]} life support per sol.`,
      `Recovers ${c.lifeSupportRecovery[2]} life support per sol.`,
    ],
    damageNote: "Damage or low power means less is recycled.",
  },
  shelter: {
    id: "shelter",
    name: "Radiation Shelter",
    short: "SHELTER",
    why: "Better shielding lowers radiation risk, but upgrading it uses valuable materials.",
    card: "radiation",
    stat: { label: "Radiation hazard let through", values: c.shelterMult.map((m) => `${Math.round(m * 100)}%`) },
    tip: "Thick walls that slow the radiation hazard.",
    role: "Thick walls that reduce how fast the radiation hazard meter rises.",
    levelEffects: [
      `Hazard gain ×${c.shelterMult[0].toFixed(2)}.`,
      `Hazard gain ×${c.shelterMult[1].toFixed(2)}.`,
      `Hazard gain ×${c.shelterMult[2].toFixed(2)}.`,
    ],
    damageNote: "Damaged shielding blocks less.",
  },
  greenhouse: {
    id: "greenhouse",
    name: "Greenhouse",
    short: "GROW",
    why: "Growing more food needs more power. Make sure the station has enough electricity.",
    card: "food",
    stat: { label: "Food per sol on HIGH", values: c.greenhouseLevelBonus.map((b) => String(c.greenhouseFood.HIGH + b)) },
    tip: "Grows food using electricity.",
    role: `Grows food using power. New crops need ${c.cropEstablishSols} powered sols before the first harvest.`,
    levelEffects: [
      `Harvest: LOW ${c.greenhouseFood.LOW}, HIGH ${c.greenhouseFood.HIGH} food per sol.`,
      `Harvest: LOW ${c.greenhouseFood.LOW + c.greenhouseLevelBonus[1]}, HIGH ${
        c.greenhouseFood.HIGH + c.greenhouseLevelBonus[1]
      } food per sol.`,
      `Harvest: LOW ${c.greenhouseFood.LOW + c.greenhouseLevelBonus[2]}, HIGH ${
        c.greenhouseFood.HIGH + c.greenhouseLevelBonus[2]
      } food per sol.`,
    ],
    damageNote: "Damage shrinks the harvest.",
  },
};
