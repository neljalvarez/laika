// Seeded, state-aware event selection and event resolution.
import { EVENTS, EVENT_LIST } from "@/data/events";
import { CONFIG, clamp, round1 } from "./config";
import { difficultyOf } from "./difficulty";
import { nextRandom } from "./rng";
import { batteryCapacity, shelterMultiplier } from "./engine";
import {
  type EventChoice,
  type EventId,
  type MissionEvent,
  type MissionState,
  type ModuleId,
  type ModuleState,
} from "./types";

/**
 * Fairness filter: do not pile a hazard onto a resource that is already in
 * trouble. Player mistakes can still cause failure; unlucky rolls alone cannot.
 */
function isFair(event: MissionEvent, s: MissionState): boolean {
  const r = s.resources;
  switch (event.id) {
    case "dust_storm":
      return r.power >= 30 && s.weather !== "STORM" && s.modules.solar.condition >= 40;
    case "panel_dust":
      return r.power >= 20 && s.weather !== "STORM";
    case "water_recycler":
      return r.lifeSupport >= 35;
    case "habitat_malfunction":
      return r.lifeSupport >= 30;
    case "solar_radiation":
      return r.radiation <= 70;
    case "greenhouse_fault":
      return r.food >= 4;
    case "resupply":
      return difficultyOf(s).randomResupply;
  }
}

export function eligibleEvents(s: MissionState): MissionEvent[] {
  const inWindow = EVENT_LIST.filter((e) => s.sol >= e.minSol && s.sol <= e.maxSol && isFair(e, s));
  const fresh = inWindow.filter((e) => !s.seenEvents.includes(e.id));
  if (fresh.length > 0) return fresh;
  // Everything in the window was already seen: allow a repeat, but never the
  // same event twice in a row and never a second resupply.
  const last = s.seenEvents[s.seenEvents.length - 1];
  return inWindow.filter((e) => e.id !== last && e.id !== "resupply");
}

export interface PickResult {
  event: MissionEvent | null;
  rng: number;
}

/** Chooses the event (if any) for the sol that is just starting. */
export function pickEvent(s: MissionState): PickResult {
  // Sol 1 is the tutorial; the final sol is the readiness assessment.
  if (s.sol <= 1 || s.sol >= s.maxSols) return { event: null, rng: s.rng };
  let rng = s.rng;
  if (s.sol > 3) {
    const gate = nextRandom(rng);
    rng = gate.next;
    if (gate.value >= difficultyOf(s).eventChance) return { event: null, rng };
  }
  const pool = eligibleEvents(s);
  if (pool.length === 0) return { event: null, rng };
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  const roll = nextRandom(rng);
  rng = roll.next;
  let pick = roll.value * total;
  for (const e of pool) {
    pick -= e.weight;
    if (pick < 0) return { event: e, rng };
  }
  return { event: pool[pool.length - 1], rng };
}

export function canAfford(s: MissionState, choice: EventChoice): { ok: boolean; reason: string | null } {
  const c = choice.cost;
  const r = s.resources;
  if ((c.materials ?? 0) > r.materials) return { ok: false, reason: `Needs ${c.materials} materials (you have ${r.materials}).` };
  if ((c.power ?? 0) > r.power) return { ok: false, reason: `Needs ${c.power} power (you have ${r.power}).` };
  if ((c.lifeSupport ?? 0) >= r.lifeSupport)
    return { ok: false, reason: `Needs ${c.lifeSupport} life support and must leave some in reserve.` };
  if ((c.food ?? 0) > r.food) return { ok: false, reason: `Needs ${c.food} food (you have ${r.food}).` };
  return { ok: true, reason: null };
}

export function resolveEvent(s: MissionState, choiceId: string): MissionState {
  if (!s.pendingEvent || s.status !== "playing") return s;
  const event = EVENTS[s.pendingEvent as EventId];
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) return { ...s, notice: "That choice does not exist." };
  const afford = canAfford(s, choice);
  if (!afford.ok) return { ...s, notice: afford.reason };

  const r = { ...s.resources };
  const changes: string[] = [];
  const spend = (key: "materials" | "power" | "lifeSupport" | "food", label: string) => {
    const amount = choice.cost[key] ?? 0;
    if (amount > 0) {
      r[key] = round1(r[key] - amount);
      changes.push(`${label} −${amount}`);
    }
  };
  spend("materials", "Materials");
  spend("power", "Power");
  spend("lifeSupport", "Life Support");
  spend("food", "Food");

  if (choice.gain) {
    const g = choice.gain;
    if (g.materials) {
      r.materials = round1(r.materials + g.materials);
      changes.push(`Materials +${g.materials}`);
    }
    if (g.food) {
      r.food = clamp(round1(r.food + g.food), 0, CONFIG.foodCap);
      changes.push(`Food +${g.food}`);
    }
    if (g.lifeSupport) {
      r.lifeSupport = clamp(round1(r.lifeSupport + g.lifeSupport), 0, 100);
      changes.push(`Life Support +${g.lifeSupport}`);
    }
    if (g.power) {
      r.power = clamp(round1(r.power + g.power), 0, batteryCapacity(s));
      changes.push(`Power +${g.power}`);
    }
  }

  const modules = { ...s.modules } as Record<ModuleId, ModuleState>;
  if (choice.repair) {
    for (const [id, amount] of Object.entries(choice.repair) as [ModuleId, number][]) {
      const before = modules[id].condition;
      modules[id] = { ...modules[id], condition: clamp(before + amount, 0, 100) };
      if (modules[id].condition !== before) changes.push(`${id} condition +${round1(modules[id].condition - before)}`);
    }
  }
  if (choice.damage) {
    for (const [id, amount] of Object.entries(choice.damage) as [ModuleId, number][]) {
      modules[id] = { ...modules[id], condition: clamp(modules[id].condition - amount, 0, 100) };
      changes.push(`${id} condition −${amount}`);
    }
  }

  if (choice.radiation) {
    const mult = choice.radiation.shielded ? shelterMultiplier(modules.shelter) : 1;
    const gain = round1(choice.radiation.amount * mult);
    r.radiation = clamp(round1(r.radiation + gain), 0, 100);
    changes.push(
      choice.radiation.shielded
        ? `Radiation Hazard +${gain} (${choice.radiation.amount} × shielding ${mult.toFixed(2)})`
        : `Radiation Hazard +${gain} (unshielded)`,
    );
  }

  let effects = s.effects;
  if (choice.effects) {
    const ids = new Set(choice.effects.map((e) => e.id));
    effects = [...s.effects.filter((e) => !ids.has(e.id)), ...choice.effects.map((e) => ({ ...e }))];
    for (const e of choice.effects) changes.push(`${e.label} for ${e.solsLeft} sol${e.solsLeft === 1 ? "" : "s"}`);
  }
  if (changes.length === 0) changes.push("No immediate resource change.");

  return {
    ...s,
    resources: r,
    modules,
    effects,
    pendingEvent: null,
    notice: null,
    eventOutcome: {
      eventTitle: event.title,
      choiceLabel: choice.label,
      science: choice.science,
      changes,
    },
    metrics: { ...s.metrics, materialsSpent: s.metrics.materialsSpent + (choice.cost.materials ?? 0) },
    decisions: [
      ...s.decisions,
      {
        sol: s.sol,
        eventId: event.id,
        eventTitle: event.title,
        choiceId: choice.id,
        choiceLabel: choice.label,
        quality: choice.quality,
      },
    ],
    lastAction: { kind: "event", sol: s.sol },
    log: [
      ...s.log,
      {
        sol: s.sol,
        kind: "decision",
        title: `${event.title}: ${choice.label}`,
        detail: `${changes.join("; ")}. Why: ${choice.science}`,
      },
    ],
  };
}
