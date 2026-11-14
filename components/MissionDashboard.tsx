"use client";

import { useMemo, useState, type Dispatch } from "react";
import { getLaikaLine } from "@/data/dialogue";
import { CONFIG, round1 } from "@/game/config";
import { batteryCapacity, canAdvance, effectTotals, simulateSol } from "@/game/engine";
import type { GameAction, MissionState, ModuleId, ResourceKey } from "@/game/types";
import { EngineeringWorkshop } from "./EngineeringWorkshop";
import { HowToPlay } from "./HowToPlay";
import { LaikaSprite } from "./LaikaSprite";
import { EventOutcomeModal, MissionEventModal } from "./MissionEventModal";
import { MissionLog } from "./MissionLog";
import { Modal } from "./Modal";
import { ModuleInspector } from "./ModuleInspector";
import { PixelMarsOutpost } from "./PixelMarsOutpost";
import { ResourceHud, WeatherBadge } from "./ResourceHud";
import { ScienceLab } from "./ScienceLab";
import { SolReportModal } from "./SolReportModal";

type Overlay = null | "log" | "science" | "howto" | "preview" | "restart";

const TUTORIAL: { title: string; text: string; next?: boolean }[] = [
  {
    title: "Inspect the Solar Array",
    text: "Click the SOLAR ARRAY (the blue panels). Sunlight is the outpost's only source of electricity.",
  },
  {
    title: "Read the resource meters",
    text: "Power runs everything. Life Support is Laika's air and water. Food feeds her. Materials build things. Radiation Hazard should stay low.",
    next: true,
  },
  {
    title: "Choose greenhouse power",
    text: "Click the GREENHOUSE, then pick OFF, LOW or HIGH. More power grows more food, but crops need 2 powered sols before the first harvest. Watch the “If you advance now” numbers.",
  },
  {
    title: "Preview the next sol",
    text: "Press PREVIEW NEXT SOL to see exactly what will change before you commit.",
  },
  {
    title: "Advance the sol",
    text: "Ready? Press ADVANCE SOL. A report will explain every change.",
  },
];

const PREDICT: { key: ResourceKey; label: string }[] = [
  { key: "power", label: "Power" },
  { key: "lifeSupport", label: "Life" },
  { key: "food", label: "Food" },
  { key: "radiation", label: "Rad" },
];

const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");

interface Props {
  state: MissionState;
  dispatch: Dispatch<GameAction>;
  saveOk: boolean | null;
  onRestart: () => void;
}

export function MissionDashboard({ state, dispatch, saveOk, onRestart }: Props) {
  const [selected, setSelected] = useState<ModuleId | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  const tut = state.tutorial.active ? state.tutorial.step : -1;
  const laika = getLaikaLine(state);
  const fx = effectTotals(state.effects);
  const sim = useMemo(() => simulateSol(state), [state]);
  const gate = canAdvance(state);
  const playing = state.status === "playing";

  const select = (id: ModuleId) => {
    setSelected(id);
    if (tut === 0 && id === "solar") dispatch({ type: "TUTORIAL_STEP", from: 0 });
  };

  const openPreview = () => {
    setOverlay("preview");
    if (tut === 3) dispatch({ type: "TUTORIAL_STEP", from: 3 });
  };

  const warnings: string[] = [];
  if (state.powerEmergencySols > 0)
    warnings.push(`EMERGENCY: essential power shortage ${state.powerEmergencySols} of ${CONFIG.powerEmergencyLimit} sols. One more ends the mission.`);
  if (state.foodEmergencySols > 0)
    warnings.push(`EMERGENCY: food shortage ${state.foodEmergencySols} of ${CONFIG.foodEmergencyLimit} sols. One more ends the mission.`);
  if (state.resources.lifeSupport < CONFIG.lifeSupportCritical)
    warnings.push("WARNING: life support is critical. The mission ends if it reaches 0.");
  if (state.resources.radiation >= CONFIG.radiationWarning)
    warnings.push("WARNING: radiation hazard is high. The mission ends if it reaches 100.");

  const modal = (() => {
    if (state.reportPending && state.lastReport) {
      return (
        <SolReportModal
          report={state.lastReport}
          onClose={() => dispatch({ type: "DISMISS_REPORT" })}
          closeLabel={playing ? `Start Sol ${state.sol}` : "See Mission Debrief"}
        />
      );
    }
    if (!playing) return null;
    if (state.pendingEvent) return <MissionEventModal state={state} dispatch={dispatch} />;
    if (state.eventOutcome) return <EventOutcomeModal state={state} dispatch={dispatch} />;
    switch (overlay) {
      case "log":
        return <MissionLog log={state.log} onClose={() => setOverlay(null)} />;
      case "science":
        return <ScienceLab onClose={() => setOverlay(null)} />;
      case "howto":
        return <HowToPlay onClose={() => setOverlay(null)} />;
      case "preview":
        return <SolReportModal report={sim.report} preview onClose={() => setOverlay(null)} closeLabel="Back to planning" />;
      case "restart":
        return (
          <Modal
            title="Restart mission?"
            maxWidth={480}
            onClose={() => setOverlay(null)}
            footer={
              <>
                <button type="button" className="btn btn-gray" onClick={() => setOverlay(null)} data-autofocus>
                  Keep playing
                </button>
                <button type="button" className="btn btn-warn" onClick={onRestart}>
                  Yes, erase and restart
                </button>
              </>
            }
          >
            <p>This erases the saved mission and returns to the main menu. It cannot be undone.</p>
          </Modal>
        );
      default:
        return null;
    }
  })();

  return (
    <main className="mx-auto max-w-[1280px] space-y-2 p-2 sm:p-3">
      <header className="panel flex flex-wrap items-center gap-2 p-2">
        <div className="mr-auto leading-tight">
          <div className="h-pixel text-[16px]">LAIKA: Mission Red Planet</div>
          <div className="text-[12px]" role="status">
            {saveOk === true ? "✓ Progress saved" : saveOk === false ? "✕ Not saved (storage unavailable)" : " "}
          </div>
        </div>
        <div className="panel-dark px-3 py-1 text-center leading-tight" aria-label={`Sol ${state.sol} of ${state.maxSols}`}>
          <div className="text-[10px] font-extrabold uppercase tracking-wide">Sol</div>
          <div className="text-[20px] font-extrabold tabular-nums">
            {state.sol}
            <span className="text-[13px]"> / {state.maxSols}</span>
          </div>
        </div>
        <WeatherBadge label="Today" weather={state.weather} />
        <WeatherBadge label="Forecast" weather={state.forecast} />
        <nav className="flex flex-wrap gap-2" aria-label="Quick navigation">
          <button type="button" className="btn btn-gray btn-small" onClick={() => setOverlay("log")}>
            Log
          </button>
          <button type="button" className="btn btn-gray btn-small" onClick={() => setOverlay("science")}>
            Science Lab
          </button>
          <button type="button" className="btn btn-gray btn-small" onClick={() => setOverlay("howto")}>
            Help
          </button>
          <button type="button" className="btn btn-warn btn-small" onClick={() => setOverlay("restart")}>
            Restart
          </button>
        </nav>
      </header>

      <ResourceHud state={state} highlight={tut === 1} />

      {tut >= 0 && (
        <section className="panel" aria-label="Tutorial" aria-live="polite" style={{ background: "#F2CA76" }}>
          <div className="flex flex-wrap items-center gap-3 p-2">
            <span className="tag" style={{ background: "#27334C", color: "#FFF1D0" }}>
              Tutorial {tut + 1}/{TUTORIAL.length}
            </span>
            <div className="min-w-[200px] flex-1 text-[14px]">
              <strong className="uppercase">{TUTORIAL[tut].title}: </strong>
              {TUTORIAL[tut].text}
            </div>
            {TUTORIAL[tut].next && (
              <button type="button" className="btn btn-go btn-small" onClick={() => dispatch({ type: "TUTORIAL_STEP", from: tut })}>
                Got it
              </button>
            )}
            <button type="button" className="btn btn-gray btn-small" onClick={() => dispatch({ type: "TUTORIAL_SKIP" })}>
              Skip tutorial
            </button>
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <div className="panel p-2 text-[14px] font-extrabold" role="alert" style={{ background: "#ED695B", color: "#fff" }}>
          {warnings.map((w) => (
            <div key={w}>⚠ {w}</div>
          ))}
        </div>
      )}
      {state.notice && (
        <div className="panel flex items-center justify-between gap-2 p-2 text-[14px] font-bold" role="alert">
          <span>✕ {state.notice}</span>
          <button type="button" className="btn btn-gray btn-small" onClick={() => dispatch({ type: "CLEAR_NOTICE" })}>
            OK
          </button>
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0 space-y-2">
          <div className="outpost-frame">
            <PixelMarsOutpost
              modules={state.modules}
              weather={state.weather}
              greenhouseMode={fx.nonessentialOff ? "OFF" : state.greenhouseMode}
              cropProgress={state.cropProgress}
              charge={state.resources.power / Math.max(1, batteryCapacity(state))}
              selected={selected}
              onSelect={select}
              mood={laika.mood}
              sheltering={fx.sheltering}
              highlight={tut === 0 ? "solar" : tut === 2 ? "greenhouse" : null}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <section className="panel flex items-center gap-3 p-2" aria-label="Laika">
              <div className="border-[3px] border-ink bg-slate p-1">
                <LaikaSprite mood={laika.mood} scale={2} />
              </div>
              <div className="min-w-0">
                <div className="h-pixel text-[12px] text-maroon">Laika says</div>
                <p className="text-[15px] font-bold" aria-live="polite">
                  {laika.text}
                </p>
                {state.effects.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1" aria-label="Active effects">
                    {state.effects.map((e) => (
                      <span key={e.id} className="tag tag-warn">
                        {e.label} · {e.solsLeft} sol{e.solsLeft === 1 ? "" : "s"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="panel p-2" aria-label="Sol controls">
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-maroon">If you advance now</div>
              <div className="mb-2 flex flex-wrap gap-1" aria-live="polite">
                {PREDICT.map(({ key, label }) => {
                  const d = round1(sim.resources[key] - state.resources[key]);
                  return (
                    <span key={key} className="tag tabular-nums" data-predict={key}>
                      {label} {sign(d)}
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" id="btn-preview" className={`btn btn-gray ${tut === 3 ? "tutorial-target" : ""}`} onClick={openPreview} disabled={!playing}>
                  Preview Next Sol
                </button>
                <button
                  type="button"
                  id="btn-advance"
                  className={`btn btn-go ${tut === 4 ? "tutorial-target" : ""}`}
                  onClick={() => dispatch({ type: "ADVANCE_SOL" })}
                  disabled={!gate.ok}
                >
                  Advance Sol ▶
                </button>
              </div>
              {!gate.ok && gate.reason && <div className="mt-1 text-[12px]">{gate.reason}</div>}
            </section>
          </div>
        </div>

        <div className="space-y-2">
          <ModuleInspector
            state={state}
            moduleId={selected}
            dispatch={dispatch}
            highlightModes={tut === 2}
            onModeChosen={() => {
              if (tut === 2) dispatch({ type: "TUTORIAL_STEP", from: 2 });
            }}
          />
          <EngineeringWorkshop state={state} selected={selected} onSelect={select} />
        </div>
      </div>

      {modal}
    </main>
  );
}
