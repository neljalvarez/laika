// Evidence-based debrief lines. Every message is chosen from what is actually
// recorded in the mission (decisions, log, metrics, final state). If the record
// does not support a specific claim, a neutral line is used instead.
import { EVENTS } from "@/data/events";
import { MODULES } from "@/data/modules";
import { CONFIG } from "./config";
import { computeScore, type ScoreBreakdown, type ScoreCategoryId } from "./scoring";
import type { MissionState } from "./types";

export interface DebriefLine {
  title: string;
  text: string;
}

export function bestDecision(s: MissionState): DebriefLine | null {
  const strong = s.decisions.find((d) => d.quality >= 1 && d.eventId !== "resupply");
  if (strong) {
    const choice = EVENTS[strong.eventId].choices.find((c) => c.id === strong.choiceId);
    return { title: `Sol ${strong.sol}: ${strong.eventTitle} — ${strong.choiceLabel}`, text: choice?.after ?? "" };
  }
  const upgrade = s.log.find((e) => e.kind === "engineering" && e.title.startsWith("Upgraded"));
  if (upgrade) return { title: `Sol ${upgrade.sol}: ${upgrade.title}`, text: "An upgrade keeps helping for every sol that follows." };
  return null;
}

const IMPROVE: Record<ScoreCategoryId, string> = {
  lifeSupport: "Upgrade or repair Life Support earlier so air and water last longer.",
  power: "Keep more power in the battery: upgrade the Solar Array or use LOW greenhouse power on dusty sols.",
  radiation: "Upgrade the Radiation Shelter, and shelter Laika during solar warnings.",
  food: "Start the greenhouse early. Crops need 2 powered sols before any food grows.",
  materials: "Spend spare materials. Unused materials do not help the outpost.",
  emergency: "In emergencies, fixing the cause usually works better than a quick workaround.",
};

export function whatToImprove(s: MissionState, score: ScoreBreakdown = computeScore(s)): DebriefLine | null {
  const weakest = [...score.categories].sort((a, b) => a.score / a.max - b.score / b.max)[0];
  if (!weakest || weakest.score / weakest.max >= 0.85) return null;
  return { title: `${weakest.label}: ${weakest.score}/${weakest.max}`, text: `${IMPROVE[weakest.id]} (${weakest.explanation})` };
}

export function engineeringLesson(s: MissionState): DebriefLine {
  const m = s.metrics;
  if (m.powerShortageSols > 0) {
    return {
      title: "Power comes first",
      text: `Essential systems ran short of power on ${m.powerShortageSols} sol(s). Life support needs electricity before anything else.`,
    };
  }
  if (m.foodShortageSols > 0) {
    return { title: "Food takes planning", text: `Food ran out on ${m.foodShortageSols} sol(s). Crops take time, so the greenhouse must start early.` };
  }
  const dustySols = s.log.filter((e) => e.kind === "report" && /Weather: (DUSTY|STORM)/.test(e.detail)).length;
  if (dustySols > 0 && s.modules.solar.level >= 2) {
    return {
      title: "Planning for dust",
      text: `There were ${dustySols} dusty or stormy sol(s). Upgrading the ${MODULES.solar.name} helped keep power up when sunlight was low.`,
    };
  }
  const shelter = s.decisions.find((d) => d.eventId === "solar_radiation");
  if (shelter && shelter.choiceId !== "stay") {
    return { title: "Shielding works", text: "Protecting Laika during the solar warning kept the radiation hazard low." };
  }
  if (s.cropProgress >= CONFIG.cropEstablishSols) {
    return {
      title: "Food needs power",
      text: "Your greenhouse produced food, but it also needed electricity. Balancing both systems is important.",
    };
  }
  return { title: "Every build is a trade-off", text: "Materials spent on one building could not help another. Different plans lead to different results." };
}
