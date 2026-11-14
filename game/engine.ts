// Pure resource engine. Nothing here touches React, the DOM or Math.random.
//
// DAILY ORDER (advanceSol → simulateSol), applied exactly once per sol:
//  1. Validate: a pending mandatory decision blocks the advance.
//  2. Apply operating modes and persistent event effects.
//  3. Calculate electricity generation and demand.
//  4. Resolve power-shortage priority (essential systems first, greenhouse last).
//  5. Update life support.
//  6. Update greenhouse growth and food.
//  7. Accumulate the abstract radiation hazard after shielding.
//  8. Apply durability wear and tick down temporary effects.
//  9. Validate mission status (abort rules / final sol).
// 10. Record the itemised report, then move to the next sol or end the campaign.
import { CONFIG, clamp, conditionFactor, round1 } from "./config";
import { nextRandom } from "./rng";
import { pickEvent } from "./events";
import { computeScore, determineEnding } from "./scoring";
import {
  MODULE_IDS,
  type GreenhouseMode,
  type LogEntry,
  type MissionState,
  type ModuleId,
  type ModuleState,
  type ReportLine,
  type ResourceKey,
  type ResourceReport,
  type Resources,
  type SolReport,
  type TemporaryEffect,
  type Weather,
} from "./types";

export interface EffectTotals {
  solarMult: number;
  lsRecoveryMult: number;
  foodMult: number;
  radMult: number;
  nonessentialOff: boolean;
  sheltering: boolean;
}

export function effectTotals(effects: TemporaryEffect[]): EffectTotals {
  const t: EffectTotals = {
    solarMult: 1,
    lsRecoveryMult: 1,
    foodMult: 1,
    radMult: 1,
    nonessentialOff: false,
    sheltering: false,
  };
  for (const e of effects) {
    if (e.solarMult !== undefined) t.solarMult *= e.solarMult;
    if (e.lsRecoveryMult !== undefined) t.lsRecoveryMult *= e.lsRecoveryMult;
    if (e.foodMult !== undefined) t.foodMult *= e.foodMult;
    if (e.radMult !== undefined) t.radMult *= e.radMult;
    if (e.nonessentialOff) t.nonessentialOff = true;
    if (e.sheltering) t.sheltering = true;
  }
  return t;
}

export function batteryCapacity(state: MissionState): number {
  const m = state.modules.battery;
  return round1(CONFIG.batteryCapacity[m.level - 1] * conditionFactor(m.condition));
}

export function solarGeneration(state: MissionState, weather: Weather = state.weather): number {
  const m = state.modules.solar;
  const t = effectTotals(state.effects);
  return round1(
    CONFIG.solarOutput[m.level - 1] *
      CONFIG.weatherMult[weather] *
      conditionFactor(m.condition) *
      t.solarMult,
  );
}

/** Fraction of radiation hazard that gets past the shelter (lower is better). */
export function shelterMultiplier(shelter: ModuleState): number {
  const best = CONFIG.shelterMult[shelter.level - 1];
  return round1Precise(1 - (1 - best) * conditionFactor(shelter.condition));
}

function round1Precise(n: number): number {
  return Math.round(n * 100) / 100;
}

export function effectiveGreenhouseMode(state: MissionState): GreenhouseMode {
  return effectTotals(state.effects).nonessentialOff ? "OFF" : state.greenhouseMode;
}

export function greenhouseHarvestRate(state: MissionState, mode: GreenhouseMode): number {
  if (mode === "OFF") return 0;
  const m = state.modules.greenhouse;
  return round1(
    (CONFIG.greenhouseFood[mode] + CONFIG.greenhouseLevelBonus[m.level - 1]) *
      conditionFactor(m.condition),
  );
}

export interface SolSimulation {
  report: SolReport;
  resources: Resources;
  modules: Record<ModuleId, ModuleState>;
  cropProgress: number;
  powerShortage: boolean;
  foodShortage: boolean;
}

function mkReport(before: number, after: number, lines: ReportLine[]): ResourceReport {
  return { before: round1(before), after: round1(after), lines: lines.filter((l) => l.amount !== 0) };
}

/**
 * Computes what one sol does to the outpost WITHOUT committing it and without
 * randomness. Used both by "Preview Next Sol" and by advanceSol, so the
 * preview can never disagree with the real result.
 */
export function simulateSol(state: MissionState): SolSimulation {
  const r = state.resources;
  const mods = state.modules;
  const fx = effectTotals(state.effects);
  const notes: string[] = [];

  // 2. Modes and persistent effects
  const mode = effectiveGreenhouseMode(state);
  if (fx.nonessentialOff && state.greenhouseMode !== "OFF") {
    notes.push("Nonessential systems were switched off, so the greenhouse did not run.");
  }

  // 3. Generation and demand
  const generation = solarGeneration(state);
  const capacity = batteryCapacity(state);
  const essential = CONFIG.essentialDemand;
  const ghDemand = CONFIG.greenhousePower[mode];
  const available = r.power + generation;

  // 4. Shortage priority: essential systems first, greenhouse last
  let essentialRatio = 1;
  let ghFraction = ghDemand > 0 ? 1 : 0;
  let powerAfter: number;
  let essentialUsed: number = essential;
  let ghUsed = ghDemand;
  let powerShortage = false;
  if (available >= essential + ghDemand) {
    powerAfter = available - essential - ghDemand;
  } else if (available >= essential) {
    ghUsed = available - essential;
    ghFraction = ghDemand > 0 ? ghUsed / ghDemand : 0;
    powerAfter = 0;
    notes.push("Not enough power for the greenhouse: it only ran part of the sol.");
  } else {
    powerShortage = true;
    essentialRatio = clamp(available / essential, 0, 1);
    essentialUsed = available;
    ghUsed = 0;
    ghFraction = 0;
    powerAfter = 0;
    notes.push(
      `POWER SHORTAGE: essential systems needed ${essential} power but only ${round1(
        available,
      )} was available. Life support recycled less and lost ${CONFIG.shortageLifeSupportPenalty} extra reserve.`,
    );
  }
  const wasted = Math.max(0, powerAfter - capacity);
  powerAfter = clamp(powerAfter - wasted, 0, capacity);
  if (wasted > 0) notes.push(`Battery was full, so ${round1(wasted)} power could not be stored.`);

  const weatherNote =
    state.weather === "CLEAR" ? "clear sky" : state.weather === "DUSTY" ? "dusty sky ×0.75" : "dust storm ×0.40";
  const powerLines: ReportLine[] = [
    { label: `Solar generation (${weatherNote})`, amount: generation },
    { label: "Habitat + life support (essential)", amount: -round1(essentialUsed) },
    { label: `Greenhouse (${mode})`, amount: -round1(ghUsed) },
    { label: "Battery full — not stored", amount: -round1(wasted) },
  ];

  // 5. Life support
  const leak = round1((100 - mods.habitat.condition) / 20);
  const use = CONFIG.lifeSupportUse[mods.habitat.level - 1];
  const recovery = round1(
    CONFIG.lifeSupportRecovery[mods.lifeSupport.level - 1] *
      conditionFactor(mods.lifeSupport.condition) *
      essentialRatio *
      fx.lsRecoveryMult,
  );
  const lsLines: ReportLine[] = [
    { label: "Laika's air and water use", amount: -use },
    { label: "Habitat leaks (damage)", amount: -leak },
    { label: "Recycled by Life Support Unit", amount: recovery },
  ];
  let lsDelta = -use - leak + recovery;
  if (powerShortage) {
    lsDelta -= CONFIG.shortageLifeSupportPenalty;
    lsLines.push({ label: "Power shortage penalty", amount: -CONFIG.shortageLifeSupportPenalty });
  }

  // 6. Greenhouse growth and food
  let cropProgress = state.cropProgress;
  let harvest = 0;
  const ghRunning = mode !== "OFF" && ghFraction >= 0.5;
  if (ghRunning && cropProgress < CONFIG.cropEstablishSols) {
    cropProgress += 1;
    notes.push(
      cropProgress >= CONFIG.cropEstablishSols
        ? "Crops are established! The greenhouse can harvest from next sol."
        : `Crops are still growing (${cropProgress}/${CONFIG.cropEstablishSols} sols). No harvest yet.`,
    );
  } else if (ghRunning) {
    harvest = round1(greenhouseHarvestRate(state, mode) * ghFraction * fx.foodMult);
  } else if (state.greenhouseMode === "OFF" && cropProgress < CONFIG.cropEstablishSols) {
    notes.push("Greenhouse is OFF, so crops are not growing.");
  }
  const need = CONFIG.foodUsePerSol;
  const foodAvailable = r.food + harvest;
  const foodShortage = foodAvailable < need;
  const eaten = foodShortage ? foodAvailable : need;
  const overCap = Math.max(0, foodAvailable - eaten - CONFIG.foodCap);
  const foodAfter = clamp(foodAvailable - eaten - overCap, 0, CONFIG.foodCap);
  const foodLines: ReportLine[] = [
    { label: `Greenhouse harvest (${mode})`, amount: harvest },
    { label: "Laika's meals", amount: -round1(eaten) },
    { label: "Storage full — spoiled", amount: -round1(overCap) },
  ];
  if (foodShortage) {
    lsDelta -= CONFIG.hungerLifeSupportPenalty;
    lsLines.push({ label: "Emergency rations from reserve", amount: -CONFIG.hungerLifeSupportPenalty });
    notes.push(
      `FOOD SHORTAGE: Laika needed ${need} food but only ${round1(
        foodAvailable,
      )} was available. Emergency rations used ${CONFIG.hungerLifeSupportPenalty} life support.`,
    );
  }
  const lsAfter = clamp(r.lifeSupport + lsDelta, 0, 100);

  // 7. Radiation hazard after shielding
  const shield = shelterMultiplier(mods.shelter);
  const radGain = round1(CONFIG.radiationBaseline * shield * fx.radMult);
  const radAfter = clamp(r.radiation + radGain, 0, 100);
  const radLines: ReportLine[] = [
    {
      label: `Background hazard ${CONFIG.radiationBaseline} × shielding ${shield.toFixed(2)}${
        fx.radMult !== 1 ? ` × extra shielding ${fx.radMult.toFixed(2)}` : ""
      }`,
      amount: radGain,
    },
  ];

  // 8. Durability
  const protectedPanels = state.effects.some((e) => e.id === "storm_maintain");
  const nextModules = {} as Record<ModuleId, ModuleState>;
  for (const id of MODULE_IDS) {
    let wear: number = CONFIG.wearPerSol;
    if (id === "solar" && !protectedPanels) {
      if (state.weather === "DUSTY") wear += CONFIG.dustyPanelWear;
      if (state.weather === "STORM") wear += CONFIG.stormPanelWear;
    }
    if (id === "battery" && powerShortage) wear += CONFIG.shortageBatteryWear;
    nextModules[id] = { level: mods[id].level, condition: clamp(mods[id].condition - wear, 0, 100) };
  }
  if (state.weather !== "CLEAR" && !protectedPanels) {
    notes.push("Blowing dust wore down the solar panels a little more than usual.");
  }

  const resources: Resources = {
    power: round1(powerAfter),
    lifeSupport: round1(lsAfter),
    materials: r.materials,
    food: round1(foodAfter),
    radiation: round1(radAfter),
  };
  const reportResources: Record<ResourceKey, ResourceReport> = {
    power: mkReport(r.power, resources.power, powerLines),
    lifeSupport: mkReport(r.lifeSupport, resources.lifeSupport, lsLines),
    materials: mkReport(r.materials, r.materials, []),
    food: mkReport(r.food, resources.food, foodLines),
    radiation: mkReport(r.radiation, resources.radiation, radLines),
  };

  return {
    report: {
      sol: state.sol,
      weather: state.weather,
      resources: reportResources,
      notes,
      powerShortage,
      foodShortage,
    },
    resources,
    modules: nextModules,
    cropProgress,
    powerShortage,
    foodShortage,
  };
}

export function canAdvance(state: MissionState): { ok: boolean; reason: string | null } {
  if (state.status !== "playing") return { ok: false, reason: "The mission is not in progress." };
  if (state.reportPending) return { ok: false, reason: "Read the sol report first." };
  if (state.pendingEvent) return { ok: false, reason: "Mission Control needs your decision first." };
  if (state.eventOutcome) return { ok: false, reason: "Close the decision result first." };
  return { ok: true, reason: null };
}

function failureCheck(state: MissionState): string | null {
  const r = state.resources;
  if (r.lifeSupport <= 0) {
    return "The life-support reserve reached zero. Air and water could no longer be supplied, so the automatic evacuation rocket carried Laika safely to the orbiting ship.";
  }
  if (state.powerEmergencySols >= CONFIG.powerEmergencyLimit) {
    return `Essential systems went without enough power for ${CONFIG.powerEmergencyLimit} sols in a row. Mission Control ordered a safe evacuation to the orbiting ship.`;
  }
  if (state.foodEmergencySols >= CONFIG.foodEmergencyLimit) {
    return `Laika went ${CONFIG.foodEmergencyLimit} sols in a row without enough food. Mission Control ended the mission early and brought her safely to the orbiting ship.`;
  }
  if (r.radiation >= CONFIG.radiationAbort) {
    return "The radiation hazard meter reached its limit. To keep Laika safe, Mission Control ended the surface stay early.";
  }
  return null;
}

/** Advances exactly one sol. Returns the same state object if blocked. */
export function advanceSol(state: MissionState): MissionState {
  // 1. Validate
  const gate = canAdvance(state);
  if (!gate.ok) return { ...state, notice: gate.reason };

  // 2–8. Deterministic simulation
  const sim = simulateSol(state);
  const lsCritical = sim.resources.lifeSupport < CONFIG.lifeSupportCritical;
  const effects = state.effects
    .map((e) => ({ ...e, solsLeft: e.solsLeft - 1 }))
    .filter((e) => e.solsLeft > 0);

  const log: LogEntry[] = [...state.log];
  const d = (k: ResourceKey) => round1(sim.resources[k] - state.resources[k]);
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  log.push({
    sol: state.sol,
    kind: "report",
    title: `Sol ${state.sol} complete`,
    detail: `Power ${fmt(d("power"))}, Life Support ${fmt(d("lifeSupport"))}, Food ${fmt(
      d("food"),
    )}, Radiation Hazard ${fmt(d("radiation"))}. Weather: ${state.weather}.`,
  });
  if (sim.powerShortage) {
    log.push({
      sol: state.sol,
      kind: "warning",
      title: "Essential power shortage",
      detail: "Demand was higher than stored plus generated power.",
    });
  }
  if (sim.foodShortage) {
    log.push({ sol: state.sol, kind: "warning", title: "Food shortage", detail: "Food stock ran out." });
  }

  let next: MissionState = {
    ...state,
    resources: sim.resources,
    modules: sim.modules,
    cropProgress: sim.cropProgress,
    effects,
    powerEmergencySols: sim.powerShortage ? state.powerEmergencySols + 1 : 0,
    foodEmergencySols: sim.foodShortage ? state.foodEmergencySols + 1 : 0,
    metrics: {
      ...state.metrics,
      powerShortageSols: state.metrics.powerShortageSols + (sim.powerShortage ? 1 : 0),
      foodShortageSols: state.metrics.foodShortageSols + (sim.foodShortage ? 1 : 0),
      lifeSupportCriticalSols: state.metrics.lifeSupportCriticalSols + (lsCritical ? 1 : 0),
    },
    history: [
      ...state.history,
      {
        sol: state.sol,
        resources: sim.resources,
        conditions: {
          habitat: sim.modules.habitat.condition,
          solar: sim.modules.solar.condition,
          battery: sim.modules.battery.condition,
          lifeSupport: sim.modules.lifeSupport.condition,
          shelter: sim.modules.shelter.condition,
          greenhouse: sim.modules.greenhouse.condition,
        },
        powerShortage: sim.powerShortage,
        foodShortage: sim.foodShortage,
      },
    ],
    log,
    lastReport: sim.report,
    reportPending: true,
    notice: null,
    lastAction: null,
    tutorial: { ...state.tutorial, active: false, completed: state.tutorial.completed || state.tutorial.active },
  };

  // 9. Mission status
  const failure = failureCheck(next);
  if (failure) {
    next = { ...next, status: "failure", failureReason: failure };
    next.log = [...next.log, { sol: state.sol, kind: "warning", title: "Mission aborted", detail: failure }];
    return next;
  }
  if (state.sol >= state.maxSols) {
    const ending = determineEnding(next, computeScore(next));
    next = { ...next, status: ending };
    next.log = [
      ...next.log,
      { sol: state.sol, kind: "system", title: "Readiness assessment", detail: "Sol 10 complete. Mission Control reviewed the outpost." },
    ];
    return next;
  }

  // 10. Move to the next sol (seeded rolls happen only here)
  let rng = next.rng;
  const stormLeft = Math.max(0, next.stormSolsLeft - 1);
  const weather: Weather = next.forecast;
  const roll = nextRandom(rng);
  rng = roll.next;
  let forecast: Weather = roll.value < CONFIG.dustyChance ? "DUSTY" : "CLEAR";
  if (stormLeft > 1) forecast = "STORM";

  next = {
    ...next,
    sol: state.sol + 1,
    actionsLeft: CONFIG.actionsPerSol,
    weather,
    forecast,
    stormSolsLeft: stormLeft,
    rng,
  };

  const picked = pickEvent(next);
  next = { ...next, rng: picked.rng };
  if (picked.event) {
    next = { ...next, pendingEvent: picked.event.id, seenEvents: [...next.seenEvents, picked.event.id] };
    next.log = [
      ...next.log,
      { sol: next.sol, kind: "event", title: picked.event.title, detail: picked.event.description },
    ];
    if (picked.event.id === "dust_storm") {
      const dur = nextRandom(next.rng);
      const sols = dur.value < 0.5 ? 1 : 2;
      next = {
        ...next,
        rng: dur.next,
        weather: "STORM",
        stormSolsLeft: sols,
        forecast: sols > 1 ? "STORM" : next.forecast,
      };
    }
  }
  return next;
}

export function setGreenhouseMode(state: MissionState, mode: GreenhouseMode): MissionState {
  if (state.status !== "playing" || state.reportPending) return state;
  if (state.greenhouseMode === mode) return state;
  return {
    ...state,
    greenhouseMode: mode,
    notice: null,
    lastAction: { kind: "mode", moduleId: "greenhouse", sol: state.sol },
    log: [
      ...state.log,
      {
        sol: state.sol,
        kind: "engineering",
        title: `Greenhouse set to ${mode}`,
        detail: `Uses ${CONFIG.greenhousePower[mode]} power per sol.`,
      },
    ],
  };
}
