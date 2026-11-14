// One short "what should I do next?" line, always derived from real state.
import { MODULES } from "./modules";
import { CONFIG } from "@/game/config";
import { criticalResources } from "@/game/status";
import { canUpgrade } from "@/game/upgrades";
import { MODULE_IDS, type MissionState } from "@/game/types";

export function getNextAction(s: MissionState): string {
  if (s.status !== "playing") return "The mission is over. Read your debrief.";
  if (s.pendingEvent) return "An emergency needs your decision.";
  const critical = criticalResources(s);
  if (critical.includes("lifeSupport")) return "Air and water are very low. Upgrade or repair Life Support.";
  if (critical.includes("power")) return "Power is very low. Set the greenhouse to LOW or OFF.";
  if (critical.includes("food")) {
    return s.greenhouseMode === "OFF" ? "Food is almost gone. Turn the greenhouse on." : "Food is almost gone. Keep the greenhouse running.";
  }
  if (critical.includes("radiation")) return "Radiation risk is high. Upgrade the Radiation Shelter.";
  const canBuild = s.actionsLeft > 0;
  const damaged = MODULE_IDS.find((id) => s.modules[id].condition < 60);
  if (damaged && canBuild && s.resources.materials >= CONFIG.repairCost) {
    return `The ${MODULES[damaged].name} is damaged. Repair it in Engineering.`;
  }
  if (s.greenhouseMode === "OFF" && s.resources.food <= 8) return "Your greenhouse is off. Food will not grow.";
  if (canBuild && MODULE_IDS.some((id) => canUpgrade(s, id).ok)) return "You can build once today. Click a building.";
  return "Ready? Advance to the next sol.";
}
