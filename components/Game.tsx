"use client";

// Root client component: owns the single MissionState reducer, autosave, and
// which screen is visible. All gameplay data lives in MissionState.
import { useCallback, useEffect, useReducer, useState } from "react";
import { TUTORIAL_SEED } from "@/game/config";
import { createInitialState } from "@/game/initialState";
import { clearMission, loadMission, saveMission } from "@/game/persistence";
import { rootReducer } from "@/game/reducer";
import { randomSeed } from "@/game/rng";
import { Credits, HowToPlay } from "./HowToPlay";
import { MainMenu } from "./MainMenu";
import { MissionDashboard } from "./MissionDashboard";
import { MissionDebrief } from "./MissionDebrief";
import { Modal } from "./Modal";
import { ScienceLab } from "./ScienceLab";
import { StoryIntro } from "./StoryIntro";
import { useGameSounds, useUiSounds } from "./useGameSounds";

type MenuOverlay = null | "howto" | "science" | "credits" | "overwrite-guided" | "overwrite-random";

export function Game() {
  const [mission, dispatch] = useReducer(rootReducer, null);
  const [overlay, setOverlay] = useState<MenuOverlay>(null);
  const [savedSol, setSavedSol] = useState<number | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [saveOk, setSaveOk] = useState<boolean | null>(null);

  useUiSounds();
  useGameSounds(mission);

  // Detect an existing save after mount (never during server render).
  useEffect(() => {
    const saved = loadMission();
    setHasSave(saved !== null);
    setSavedSol(saved ? saved.sol : null);
  }, []);

  // Autosave after every meaningful state change. The indicator only shows
  // success when the write really succeeded.
  useEffect(() => {
    if (!mission) return;
    const ok = saveMission(mission);
    setSaveOk(ok);
    if (ok) {
      setHasSave(true);
      setSavedSol(mission.sol);
    }
  }, [mission]);

  const startNew = useCallback((guided: boolean) => {
    setOverlay(null);
    const seed = guided ? TUTORIAL_SEED : randomSeed();
    dispatch({ type: "NEW_MISSION", state: createInitialState(seed, guided) });
  }, []);

  const requestStart = (guided: boolean) => {
    if (hasSave) setOverlay(guided ? "overwrite-guided" : "overwrite-random");
    else startNew(guided);
  };

  const continueMission = () => {
    const saved = loadMission();
    if (saved) dispatch({ type: "LOAD", state: saved });
    else {
      setHasSave(false);
      setSavedSol(null);
    }
  };

  const restart = () => {
    clearMission();
    setHasSave(false);
    setSavedSol(null);
    setSaveOk(null);
    dispatch({ type: "RESET" });
  };

  const playAgain = () => {
    clearMission();
    const state = createInitialState(randomSeed(), false);
    dispatch({ type: "NEW_MISSION", state: { ...state, status: "playing" } });
  };

  if (mission) {
    if (mission.status === "intro") return <StoryIntro onDone={() => dispatch({ type: "BEGIN_MISSION" })} />;
    const finished = mission.status !== "playing";
    if (finished && !mission.reportPending) {
      return <MissionDebrief state={mission} onPlayAgain={playAgain} onMenu={restart} />;
    }
    return <MissionDashboard key={mission.seed} state={mission} dispatch={dispatch} saveOk={saveOk} onRestart={restart} />;
  }

  const overwrite = overlay === "overwrite-guided" || overlay === "overwrite-random";
  return (
    <>
      <MainMenu
        hasSave={hasSave}
        savedSol={savedSol}
        onStart={() => requestStart(true)}
        onRandom={() => requestStart(false)}
        onContinue={continueMission}
        onHowTo={() => setOverlay("howto")}
        onScience={() => setOverlay("science")}
        onCredits={() => setOverlay("credits")}
      />
      {overlay === "howto" && <HowToPlay onClose={() => setOverlay(null)} />}
      {overlay === "science" && <ScienceLab onClose={() => setOverlay(null)} />}
      {overlay === "credits" && <Credits onClose={() => setOverlay(null)} />}
      {overwrite && (
        <Modal
          title="Replace saved mission?"
          maxWidth={480}
          onClose={() => setOverlay(null)}
          footer={
            <>
              <button type="button" className="btn btn-gray" onClick={() => setOverlay(null)} data-autofocus>
                Cancel
              </button>
              <button type="button" className="btn btn-warn" onClick={() => startNew(overlay === "overwrite-guided")}>
                Start new mission
              </button>
            </>
          }
        >
          <p>You have a saved mission{savedSol ? ` on Sol ${savedSol}` : ""}. Starting a new one will replace it.</p>
        </Modal>
      )}
    </>
  );
}
