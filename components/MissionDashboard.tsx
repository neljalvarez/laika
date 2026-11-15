"use client";

// Main mission screen:
//   A. compact status bar (always visible)
//   B. the pixel-art outpost (centrepiece) + one guidance line
//   C. one tabbed information panel
// UI state (tab, overlays, animations) lives here; game data lives only in
// MissionState and changes only through dispatch().
import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { getLaikaLine } from "@/data/dialogue";
import { getNextAction } from "@/data/guidance";
import { missionText, missionWhy } from "@/game/missions";
import { GEAR_PERKS } from "@/game/gears";
import { INSIGHTS } from "@/game/insights";
import { playSound } from "@/lib/sound";
import { MODULES } from "@/data/modules";
import { SCIENCE_CARDS } from "@/data/science";
import { TUTORIAL_STAGES, TUTORIAL_TRADEOFF_LINE } from "@/data/tutorial";
import { CONFIG, round1 } from "@/game/config";
import { difficultyOf } from "@/game/difficulty";
import { batteryCapacity, canAdvance, effectTotals, simulateSol, solarGeneration } from "@/game/engine";
import { MODULE_IDS, type GameAction, type MissionState, type ModuleId, type ResourceKey } from "@/game/types";
import { HowToPlay } from "./HowToPlay";
import { LaikaSprite } from "./LaikaSprite";
import { EventOutcomeModal, MissionEventModal } from "./MissionEventModal";
import { MissionLogList } from "./MissionLog";
import { Modal } from "./Modal";
import { BuildingPanel, EngineeringPanel } from "./ModuleInspector";
import { PixelMarsOutpost } from "./PixelMarsOutpost";
import { PixelSprite } from "./pixel/PixelSprite";
import { earnedGear, GEAR, ICONS } from "./pixel/sprites";
import { Minigame } from "./Minigame";
import { Reveal } from "./Reveal";
import { ResourceHud, WEATHER_TEXT, WeatherBadge } from "./ResourceHud";
import { ScienceLab } from "./ScienceLab";
import { SettingsModal } from "./SettingsModal";
import { SolReportModal, SolSummaryModal } from "./SolReportModal";
import { TutorialSpotlight } from "./TutorialSpotlight";
import { UpgradeReveal } from "./UpgradeReveal";

type Overlay = null | "science" | "howto" | "preview" | "restart" | "settings";
type Tab = "overview" | "buildings" | "engineering" | "log" | "science";
type Region = "status" | "scene" | "bar" | "panel" | null;

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "buildings", label: "Buildings" },
  { id: "engineering", label: "Engineering" },
  { id: "log", label: "Log" },
  { id: "science", label: "Science" },
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
  const [tab, setTab] = useState<Tab>("overview");
  // The new-sol splash is shown once per sol. A mission loaded mid-report
  // skips it. Derived during render, so the summary can never flash first.
  const [splashSeenSol, setSplashSeenSol] = useState<number | null>(state.reportPending ? state.sol : null);
  const [fullReport, setFullReport] = useState(false);
  const [modeTouched, setModeTouched] = useState(false);
  // Short-lived presentation state. None of it feeds back into the engine.
  const [flash, setFlash] = useState<{ id: ModuleId; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ id: ModuleId; level: number } | null>(null);
  // After a build, Laika walks over to the building (presentation only).
  const [visit, setVisit] = useState<{ id: ModuleId; key: number } | null>(null);
  const [talking, setTalking] = useState(false);
  const [scienceFocus, setScienceFocus] = useState<string | undefined>(undefined);
  // A confirmed build waiting on the optional minigame. Dispatched exactly once.
  const [build, setBuild] = useState<{ kind: "upgrade" | "repair"; id: ModuleId } | null>(null);
  // Laika's newest line stays hidden behind a "!" until the player opens it.
  const [seenLine, setSeenLine] = useState<string | null>(null);

  const tut = state.tutorial.active ? Math.min(state.tutorial.step, TUTORIAL_STAGES.length - 1) : -1;
  const laika = getLaikaLine(state);
  const nextAction = getNextAction(state);
  const fx = effectTotals(state.effects);
  // Desktop: the outpost grows to fill the screen height.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const sim = useMemo(() => simulateSol(state), [state]);
  const gate = canAdvance(state);
  const playing = state.status === "playing";
  const gear = earnedGear(state.sol, state.status === "success" || state.status === "outstanding");
  const newGear = GEAR.find((g) => !g.finale && g.sol === state.sol);
  const lineUnread = laika.text !== seenLine;

  // Laika "speaks": a short mouth animation and a few blips when a new line
  // arrives, when her bubble is opened, and on each tutorial line.
  const speak = () => {
    setTalking(true);
    playSound("talk");
  };
  useEffect(() => {
    if (!talking) return;
    const t = window.setTimeout(() => setTalking(false), 1500);
    return () => window.clearTimeout(t);
  }, [talking]);
  const spokenRef = useRef<string | null>(null);
  const tutStep = state.tutorial.active ? state.tutorial.step : -1;
  const speechKey = `${tutStep}|${laika.text}`;
  useEffect(() => {
    const first = spokenRef.current === null;
    if (spokenRef.current === speechKey) return;
    spokenRef.current = speechKey;
    if (first && tutStep < 0) return; // loading a mission is silent
    speak();
  }, [speechKey, tutStep]);
  const mission = state.dailyMission;

  // A finished daily mission gets a short celebration.
  const doneCount = state.missionsDone.length;
  const doneRef = useRef(doneCount);
  useEffect(() => {
    const before = doneRef.current;
    doneRef.current = doneCount;
    if (doneCount <= before) return;
    setToast(`★ Daily mission complete: ${missionText(state.dailyMission)}!`);
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [doneCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feedback after the engine has really applied an upgrade or repair.
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
    setSelected(action.moduleId);
    if (action.kind === "upgrade") {
      setReveal({ id: action.moduleId, level });
      return;
    }
    setVisit((v) => ({ id: action.moduleId as ModuleId, key: (v?.key ?? 0) + 1 }));
    setFlash({ id: action.moduleId, text: "REPAIRED!" });
    setToast(`✓ ${entry.title}. ${entry.detail}`);
    const t1 = window.setTimeout(() => setFlash(null), 1800);
    const t2 = window.setTimeout(() => setToast(null), 3600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // Only the confirmed build count should trigger this effect.
  }, [builtCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const splash = state.reportPending && state.status === "playing" && splashSeenSol !== state.sol;
  // Insights wait for a calm moment: never over an emergency, report, tutorial or dialog.
  const calm = playing && !state.reportPending && !state.pendingEvent && !state.eventOutcome && !state.tutorial.active;
  useEffect(() => {
    if (!splash) return;
    const sol = state.sol;
    const t = window.setTimeout(() => setSplashSeenSol(sol), newGear ? 2600 : 1700);
    return () => window.clearTimeout(t);
  }, [splash, state.sol, newGear]);
  useEffect(() => {
    if (!state.reportPending) setFullReport(false);
  }, [state.reportPending]);

  // The tutorial opens the tab that holds its current target.
  useEffect(() => {
    if (tut === 4) setTab("overview");
    if (tut === 3 && selected === "greenhouse") setTab("buildings");
  }, [tut, selected]);

  const select = (id: ModuleId) => {
    setSelected(id);
    setTab((t) => (t === "engineering" ? t : "buildings"));
    // Only the real Solar Array completes the "solar" stage.
    if (tut === 1 && id === "solar") dispatch({ type: "TUTORIAL_STEP", from: 1 });
  };

  const openPreview = () => {
    setOverlay("preview");
    if (tut === 4) dispatch({ type: "TUTORIAL_STEP", from: 4 });
  };

  const replayTraining = () => {
    setModeTouched(false);
    setTab("overview");
    dispatch({ type: "TUTORIAL_REPLAY" });
    setOverlay(null);
  };

  // ----- tutorial target, text and which region may be used -----
  const stage = tut >= 0 ? TUTORIAL_STAGES[tut] : null;
  let tutorialTask = stage?.task ?? "";
  let tutorialNext = stage?.next ?? null;
  let tutorialTarget: string | null = null;
  let liveRegion: Region = null;
  if (tut === 0) tutorialTarget = "#region-scene";
  if (tut === 1) {
    tutorialTarget = '[data-module="solar"]';
    liveRegion = "scene";
    if (selected && selected !== "solar") tutorialTask = `That is the ${MODULES[selected].name}. Click the blue SOLAR ARRAY.`;
  }
  if (tut === 2) {
    tutorialTarget = "#hud-meters";
    liveRegion = "status";
  }
  if (tut === 3) {
    if (selected !== "greenhouse") {
      tutorialTarget = '[data-module="greenhouse"]';
      liveRegion = "scene";
    } else {
      tutorialTarget = "#greenhouse-modes";
      liveRegion = "panel";
      if (!modeTouched) tutorialTask = "Pick OFF, LOW or HIGH.";
      else {
        const dPower = round1(sim.resources.power - state.resources.power);
        const dFood = round1(sim.resources.food - state.resources.food);
        tutorialTask = `${state.greenhouseMode}: next sol Power ${sign(dPower)}, Food ${sign(dFood)}. Crops need ${CONFIG.cropEstablishSols} sols before food grows. Press NEXT.`;
        tutorialNext = "Next";
      }
    }
  }
  if (tut === 4) {
    tutorialTarget = "#btn-preview";
    liveRegion = "panel";
  }
  if (tut === 5) {
    tutorialTarget = "#btn-advance";
    liveRegion = "bar";
    if (!gate.ok && gate.reason) tutorialTask = gate.reason;
  }

  const warnings: string[] = [];
  if (state.powerEmergencySols > 0) warnings.push("Power ran out last sol! One more time ends the mission.");
  if (state.foodEmergencySols > 0) warnings.push("Food ran out last sol! One more time ends the mission.");
  if (state.resources.lifeSupport < CONFIG.lifeSupportCritical) warnings.push("Life support is very low. At 0 the mission ends.");
  if (state.resources.radiation >= CONFIG.radiationWarning) warnings.push("Radiation hazard is high. At 100 the mission ends.");

  const closeReport = () => dispatch({ type: "DISMISS_REPORT" });
  const continueLabel = playing ? "Continue" : "See Mission Debrief";

  // Exactly one large dialog at a time, in a fixed priority order.
  const modal = (() => {
    if (state.reportPending && state.lastReport) {
      if (splash) return null; // the splash below covers this moment
      if (fullReport) {
        return <SolReportModal report={state.lastReport} onClose={closeReport} closeLabel={continueLabel} />;
      }
      return (
        <SolSummaryModal
          report={state.lastReport}
          deliveries={playing ? state.deliveries.filter((d) => d.sol === state.sol) : []}
          continueLabel={continueLabel}
          onContinue={closeReport}
          onFullReport={() => setFullReport(true)}
        />
      );
    }
    if (!playing) return null;
    if (reveal) {
      const m = state.modules[reveal.id];
      return (
        <UpgradeReveal
          moduleId={reveal.id}
          level={reveal.level}
          condition={m.condition}
          greenhouseMode={fx.nonessentialOff ? "OFF" : state.greenhouseMode}
          cropProgress={state.cropProgress}
          charge={state.resources.power / Math.max(1, batteryCapacity(state))}
          generation={solarGeneration(state)}
          materialsLeft={state.resources.materials}
          cost={state.lastAction?.cost ?? 0}
          gears={state.gears}
          onClose={() => {
            const id = reveal.id;
            setReveal(null);
            setVisit((v) => ({ id, key: (v?.key ?? 0) + 1 }));
          }}
        />
      );
    }
    if (build) {
      return (
        <Minigame
          moduleId={build.id}
          kind={build.kind}
          seed={state.seed + state.sol * 7}
          onCancel={() => setBuild(null)}
          onFinish={(bonus) => {
            const b = build;
            setBuild(null);
            dispatch({ type: b.kind === "upgrade" ? "UPGRADE" : "REPAIR", moduleId: b.id, bonus });
          }}
        />
      );
    }
    if (state.pendingEvent) return <MissionEventModal state={state} dispatch={dispatch} />;
    if (state.eventOutcome) return <EventOutcomeModal state={state} dispatch={dispatch} />;
    switch (overlay) {
      case "science":
        return (
          <ScienceLab
            focus={scienceFocus}
            onClose={() => {
              setOverlay(null);
              setScienceFocus(undefined);
            }}
          />
        );
      case "howto":
        return <HowToPlay onClose={() => setOverlay(null)} onReplay={state.tutorial.active ? undefined : replayTraining} />;
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
      case "settings":
        return (
          <SettingsModal
            state={state}
            saveOk={saveOk}
            onClose={() => setOverlay(null)}
            onHelp={() => setOverlay("howto")}
            onReplay={state.tutorial.active ? undefined : replayTraining}
            onRestart={() => setOverlay("restart")}
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
            <p>This erases the saved mission and goes back to the main menu.</p>
          </Modal>
        );
      default:
        return null;
    }
  })();

  const spotlightOn = stage !== null && modal === null && !splash;
  const insight = calm && modal === null && state.insightQueue.length > 0 ? INSIGHTS[state.insightQueue[0]] : null;
  // While the spotlight is up, only the region holding the target can be used.
  const locked = (region: Exclude<Region, null>) => (spotlightOn && liveRegion !== region ? true : undefined);
  const weather = WEATHER_TEXT[state.weather];

  const advanceButton = (id?: string) => (
    <button type="button" id={id} className="btn btn-go" onClick={() => dispatch({ type: "ADVANCE_SOL" })} disabled={!gate.ok}>
      Advance Sol ▶
    </button>
  );

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-2 p-2 sm:p-3 lg:h-[100dvh] lg:min-h-[600px]">
      {warnings.length > 0 && (
        <div className="panel px-2 py-1 text-[14px] font-extrabold" role="alert" style={{ background: "#ED695B", color: "#fff" }}>
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

      <div className="grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-2 lg:min-h-0">
          <div className="flex flex-col gap-2 sm:flex-row lg:min-h-0 lg:flex-1">
            {/* REGION A — status column beside the outpost (a row on phones) */}
            <aside
              id="region-status"
              className="panel flex shrink-0 gap-2 p-2 sm:w-[164px] sm:flex-col"
              aria-label="Mission status"
              inert={locked("status")}
            >
              <div className="flex gap-2">
                <div className="panel-dark flex flex-1 flex-col justify-center px-2 py-1 text-center leading-tight" aria-label={`Sol ${state.sol} of ${state.maxSols}`}>
                  <div className="text-[10px] font-extrabold uppercase tracking-wide">Sol</div>
                  <div className="text-[18px] font-extrabold tabular-nums">
                    {state.sol}
                    <span className="text-[11px]">/{state.maxSols}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center border-[3px] border-ink bg-cream px-1 text-center leading-tight" aria-label={`Weather today: ${weather.label}`}>
                  <PixelSprite grid={ICONS[weather.icon]} scale={2} />
                  <div className="text-[9px] font-extrabold uppercase">{weather.label}</div>
                </div>
              </div>
              <Reveal
                side="right"
                bubbleWidth={230}
                testId="gears-chip"
                label={`Gears: ${state.gears}. Earn one for every upgrade.`}
                trigger={
                  <span className="flex w-full items-center justify-center gap-2 border-[3px] border-ink bg-navy px-2 py-1 text-cream" data-gears={state.gears}>
                    <PixelSprite grid={ICONS.gear} scale={2} />
                    <span className="text-[15px] font-extrabold tabular-nums">× {state.gears}</span>
                  </span>
                }
              >
                <span className="block text-[12px] font-extrabold uppercase">Gears: {state.gears}</span>
                <span className="block text-[12px]">Every upgrade earns 1 Gear. Gears unlock small bonuses:</span>
                {GEAR_PERKS.map((p) => (
                  <span key={p.id} className="mt-1 block text-[12px] font-bold">
                    {state.gears >= p.at ? "✓" : "○"} {p.at} Gears: {p.name} ({p.text})
                  </span>
                ))}
              </Reveal>
              <div id="hud-meters" className="flex min-w-0 flex-1" aria-label="Resource meters">
                <ResourceHud state={state} />
              </div>
            </aside>
          {/* REGION B — the outpost */}
          <div id="region-scene" className="outpost-frame min-w-0 flex-1 self-stretch sm:self-start lg:self-stretch" inert={locked("scene")}>
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
              highlight={null}
              gear={gear}
              fill={wide}
              visit={visit}
              talking={talking}
            />
          </div>
          </div>

          {/* One guidance line + the way forward, always visible */}
          <section id="region-bar" className="panel flex flex-wrap items-center gap-x-3 gap-y-2 p-2" aria-label="Laika and next step" inert={locked("bar")}>
            {/* Laika's words stay hidden behind "!" until hovered, focused or tapped. */}
            <Reveal
              side="right"
              bubbleWidth={260}
              testId="laika-talk"
              label={`Laika says: ${laika.text}`}
              onReveal={() => {
                if (seenLine !== laika.text) speak();
                setSeenLine(laika.text);
              }}
              trigger={
                <span className="relative block border-[3px] border-ink bg-slate p-1">
                  <LaikaSprite mood={laika.mood} scale={2} motion={flash ? "laika-hop-brief" : undefined} gear={gear} talking={talking} />
                  <span className="bubble-badge" aria-hidden="true" style={lineUnread ? undefined : { background: "#b9c2d6" }}>
                    {lineUnread ? "!" : "…"}
                  </span>
                </span>
              }
            >
              <span className="block text-[11px] font-extrabold uppercase text-maroon">Laika says</span>
              <span className="block text-[14px] font-bold" data-testid="laika-text">
                “{laika.text}”
              </span>
            </Reveal>
            <div className="min-w-[180px] flex-1">
              <div className="mission-chip" data-testid="daily-mission" data-done={mission.done}>
                <span aria-hidden="true">{mission.done ? "★" : "☆"}</span>
                <span>
                  <span className="text-[10px] font-extrabold uppercase text-maroon">Today&apos;s mission</span>
                  <span className="block">
                    {missionText(mission)}
                    {mission.done ? " — done!" : ""}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-[12px]">{mission.done ? "Great job! Do anything else you like." : missionWhy(mission)}</p>
            </div>
            <span className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-[34px] w-[34px] items-center justify-center border-[3px] border-ink bg-[#66708c] text-[18px] text-cream"
                onClick={() => setOverlay("settings")}
                aria-label="Settings: sound, help and restart"
                title="Settings"
              >
                ⚙
              </button>
              <Reveal
                side="above"
                bubbleWidth={230}
                testId="advance-hint"
                label={`Tip before you advance: ${nextAction}`}
                trigger={
                  <span className="relative inline-flex h-[34px] w-[34px] items-center justify-center border-[3px] border-ink bg-gold text-[18px] font-extrabold">
                    ?
                  </span>
                }
              >
                <span className="block text-[11px] font-extrabold uppercase text-maroon">Before you advance</span>
                <span className="block text-[13px] font-bold" data-testid="next-action">
                  {nextAction}
                </span>
              </Reveal>
              {advanceButton("btn-advance")}
            </span>
          </section>
        </div>

        {/* REGION C — one tabbed panel */}
        <section id="region-panel" className="panel lg:relative lg:min-h-0" aria-label="Information" inert={locked("panel")}>
          <div className="flex flex-col lg:absolute lg:inset-0">
          <div className="tabs" role="tablist" aria-label="Information tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="tab-panel"
                className="tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="scroll-y min-h-0 flex-1 p-3" data-tab={tab}>
            {tab === "overview" && (
              <div className="space-y-2 text-[14px]">
                <p>
                  <strong className="uppercase">Mission: </strong>
                  Keep Laika safe for {state.maxSols} sols and get the base ready for the crew.
                </p>
                <div className="flex flex-wrap gap-2">
                  <WeatherBadge label="Today" weather={state.weather} />
                  <WeatherBadge label="Tomorrow" weather={state.forecast} />
                </div>
                {state.effects.length > 0 && (
                  <div className="flex flex-wrap gap-1" aria-label="Active effects">
                    {state.effects.map((e) => (
                      <span key={e.id} className="tag tag-warn">
                        {e.label} · {e.solsLeft} sol{e.solsLeft === 1 ? "" : "s"}
                      </span>
                    ))}
                  </div>
                )}
                <div className="border-[3px] border-ink bg-white p-2">
                  <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-maroon">If you advance now</div>
                  <div className="mb-2 flex flex-wrap gap-1" aria-live="polite">
                    {PREDICT.map(({ key, label }) => (
                      <span key={key} className="tag tabular-nums" data-predict={key}>
                        {label} {sign(round1(sim.resources[key] - state.resources[key]))}
                      </span>
                    ))}
                  </div>
                  <button type="button" id="btn-preview" className="btn btn-gray w-full" onClick={openPreview} disabled={!playing}>
                    Preview Next Sol
                  </button>
                  {!gate.ok && gate.reason && <div className="mt-1 text-[12px]">{gate.reason}</div>}
                </div>
                <div className="border-[3px] border-ink bg-white p-2" data-testid="outpost-glance">
                  <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-maroon">Outpost at a glance</div>
                  <ul className="grid gap-1">
                    {MODULE_IDS.map((id) => {
                      const m = state.modules[id];
                      const low = m.condition < 60;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-1 border-[2px] border-ink px-1 text-left text-[11px] font-bold"
                            style={{ background: low ? "#F2CA76" : "#FFF1D0" }}
                            onClick={() => select(id)}
                            aria-label={`${MODULES[id].name}: level ${m.level}, condition ${Math.round(m.condition)} percent`}
                          >
                            <span className="truncate">{MODULES[id].name}</span>
                            <span className="whitespace-nowrap tabular-nums">
                              L{m.level} · {Math.round(m.condition)}%{low ? " !" : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <p className="text-[12px]">
                  Difficulty: {difficultyOf(state).label}. {saveOk === false ? "✕ Not saved." : "✓ Saved."}
                </p>
              </div>
            )}
            {tab === "buildings" && (
              <BuildingPanel
                state={state}
                moduleId={selected}
                dispatch={dispatch}
                onSelect={select}
                onOpenEngineering={() => setTab("engineering")}
                onOpenScience={(card) => {
                  setScienceFocus(card);
                  setOverlay("science");
                }}
                onModeChosen={() => {
                  if (tut === 3) setModeTouched(true);
                }}
              />
            )}
            {tab === "engineering" && (
              <EngineeringPanel state={state} moduleId={selected} onStart={(kind, id) => setBuild({ kind, id })} onSelect={(id) => setSelected(id)} />
            )}
            {tab === "log" && <MissionLogList log={state.log} maxHeight={380} compact />}
            {tab === "science" && (
              <div className="space-y-2 text-[14px]">
                <p>Real space science behind each building. Tap a card to read it.</p>
                <div className="grid grid-cols-2 gap-1">
                  {SCIENCE_CARDS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="btn btn-gray btn-small"
                      onClick={() => {
                        setScienceFocus(c.id);
                        setOverlay("science");
                      }}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
                <div className="border-[3px] border-ink bg-white p-2" data-testid="insights-found">
                  <div className="text-[12px] font-extrabold uppercase">
                    Insights found: {state.insights.length}/{Object.keys(INSIGHTS).length}
                  </div>
                  {state.insights.length === 0 ? (
                    <p className="text-[12px]">Play to discover engineering ideas.</p>
                  ) : (
                    <ul className="list-disc pl-5 text-[12px]">
                      {state.insights.map((id) => (
                        <li key={id}>{INSIGHTS[id].text}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => {
                    setScienceFocus(undefined);
                    setOverlay("science");
                  }}
                >
                  Open Science Lab
                </button>
              </div>
            )}
          </div>
          </div>
        </section>
      </div>

      {modal}

      {spotlightOn && stage && (
        <TutorialSpotlight target={tutorialTarget} label={`Training ${tut + 1} of ${TUTORIAL_STAGES.length}: ${stage.title}`}>
          <div className="panel-title">
            <span data-testid="tutorial-title">
              Training {tut + 1}/{TUTORIAL_STAGES.length}: {stage.title}
            </span>
            <span className="flex gap-1" aria-hidden="true">
              {TUTORIAL_STAGES.map((_, i) => (
                <span key={i} style={{ width: 9, height: 9, border: "2px solid #2a1a22", background: i < tut ? "#81C995" : i === tut ? "#F2CA76" : "#542D30" }} />
              ))}
            </span>
          </div>
          <div className="flex items-start gap-3 p-2">
            <div className="border-[3px] border-ink bg-slate p-1">
              <LaikaSprite mood={tut === 5 ? "happy" : "idle"} scale={2} talking={talking} />
            </div>
            <div className="min-w-0 flex-1" aria-live="polite">
              {stage.lines.map((line) => (
                <p key={line} className="text-[14px] font-bold leading-snug">
                  “{line}”
                </p>
              ))}
              <p className="mt-1 text-[13px] leading-snug" data-testid="tutorial-task">
                <span className="tag tag-warn">Do this</span> {tutorialTask}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t-[3px] border-ink p-2">
            {tut > 0 && (
              <button type="button" className="btn btn-gray btn-small" onClick={() => dispatch({ type: "TUTORIAL_BACK" })}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-gray btn-small" onClick={() => dispatch({ type: "TUTORIAL_SKIP" })}>
              Skip Tutorial
            </button>
            {tutorialNext && (
              <button type="button" className="btn btn-go btn-small" onClick={() => dispatch({ type: "TUTORIAL_STEP", from: tut })}>
                {tutorialNext}
              </button>
            )}
          </div>
        </TutorialSpotlight>
      )}

      {insight && (
        <aside className="insight-card panel" aria-label="Engineering insight" data-testid="insight-card">
          <div className="panel-title">
            <span>💡 Engineering insight</span>
          </div>
          <div className="space-y-2 p-2 text-[14px]">
            <p className="font-bold">{insight.text}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-gray btn-small"
                onClick={() => {
                  setScienceFocus(insight.card);
                  setOverlay("science");
                  dispatch({ type: "DISMISS_INSIGHT" });
                }}
              >
                Learn more
              </button>
              <button type="button" className="btn btn-go btn-small" onClick={() => dispatch({ type: "DISMISS_INSIGHT" })}>
                Got it
              </button>
            </div>
          </div>
        </aside>
      )}
      {toast && (
        <div className="toast" role="status">
          <div className="panel px-3 py-2 text-[14px] font-bold" style={{ background: "#81C995" }}>
            {toast}
          </div>
        </div>
      )}
      {splash && (
        <button type="button" className="sol-splash" onClick={() => setSplashSeenSol(state.sol)} aria-label={`Sol ${state.sol}. A new day on Mars. Press to continue.`} autoFocus>
          <span className="sol-splash-card panel-dark">
            <span className="block text-[56px] font-extrabold leading-none">SOL {state.sol}</span>
            <span className="mt-2 block text-[16px] font-bold">A new day on Mars.</span>
            <span className="mt-2 block text-[14px] font-extrabold text-gold" data-testid="sol-survived">
              ★ Sol {state.sol - 1} survived!
            </span>
            {newGear && (
              <span className="mt-3 flex items-center justify-center gap-3 border-[3px] border-gold p-2" data-testid="gear-unlock">
                <LaikaSprite mood="celebrate" scale={3} gear={gear} />
                <span className="text-left">
                  <span className="block text-[11px] font-extrabold uppercase tracking-widest">New outfit piece for Laika!</span>
                  <span className="block text-[18px] font-extrabold text-gold">{newGear.name}</span>
                </span>
              </span>
            )}
            <span className="mt-3 block text-[11px] uppercase tracking-widest opacity-80">Click to skip</span>
          </span>
        </button>
      )}
    </main>
  );
}
