"use client";

import { useState, type Dispatch } from "react";
import { MODULES } from "@/data/modules";
import { CONFIG, conditionFactor, round1 } from "@/game/config";
import {
  batteryCapacity,
  effectTotals,
  greenhouseHarvestRate,
  shelterMultiplier,
  solarGeneration,
} from "@/game/engine";
import { canRepair, canUpgrade } from "@/game/upgrades";
import type { GameAction, GreenhouseMode, MissionState, ModuleId } from "@/game/types";

function conditionTag(c: number): { word: string; cls: string } {
  if (c >= 85) return { word: "Good", cls: "tag-ok" };
  if (c >= 60) return { word: "Worn", cls: "tag-warn" };
  if (c >= 40) return { word: "Damaged", cls: "tag-bad" };
  return { word: "Badly damaged", cls: "tag-bad" };
}

function liveStatus(state: MissionState, id: ModuleId): string {
  const m = state.modules[id];
  const fx = effectTotals(state.effects);
  switch (id) {
    case "solar":
      return `Making ${solarGeneration(state)} power this sol (${state.weather.toLowerCase()} sky, ${Math.round(conditionFactor(m.condition) * 100)}% efficiency).`;
    case "battery":
      return `Holding ${state.resources.power} of ${batteryCapacity(state)} power.`;
    case "lifeSupport":
      return `Recovering ${round1(CONFIG.lifeSupportRecovery[m.level - 1] * conditionFactor(m.condition) * fx.lsRecoveryMult)} life support per sol when fully powered.`;
    case "habitat":
      return `Uses ${CONFIG.lifeSupportUse[m.level - 1]} life support per sol, plus ${round1((100 - m.condition) / 20)} lost to leaks.`;
    case "shelter":
      return `Radiation hazard gain is multiplied by ${shelterMultiplier(m).toFixed(2)}.`;
    case "greenhouse": {
      if (fx.nonessentialOff) return "Switched OFF by a power-saving decision.";
      if (state.greenhouseMode === "OFF") return "OFF: no power used, crops are not growing.";
      if (state.cropProgress < CONFIG.cropEstablishSols)
        return `Crops growing: ${state.cropProgress}/${CONFIG.cropEstablishSols} powered sols done. No harvest until established.`;
      return `Harvesting ${round1(greenhouseHarvestRate(state, state.greenhouseMode) * fx.foodMult)} food per sol.`;
    }
  }
}

const MODES: GreenhouseMode[] = ["OFF", "LOW", "HIGH"];

interface Props {
  state: MissionState;
  moduleId: ModuleId | null;
  dispatch: Dispatch<GameAction>;
  onModeChosen: () => void;
  highlightModes: boolean;
}

export function ModuleInspector({ state, moduleId, dispatch, onModeChosen, highlightModes }: Props) {
  const [confirm, setConfirm] = useState<{ id: ModuleId; kind: "upgrade" | "repair" } | null>(null);

  if (!moduleId) {
    return (
      <section className="panel" aria-label="Module inspector">
        <div className="panel-title">Module Inspector</div>
        <p className="p-3 text-[14px]">Click a building in the outpost to inspect, upgrade or repair it.</p>
      </section>
    );
  }

  const info = MODULES[moduleId];
  const m = state.modules[moduleId];
  const tag = conditionTag(m.condition);
  const up = canUpgrade(state, moduleId);
  const rep = canRepair(state, moduleId);
  const pending = confirm && confirm.id === moduleId ? confirm.kind : null;
  const mats = state.resources.materials;

  const doConfirm = () => {
    if (!pending) return;
    dispatch({ type: pending === "upgrade" ? "UPGRADE" : "REPAIR", moduleId });
    setConfirm(null);
  };

  return (
    <section className="panel" aria-label={`${info.name} inspector`}>
      <div className="panel-title">
        <span>{info.name}</span>
        <span className="tag" style={{ color: "#2a1a22" }}>
          Level {m.level}/3
        </span>
      </div>
      <div className="space-y-2 p-3 text-[14px]">
        <p>{info.role}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold uppercase">Condition</span>
          <span className={`tag ${tag.cls}`}>
            {Math.round(m.condition)}% · {tag.word}
          </span>
        </div>
        <p>
          <span className="font-extrabold uppercase">Now: </span>
          {liveStatus(state, moduleId)}
        </p>
        {m.condition < 100 && <p className="text-[13px]">{info.damageNote}</p>}

        {moduleId === "greenhouse" && (
          <div id="greenhouse-modes" className={highlightModes ? "tutorial-target p-1" : ""}>
            <div className="mb-1 font-extrabold uppercase">Power mode (free to change)</div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Greenhouse power mode">
              {MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="btn btn-gray btn-toggle btn-small"
                  aria-pressed={state.greenhouseMode === mode}
                  onClick={() => {
                    dispatch({ type: "SET_GREENHOUSE_MODE", mode });
                    onModeChosen();
                  }}
                >
                  {mode}
                  <span className="block text-[10px] normal-case">
                    −{CONFIG.greenhousePower[mode]} power
                    <br />+{round1(greenhouseHarvestRate(state, mode))} food
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t-[3px] border-ink pt-2">
          <div className="font-extrabold uppercase">
            {m.level < 3 ? `Upgrade to level ${m.level + 1}` : "Fully upgraded"}
          </div>
          {m.level < 3 && (
            <p className="text-[13px]">
              Now: {info.levelEffects[m.level - 1]}
              <br />
              Next: {info.levelEffects[m.level]}
            </p>
          )}
        </div>

        {pending ? (
          <div className="border-[3px] border-ink bg-gold p-2" role="alert">
            <div className="font-extrabold uppercase">Confirm {pending}</div>
            {pending === "upgrade" ? (
              <ul className="list-disc pl-5 text-[13px]">
                <li>
                  Cost now: {up.cost} materials ({mats} → {mats - up.cost}).
                </li>
                <li>Uses today&apos;s one engineering action.</li>
                <li>Long-term benefit: {info.levelEffects[m.level]}</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 text-[13px]">
                <li>
                  Cost now: {rep.cost} materials ({mats} → {mats - rep.cost}).
                </li>
                <li>Uses today&apos;s one engineering action.</li>
                <li>
                  Benefit: condition {Math.round(m.condition)}% → {Math.min(100, Math.round(m.condition) + CONFIG.repairAmount)}%, so it
                  works better again.
                </li>
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn btn-go btn-small" onClick={doConfirm} data-autofocus>
                Build
              </button>
              <button type="button" className="btn btn-gray btn-small" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-small"
              disabled={!up.ok}
              onClick={() => setConfirm({ id: moduleId, kind: "upgrade" })}
            >
              Upgrade{m.level < 3 ? ` (${up.cost})` : ""}
            </button>
            <button
              type="button"
              className="btn btn-small"
              disabled={!rep.ok}
              onClick={() => setConfirm({ id: moduleId, kind: "repair" })}
            >
              Repair ({rep.cost})
            </button>
          </div>
        )}
        {!pending && (!up.ok || !rep.ok) && (
          <ul className="text-[12px]">
            {!up.ok && up.reason && <li>Upgrade: {up.reason}</li>}
            {!rep.ok && rep.reason && <li>Repair: {rep.reason}</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
