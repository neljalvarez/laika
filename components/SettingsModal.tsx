"use client";

import { DIFFICULTIES, normalizeDifficulty } from "@/game/difficulty";
import type { MissionState } from "@/game/types";
import { playSound, unlockAudio, type AudioPrefKey } from "@/lib/sound";
import { Modal } from "./Modal";
import { useAudioPrefs } from "./useGameSounds";

const AUDIO_ROWS: { key: AudioPrefKey; label: string; help: string }[] = [
  { key: "music", label: "Music", help: "Calm 8-bit background tune." },
  { key: "ambience", label: "Ambience", help: "Soft Mars wind and station hum." },
  { key: "sfx", label: "Sound effects", help: "Clicks, alerts and jingles." },
];

/** Music, ambience and sound effects are independent; "All sound" mutes everything. */
export function AudioSettings() {
  const [prefs, setPref] = useAudioPrefs();
  const toggle = (key: AudioPrefKey) => {
    unlockAudio();
    setPref(key, !prefs[key]);
    if (!prefs[key]) playSound("tutorial", 40);
  };
  return (
    <div className="space-y-2" role="group" aria-label="Audio settings">
      {AUDIO_ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-3 border-[2px] border-ink bg-white p-2">
          <div>
            <div className="font-extrabold uppercase">{row.label}</div>
            <div className="text-[12px]">{row.help}</div>
          </div>
          <button
            type="button"
            className="btn btn-gray btn-toggle btn-small"
            style={{ minWidth: 72 }}
            aria-pressed={prefs[row.key]}
            aria-label={`${row.label}: ${prefs[row.key] ? "on" : "off"}`}
            disabled={!prefs.master}
            onClick={() => toggle(row.key)}
          >
            {prefs[row.key] ? "On" : "Off"}
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 border-[2px] border-ink bg-white p-2">
        <div>
          <div className="font-extrabold uppercase">All sound</div>
          <div className="text-[12px]">Off mutes music, ambience and effects.</div>
        </div>
        <button
          type="button"
          className="btn btn-gray btn-toggle btn-small"
          style={{ minWidth: 72 }}
          aria-pressed={prefs.master}
          aria-label={`All sound: ${prefs.master ? "on" : "off"}`}
          onClick={() => toggle("master")}
        >
          {prefs.master ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}

interface Props {
  state: MissionState | null;
  saveOk: boolean | null;
  onClose: () => void;
  onHelp: () => void;
  onReplay?: () => void;
  onRestart?: () => void;
}

export function SettingsModal({ state, saveOk, onClose, onHelp, onReplay, onRestart }: Props) {
  const diff = state ? DIFFICULTIES[normalizeDifficulty(state.difficulty)] : null;
  return (
    <Modal title="Settings" onClose={onClose} maxWidth={480}>
      <div className="space-y-3 text-[14px]">
        <AudioSettings />
        {diff && (
          <p>
            <strong className="uppercase">Difficulty:</strong> {diff.label} ({diff.title}). It is set when a mission starts.
          </p>
        )}
        {state && (
          <p role="status">{saveOk === false ? "✕ Not saved (storage unavailable)" : "✓ Progress is saved automatically."}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-gray btn-small" onClick={onHelp}>
            How to Play
          </button>
          {onReplay && (
            <button type="button" className="btn btn-gray btn-small" onClick={onReplay}>
              Replay training
            </button>
          )}
          {onRestart && (
            <button type="button" className="btn btn-warn btn-small" onClick={onRestart}>
              Restart mission
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
