"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { getLaikaLine } from "@/data/dialogue";
import { MODULES } from "@/data/modules";
import { TUTORIAL_STAGES, TUTORIAL_TRADEOFF_LINE } from "@/data/tutorial";
import { CONFIG, round1 } from "@/game/config";
import { batteryCapacity, canAdvance, effectTotals, simulateSol, solarGeneration } from "@/game/engine";
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
import { SoundToggle } from "./SoundToggle";
import { SolReportModal } from "./SolReportModal";

type Overlay = null | "log" | "science" | "howto" | "preview" | "restart";

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

  const tut = state.tutorial.active ? Math.min(state.tutorial.step, TUTORIAL_STAGES.length - 1) : -1;
  // Tutorial stage 4: has the player really used the greenhouse mode buttons?
  const [modeTouched, setModeTouched] = useState(false);
  // Short-lived visual feedback. None of this feeds back into the game engine.
  const [flash, setFlash] = useState<{ id: ModuleId; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [banner, setBanner] = useState<number | null>(null);
  const laika = getLaikaLine(state);
  const fx = effectTotals(state.effects);
  const sim = useMemo(() => simulateSol(state), [state]);
  const gate = canAdvance(state);
  const playing = state.status === "playing";

  // Confirmation after the engine has really applied an upgrade or repair.
  const builtCount = state.metrics.upgradesBuilt + state.metrics.repairsDone;
  const builtRef = useRef(builtCount);
  useEffect(() => {
    const before = builtRef.current;
    builtRef.current = builtCount;
    if (builtCount <= before) return;
    const action = state.lastAction;
    const entry = state.log[state.log.length - 1];
    if (!action?.moduleId || !entry) return;
    const level = state.modules[action.moduleId].level;
    setFlash({ id: action.moduleId, text: action.kind === "upgrade" ? `LEVEL ${level}!` : "REPAIRED!" });
    setToast(`✓ ${entry.title}. ${entry.detail}`);
    const t1 = window.setTimeout(() => setFlash(null), 1800);
    const t2 = window.setTimeout(() => setToast(null), 3600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // Only the confirmed build count should trigger this.
  }, [builtCount]);

  // "SOL n" banner when a new sol begins (after its report is acknowledged).
  const reportRef = useRef(state.reportPending);
  useEffect(() => {
    const was = reportRef.current;
    reportRef.current = state.reportPending;
    if (!was || state.reportPending || state.status !== "playing") return;
    setBanner(state.sol);
    const t = window.setTimeout(() => setBanner(null), 1500);
    return () => window.clearTimeout(t);
  }, [state.reportPending, state.sol, state.status]);

  const select = (id: ModuleId) => {
    setSelected(id);
    // Only the real Solar Array completes the "inspect solar" stage.
    if (tut === 1 && id === "solar") dispatch({ type: "TUTORIAL_STEP", from: 1 });
  };

  const openPreview = () => {
    setOverlay("preview");
    if (tut === 4) dispatch({ type: "TUTORIAL_STEP", from: 4 });
  };

  const stage = tut >= 0 ? TUTORIAL_STAGES[tut] : null;
  let tutorialTask = stage?.task ?? "";
  let tutorialNext = stage?.next ?? null;
  if (tut === 1 && selected && selected !== "solar") {
    tutorialTask = `That is the ${MODULES[selected].name}. Find the SOLAR ARRAY: the blue panels on the left.`;
  }
  if (tut === 3) {
    if (selected !== "greenhouse") tutorialTask = "Click the GREENHOUSE (the glass dome) in the outpost.";
    else if (!modeTouched) tutorialTask = "Now pick a power mode in the inspector: OFF, LOW or HIGH.";
    else {
      const dPower = round1(sim.resources.power - state.resources.power);
      const dFood = round1(sim.resources.food - state.resources.food);
      tutorialTask = `Mode is ${state.greenhouseMode}. Next sol: Power ${sign(dPower)}, Food ${sign(dFood)}. Crops need ${CONFIG.cropEstablishSols} powered sols before the first harvest. Change it again if you like, then press Next.`;
      tutorialNext = "Next";
    }
  }
  if (tut === 5 && !gate.ok && gate.reason) tutorialTask = `${gate.reason} Then press ADVANCE SOL.`;

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
        return (
          <HowToPlay
            onClose={() => setOverlay(null)}
            onReplay={
              state.tutorial.active
                ? undefined
                : () => {
                    setModeTouched(false);
                    dispatch({ type: "TUTORIAL_REPLAY" });
                    setOverlay(null);
                  }
            }
          />
        );
      case "preview":
        return (
          <SolReportModal
            report={sim.report}
            preview
            onClose={() => setOverlay(null)}
            closeLabel="Back to planning"
            note={state.tutorial.active ? TUTORIAL_TRADEOFF_LINE : undefined}
          />
        );
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
          <SoundToggle />
          <button type="button" className="btn btn-warn btn-small" onClick={() => setOverlay("restart")}>
            Restart
          </button>
        </nav>
      </header>

      <ResourceHud state={state} highlight={tut === 0 || tut === 2} />

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
          <div className={`outpost-frame${tut === 0 ? " tutorial-target" : ""}`}>
            <PixelMarsOutpost
              modules={state.modules}
              weather={state.weather}
              greenhouseMode={fx.nonessentialOff ? "OFF" : state.greenhouseMode}
              cropProgress={state.cropProgress}
              charge={state.resources.power / Math.max(1, batteryCapacity(state))}
              generation={solarGeneration(state)}
              flash={flash}
              laikaBurst={flash !== null}
              selected={selected}
              onSelect={select}
              mood={laika.mood}
              sheltering={fx.sheltering}
              highlight={tut === 1 ? "solar" : tut === 3 && selected !== "greenhouse" ? "greenhouse" : null}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            {stage ? (
              <section className="panel" aria-label="Tutorial" style={{ background: "#FFF1D0" }}>
                <div className="panel-title flex-wrap">
                  <span className="flex items-center gap-2">
                    <span>
                      Training {tut + 1}/{TUTORIAL_STAGES.length}: {stage.title}
                    </span>
                    <span className="flex gap-1" aria-hidden="true">
                      {TUTORIAL_STAGES.map((_, i) => (
                        <span
                          key={i}
                          style={{ width: 9, height: 9, border: "2px solid #2a1a22", background: i < tut ? "#81C995" : i === tut ? "#F2CA76" : "#542D30" }}
                        />
                      ))}
                    </span>
                  </span>
                  {/* Buttons live in the title bar so they are always visible, on every stage. */}
                  <span className="flex flex-wrap gap-2">
                    {tut > 0 && (
                      <button type="button" className="btn btn-gray btn-small" onClick={() => dispatch({ type: "TUTORIAL_BACK" })}>
                        Back
                      </button>
                    )}
                    {tutorialNext && (
                      <button type="button" className="btn btn-go btn-small" onClick={() => dispatch({ type: "TUTORIAL_STEP", from: tut })}>
                        {tutorialNext}
                      </button>
                    )}
                    <button type="button" className="btn btn-gray btn-small" onClick={() => dispatch({ type: "TUTORIAL_SKIP" })}>
                      Skip Tutorial
                    </button>
                  </span>
                </div>
                <div className="flex items-start gap-3 p-2">
                  <div className="border-[3px] border-ink bg-slate p-1">
                    <LaikaSprite mood={tut === 5 ? "happy" : "idle"} scale={2} />
                  </div>
                  <div className="min-w-0 flex-1" aria-live="polite">
                    {stage.lines.map((line) => (
                      <p key={line} className="text-[13px] font-bold leading-snug">
                        “{line}”
                      </p>
                    ))}
                    <p className="mt-1 text-[13px] leading-snug" data-testid="tutorial-task">
                      <span className="tag tag-warn">Do this</span> {tutorialTask}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
            <section className="panel flex items-center gap-3 p-2" aria-label="Laika">
              <div className="border-[3px] border-ink bg-slate p-1">
                <LaikaSprite mood={laika.mood} scale={2} motion={flash ? "laika-hop-brief" : undefined} />
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
            )}

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
                <button type="button" id="btn-preview" className={`btn btn-gray ${tut === 4 ? "tutorial-target" : ""}`} onClick={openPreview} disabled={!playing}>
                  Preview Next Sol
                </button>
                <button
                  type="button"
                  id="btn-advance"
                  className={`btn btn-go ${tut === 5 ? "tutorial-target" : ""}`}
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
            highlightModes={tut === 3 && !modeTouched}
            onModeChosen={() => {
              if (tut === 3) setModeTouched(true);
            }}
          />
          <EngineeringWorkshop state={state} selected={selected} onSelect={select} />
        </div>
      </div>

      {modal}

      {toast && (
        <div className="toast" role="status">
          <div className="panel px-3 py-2 text-[14px] font-bold" style={{ background: "#81C995" }}>
            {toast}
          </div>
        </div>
      )}
      {banner !== null && (
        <div className="sol-banner" aria-hidden="true">
          <div className="panel-dark px-10 py-4 text-center">
            <div className="text-[14px] font-extrabold uppercase tracking-widest">Now beginning</div>
            <div className="text-[44px] font-extrabold leading-none">SOL {banner}</div>
          </div>
        </div>
      )}
    </main>
  );
}
