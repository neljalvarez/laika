// Authored, state-driven lines for Laika. No AI inference — just rules.
import { MODULES } from "./modules";
import { CONFIG } from "@/game/config";
import { effectTotals } from "@/game/engine";
import type { MissionState } from "@/game/types";

export type LaikaMood = "idle" | "happy" | "concerned" | "alert" | "resting" | "celebrate";

export interface LaikaLine {
  mood: LaikaMood;
  text: string;
}

const HEALTHY: string[] = [
  "Woof! All systems look good. What should we build today?",
  "I sniffed every module. Everything smells like fresh air!",
  "The crew will love it here. Let's keep the lights on!",
  "Good morning, Commander! The sky is so orange today.",
  "Tail check: wagging. Outpost check: working!",
];

const UPGRADE_LINES: Record<string, string> = {
  solar: "Bigger panels! More sunlight turns into more electricity.",
  battery: "More batteries! Now we can save extra power for dusty days.",
  lifeSupport: "The recycler is faster! More clean air and water every sol.",
  shelter: "Thicker walls! The hazard meter will climb more slowly now.",
  habitat: "The habitat is tighter! Less air leaks out each sol.",
  greenhouse: "The greenhouse grew! Every harvest gives more food.",
};

export function getLaikaLine(s: MissionState): LaikaLine {
  const r = s.resources;
  if (s.status === "failure") {
    return {
      mood: "resting",
      text: "I'm safe on the orbiting ship. Let's study what went wrong and try again!",
    };
  }
  if (s.status === "outstanding" || s.status === "success") {
    return { mood: "celebrate", text: "We did it! I can see the crew's lander in the sky!" };
  }
  if (s.status === "partial") {
    return { mood: "happy", text: "Ten sols done! The outpost needs a few repairs before the crew lands." };
  }

  if (s.pendingEvent === "solar_radiation") {
    return { mood: "alert", text: "Solar particles are coming! The shelter has the thickest walls." };
  }
  if (s.pendingEvent === "dust_storm") {
    return { mood: "alert", text: "Dust storm! The panels will get much less sunlight." };
  }
  if (s.pendingEvent === "resupply") {
    return { mood: "happy", text: "A supply drone! We can only carry one crate. Which do we need most?" };
  }
  if (s.pendingEvent) {
    return { mood: "alert", text: "Something needs fixing! Mission Control wants your decision." };
  }

  const fx = effectTotals(s.effects);
  if (fx.sheltering) {
    return { mood: "resting", text: "I'm waiting in the shelter until the solar particles pass. It's cozy!" };
  }

  if (r.lifeSupport < CONFIG.lifeSupportCritical) {
    return {
      mood: "alert",
      text: "Air and water are very low! Fix or upgrade Life Support before it reaches zero.",
    };
  }
  if (s.powerEmergencySols > 0) {
    return {
      mood: "alert",
      text: "Essential systems ran short of power! One more sol like that and we must evacuate.",
    };
  }
  if (s.foodEmergencySols > 0) {
    return { mood: "alert", text: "My bowl was empty! One more hungry sol and Mission Control ends the mission." };
  }
  if (r.radiation >= CONFIG.radiationWarning) {
    return { mood: "concerned", text: "The hazard meter is high. A stronger shelter slows it down." };
  }

  if (s.lastAction?.sol === s.sol) {
    if (s.lastAction.kind === "upgrade" && s.lastAction.moduleId) {
      return { mood: "happy", text: UPGRADE_LINES[s.lastAction.moduleId] };
    }
    if (s.lastAction.kind === "repair" && s.lastAction.moduleId) {
      return { mood: "happy", text: `${MODULES[s.lastAction.moduleId].name} is fixed! It works better again.` };
    }
  }

  if (r.power < 25) {
    return {
      mood: "concerned",
      text: "The battery is low. Life support needs power first. Can the panels make more?",
    };
  }
  if (r.lifeSupport < 45) {
    return { mood: "concerned", text: "Our air and water reserve keeps shrinking. A better recycler would help." };
  }
  if (s.cropProgress < CONFIG.cropEstablishSols && r.food <= 8) {
    return {
      mood: "concerned",
      text: "Crops need 2 powered sols before the first harvest. We should not wait too long!",
    };
  }
  if (r.food <= 4) {
    return { mood: "concerned", text: "Food is running low. Is the greenhouse on and growing?" };
  }
  if (s.weather === "STORM") {
    return { mood: "alert", text: "It's so dusty I can't see the Sun! Panels only make 40% power." };
  }
  if (s.weather === "DUSTY") {
    return { mood: "concerned", text: "Dusty sky today. The panels make a little less power." };
  }
  if (s.forecast !== "CLEAR") {
    return { mood: "idle", text: "The forecast says dust tomorrow. Do we have enough battery saved?" };
  }
  return { mood: s.sol % 2 === 0 ? "happy" : "idle", text: HEALTHY[(s.sol + s.history.length) % HEALTHY.length] };
}
