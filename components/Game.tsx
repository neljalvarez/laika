"use client";

// Root client component: owns the single MissionState reducer, autosave, and
// which screen is visible. All gameplay data lives in MissionState.
import { useCallback, useEffect, useReducer, useState } from "react";
import { TUTORIAL_SEED } from "@/game/config";
import { normalizeDifficulty, type Difficulty } from "@/game/difficulty";
import { createInitialState } from "@/game/initialState";
import { clearMission, loadMission, saveMission } from "@/game/persistence";
import { rootReducer } from "@/game/reducer";
import { randomSeed } from "@/game/rng";
import { Credits, HowToPlay } from "./HowToPlay";
import { DifficultySelect } from "./DifficultySelect";
import { MainMenu } from "./MainMenu";
import { MissionDashboard } from "./MissionDashboard";
import { MissionDebrief } from "./MissionDebrief";
import { ScienceLab } from "./ScienceLab";
import { SettingsModal } from "./SettingsModal";
import { StoryIntro } from "./StoryIntro";
import { useGameSounds, useUiSounds } from "./useGameSounds";

type MenuOverlay = null | "howto" | "science" | "credits" | "settings" | "start-guided" | "start-random";

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

  const startNew = useCallback((difficulty: Difficulty, training: boolean, fixedSeed: boolean) => {
    setOverlay(null);
    // The guided mission uses a fixed seed so every new player sees the same first sols.
    const seed = fixedSeed ? TUTORIAL_SEED : randomSeed();
    dispatch({ type: "NEW_MISSION", state: createInitialState(seed, training, difficulty) });
  }, []);

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
    // Same difficulty as the mission just finished, new random seed.
    const state = createInitialState(randomSeed(), false, normalizeDifficulty(mission?.difficulty));
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

  const starting = overlay === "start-guided" || overlay === "start-random";
  return (
    <>
      <MainMenu
        hasSave={hasSave}
        savedSol={savedSol}
        onStart={() => setOverlay("start-guided")}
        onRandom={() => setOverlay("start-random")}
        onContinue={continueMission}
        onHowTo={() => setOverlay("howto")}
        onScience={() => setOverlay("science")}
        onCredits={() => setOverlay("credits")}
        onSettings={() => setOverlay("settings")}
      />
      {overlay === "howto" && <HowToPlay onClose={() => setOverlay(null)} />}
      {overlay === "science" && <ScienceLab onClose={() => setOverlay(null)} />}
      {overlay === "credits" && <Credits onClose={() => setOverlay(null)} />}
      {overlay === "settings" && (
        <SettingsModal state={null} saveOk={null} onClose={() => setOverlay(null)} onHelp={() => setOverlay("howto")} />
      )}
      {starting && (
        <DifficultySelect
          defaultTraining={overlay === "start-guided"}
          hasSave={hasSave}
          savedSol={savedSol}
          onClose={() => setOverlay(null)}
          onStart={(difficulty, training) => startNew(difficulty, training, overlay === "start-guided")}
        />
      )}
    </>
  );
}
