"use client";

// Building information (BUILDINGS tab) and engineering actions (ENGINEERING
// tab). Both read the single MissionState and call the existing engine
// functions; nothing here changes the rules.
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
import { canRepair, canUpgrade, repairAmountFor } from "@/game/upgrades";
import { MODULE_IDS, type GameAction, type GreenhouseMode, type MissionState, type ModuleId } from "@/game/types";

export function conditionTag(c: number): { word: string; cls: string } {
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
      return `Making ${solarGeneration(state)} power today (${state.weather.toLowerCase()} sky).`;
    case "battery":
      return `Holding ${state.resources.power} of ${batteryCapacity(state)} power.`;
    case "lifeSupport":
      return `Recycles ${round1(CONFIG.lifeSupportRecovery[m.level - 1] * conditionFactor(m.condition) * fx.lsRecoveryMult)} life support each sol.`;
    case "habitat":
      return `Uses ${round1(CONFIG.lifeSupportUse[m.level - 1] + (100 - m.condition) / 20)} life support each sol.`;
    case "shelter":
      return `Lets through ${Math.round(shelterMultiplier(m) * 100)}% of the radiation hazard.`;
    case "greenhouse": {
      if (fx.nonessentialOff) return "Switched OFF to save power.";
      if (state.greenhouseMode === "OFF") return "OFF. Crops are not growing.";
      if (state.cropProgress < CONFIG.cropEstablishSols)
        return `Crops growing: ${state.cropProgress} of ${CONFIG.cropEstablishSols} sols. No food yet.`;
      return `Growing ${round1(greenhouseHarvestRate(state, state.greenhouseMode) * fx.foodMult)} food each sol.`;
    }
  }
}

const MODES: GreenhouseMode[] = ["OFF", "LOW", "HIGH"];

interface BuildingProps {
  state: MissionState;
  moduleId: ModuleId | null;
  dispatch: Dispatch<GameAction>;
  onSelect: (id: ModuleId) => void;
  onModeChosen: () => void;
  onOpenEngineering: () => void;
  onOpenScience: (cardId: string) => void;
}

/** BUILDINGS tab: what the selected building is and what it is doing right now. */
export function BuildingPanel({ state, moduleId, dispatch, onSelect, onModeChosen, onOpenEngineering, onOpenScience }: BuildingProps) {
  if (!moduleId) {
    return (
      <div className="space-y-2 text-[14px]">
        <p>Click a building in the outpost, or pick one here.</p>
        <div className="grid grid-cols-2 gap-2">
          {MODULE_IDS.map((id) => (
            <button key={id} type="button" className="btn btn-gray btn-small" onClick={() => onSelect(id)}>
              {MODULES[id].name}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const info = MODULES[moduleId];
  const m = state.modules[moduleId];
  const tag = conditionTag(m.condition);
  return (
    <div className="space-y-2 text-[14px]" data-testid="building-panel" data-building={moduleId}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="h-pixel text-[16px]">{info.name}</h2>
        <span className="tag">Level {m.level}/3</span>
        <span className={`tag ${tag.cls}`}>
          {Math.round(m.condition)}% · {tag.word}
        </span>
      </div>
      <p>{info.tip}</p>
      <p>
        <strong className="uppercase">Now: </strong>
        {liveStatus(state, moduleId)}
      </p>

      {moduleId === "greenhouse" && (
        <div id="greenhouse-modes">
          <div className="mb-1 font-extrabold uppercase">Power mode (free)</div>
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

      <details className="text-[13px]" data-testid="why-matters">
        <summary className="cursor-pointer font-bold">Why does this matter?</summary>
        <p className="mt-1">{info.why}</p>
        <button type="button" className="btn btn-gray btn-small mt-1" onClick={() => onOpenScience(info.card)}>
          Open science card
        </button>
      </details>

      <details className="text-[13px]">
        <summary className="cursor-pointer font-bold">More about this building</summary>
        <p className="mt-1">{info.role}</p>
        <p>{info.levelEffects[m.level - 1]}</p>
        <p>{info.damageNote}</p>
      </details>

      <button type="button" className="btn btn-small w-full" onClick={onOpenEngineering}>
        Upgrade or repair ▸
      </button>
    </div>
  );
}

interface EngineeringProps {
  state: MissionState;
  moduleId: ModuleId | null;
  /** Starts the confirmed action (the dashboard runs the optional minigame, then dispatches). */
  onStart: (kind: "upgrade" | "repair", id: ModuleId) => void;
  onSelect: (id: ModuleId) => void;
}

const BEFORE_ROWS: { key: "power" | "lifeSupport" | "materials" | "food" | "radiation"; label: string }[] = [
  { key: "materials", label: "Materials" },
  { key: "power", label: "Power" },
  { key: "lifeSupport", label: "Life Support" },
  { key: "food", label: "Food" },
  { key: "radiation", label: "Rad Hazard" },
];

/** Shows exactly what you have, and what materials will be left, before you pay. */
function BeforeYouPay({ state, cost }: { state: MissionState; cost: number }) {
  const r = state.resources;
  return (
    <div className="mt-1 border-[2px] border-ink bg-cream p-2 text-[12px]" data-testid="before-you-pay">
      <div className="font-extrabold uppercase">Before you pay</div>
      <ul className="grid grid-cols-2 gap-x-3">
        {BEFORE_ROWS.map(({ key, label }) => (
          <li key={key} className="flex justify-between gap-2">
            <span>{label}</span>
            <strong className="tabular-nums">
              {key === "materials" ? `${r.materials} → ${r.materials - cost}` : r[key]}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** ENGINEERING tab: Upgrade and Repair, shown as two clearly different actions. */
export function EngineeringPanel({ state, moduleId, onStart, onSelect }: EngineeringProps) {
  const [confirm, setConfirm] = useState<{ id: ModuleId; kind: "upgrade" | "repair" } | null>(null);
  const mats = state.resources.materials;

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="tag">Materials: {mats}</span>
      <span className={`tag ${state.actionsLeft > 0 ? "tag-ok" : "tag-warn"}`}>Builds left today: {state.actionsLeft}</span>
    </div>
  );

  const picker = (
    <div>
      <div className="mb-1 text-[12px] font-extrabold uppercase">Pick a building</div>
      <div className="grid grid-cols-2 gap-1">
        {MODULE_IDS.map((id) => {
          const m = state.modules[id];
          return (
            <button
              key={id}
              type="button"
              className="btn btn-gray btn-toggle btn-small"
              aria-pressed={moduleId === id}
              onClick={() => onSelect(id)}
            >
              {MODULES[id].name}
              <span className="block text-[10px] normal-case">
                Lv {m.level} · {Math.round(m.condition)}%{m.condition < 60 ? " !" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!moduleId) {
    return (
      <div className="space-y-2 text-[14px]">
        {header}
        <p>You can do one upgrade or one repair each sol.</p>
        {picker}
      </div>
    );
  }

  const info = MODULES[moduleId];
  const m = state.modules[moduleId];
  const up = canUpgrade(state, moduleId);
  const rep = canRepair(state, moduleId);
  const pending = confirm && confirm.id === moduleId ? confirm.kind : null;
  const afterRepair = Math.min(100, Math.round(m.condition) + repairAmountFor(state));

  const act = (kind: "upgrade" | "repair") => {
    onStart(kind, moduleId);
    setConfirm(null);
  };

  return (
    <div className="space-y-2 text-[14px]" data-testid="engineering-panel">
      {header}
      <h2 className="h-pixel text-[15px]">{info.name}</h2>

      <section className="border-[3px] border-ink bg-white p-2" aria-label="Upgrade">
        <div className="flex items-center justify-between gap-2">
          <h3 className="h-pixel text-[14px]">▲ Upgrade</h3>
          <span className="tag" style={{ background: "#6fb1f5" }}>
            Makes it stronger
          </span>
        </div>
        {m.level < 3 ? (
          <>
            <p className="text-[13px]">Upgrade improves what a building can do.</p>
            <p className="text-[13px]">
              <strong>Level:</strong> {m.level} → {m.level + 1}
              <br />
              <strong>{info.stat.label}:</strong> {info.stat.values[m.level - 1]} → {info.stat.values[m.level]}
              <br />
              <strong>Cost:</strong> {up.cost} materials
            </p>
          </>
        ) : (
          <p className="text-[13px]">This building is at the top level.</p>
        )}
        {pending === "upgrade" ? (
          <div className="mt-1 border-[3px] border-ink bg-gold p-2" role="alert">
            <div className="text-[13px] font-bold">Spend {up.cost} materials to upgrade?</div>
            <BeforeYouPay state={state} cost={up.cost} />
            <div className="mt-1 flex gap-2">
              <button type="button" className="btn btn-go btn-small" onClick={() => act("upgrade")}>
                Build
              </button>
              <button type="button" className="btn btn-gray btn-small" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-small mt-1 w-full" disabled={!up.ok} onClick={() => setConfirm({ id: moduleId, kind: "upgrade" })}>
            Upgrade{m.level < 3 ? ` (${up.cost})` : ""}
          </button>
        )}
        {!up.ok && up.reason && pending !== "upgrade" && <p className="mt-1 text-[12px]">{up.reason}</p>}
      </section>

      <section className="border-[3px] border-ink bg-white p-2" aria-label="Repair">
        <div className="flex items-center justify-between gap-2">
          <h3 className="h-pixel text-[14px]">✚ Repair</h3>
          <span className="tag tag-ok">Fixes damage</span>
        </div>
        <p className="text-[13px]">Repair fixes a damaged building so it works properly again. The level stays the same.</p>
        <p className="text-[13px]">
          <strong>Condition:</strong> {Math.round(m.condition)}% → {afterRepair}%
          <br />
          <strong>Cost:</strong> {rep.cost} materials
        </p>
        {pending === "repair" ? (
          <div className="mt-1 border-[3px] border-ink bg-gold p-2" role="alert">
            <div className="text-[13px] font-bold">Spend {rep.cost} materials to repair?</div>
            <BeforeYouPay state={state} cost={rep.cost} />
            <div className="mt-1 flex gap-2">
              <button type="button" className="btn btn-go btn-small" onClick={() => act("repair")}>
                Repair
              </button>
              <button type="button" className="btn btn-gray btn-small" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-go btn-small mt-1 w-full" disabled={!rep.ok} onClick={() => setConfirm({ id: moduleId, kind: "repair" })}>
            Repair ({rep.cost})
          </button>
        )}
        {!rep.ok && rep.reason && pending !== "repair" && <p className="mt-1 text-[12px]">{rep.reason}</p>}
      </section>

      <details className="text-[13px]">
        <summary className="cursor-pointer font-bold">Pick another building</summary>
        <div className="mt-1">{picker}</div>
      </details>
    </div>
  );
}
