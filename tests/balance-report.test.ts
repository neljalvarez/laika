import { it } from "vitest";
import { EVENTS } from "@/data/events";
import { canAfford } from "@/game/events";
import type { Difficulty } from "@/game/difficulty";
import { computeScore } from "@/game/scoring";
import { canRepair, canUpgrade } from "@/game/upgrades";
import { MODULE_IDS, type MissionState, type ModuleId } from "@/game/types";
import { nextSol, run, start } from "./helpers";

type Strat = { name: string; order: ModuleId[]; greenhouse: "smart" | "high" | "low" | "off"; events: "best" | "worst" | "cheap"; repair: boolean; reckless?: boolean };
const STRATS: Strat[] = [
  { name: "power-first", order: ["solar", "battery", "solar", "battery", "lifeSupport", "shelter"], greenhouse: "smart", events: "best", repair: true },
  { name: "lifesupport-first", order: ["lifeSupport", "habitat", "lifeSupport", "habitat", "solar", "shelter"], greenhouse: "smart", events: "best", repair: true },
  { name: "food-first", order: ["greenhouse", "greenhouse", "solar", "lifeSupport", "shelter"], greenhouse: "high", events: "best", repair: true },
  { name: "radiation-first", order: ["shelter", "shelter", "solar", "lifeSupport", "greenhouse"], greenhouse: "smart", events: "best", repair: true },
  { name: "balanced", order: ["solar", "shelter", "lifeSupport", "greenhouse", "habitat", "battery"], greenhouse: "smart", events: "best", repair: true },
  { name: "beginner (cheapest choices, no repairs)", order: ["habitat", "greenhouse", "solar"], greenhouse: "low", events: "cheap", repair: false },
  { name: "early-mistake (2 habitat upgrades first, then balanced)", order: ["habitat", "habitat", "solar", "shelter", "lifeSupport"], greenhouse: "smart", events: "best", repair: true },
  { name: "do-nothing", order: [], greenhouse: "off", events: "worst", repair: false },
];

function play(seed: number, st: Strat, diff: Difficulty): MissionState {
  let s = start(seed, diff);
  const order = [...st.order];
  let guard = 0;
  while (s.status === "playing" && guard++ < 50) {
    if (s.pendingEvent) {
      const ok = EVENTS[s.pendingEvent].choices.filter((c) => canAfford(s, c).ok);
      const pick = st.events === "best" ? [...ok].sort((a, b) => b.quality - a.quality)[0] : st.events === "worst" ? [...ok].sort((a, b) => a.quality - b.quality)[0] : ok[ok.length - 1];
      s = run(s, { type: "RESOLVE_EVENT", choiceId: pick.id }, { type: "DISMISS_OUTCOME" });
    }
    const damaged = st.repair ? MODULE_IDS.find((id) => s.modules[id].condition < 65 && canRepair(s, id).ok) : undefined;
    if (damaged) s = run(s, { type: "REPAIR", moduleId: damaged });
    else if (order.length && canUpgrade(s, order[0]).ok) {
      s = run(s, { type: "UPGRADE", moduleId: order[0] });
      order.shift();
    }
    const mode = st.greenhouse === "smart" ? (s.resources.power >= 45 || s.resources.food < 6 ? "HIGH" : "LOW") : st.greenhouse === "high" ? "HIGH" : st.greenhouse === "low" ? "LOW" : "OFF";
    s = run(s, { type: "SET_GREENHOUSE_MODE", mode });
    s = nextSol(s);
  }
  return s;
}

it.runIf(process.env.BALANCE === "1")("balance report (BALANCE=1)", () => {
  const lines: string[] = [];
  for (const diff of ["easy", "normal", "hard"] as Difficulty[]) {
    for (const st of STRATS) {
      const N = 300;
      let wins = 0, total = 0, minMat = 0, outOfMat = 0;
      const fails: Record<string, number> = {};
      for (let seed = 1; seed <= N; seed++) {
        const s = play(seed * 7919, st, diff);
        const won = s.status === "success" || s.status === "outstanding";
        if (won) wins++; else fails[s.status + ":" + (s.failureReason ?? "")] = (fails[s.status + ":" + (s.failureReason ?? "")] ?? 0) + 1;
        total += computeScore(s).total;
        minMat += s.resources.materials;
        if (s.resources.materials < 6) outOfMat++;
      }
      lines.push(`${diff.padEnd(6)} ${st.name.padEnd(56)} win ${(100 * wins / N).toFixed(0).padStart(3)}%  avg ${(total / N).toFixed(1)}  endMat ${(minMat / N).toFixed(0)}  broke ${outOfMat}  ${JSON.stringify(fails)}`);
    }
  }
  console.log(lines.join("\n"));
}, 120000);
