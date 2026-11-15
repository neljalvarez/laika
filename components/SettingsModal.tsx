"use client";

import { DIFFICULTIES, normalizeDifficulty } from "@/game/difficulty";
import type { MissionState } from "@/game/types";
import { useEffect, useState } from "react";
import { musicStatus, playSound, unlockAudio, type AudioPrefKey } from "@/lib/sound";
import { Modal } from "./Modal";
import { useAudioPrefs, useAudioVolumes } from "./useGameSounds";

const AUDIO_ROWS: { key: AudioPrefKey; label: string; help: string }[] = [
  { key: "master", label: "Master volume", help: "Turns everything up or down." },
  { key: "music", label: "Music", help: "The mission soundtrack." },
  { key: "ambience", label: "Ambience", help: "Soft Mars wind and station hum." },
  { key: "sfx", label: "Sound effects", help: "Clicks, alerts, Laika's voice." },
];

/** Four channels, each with an on/off switch and a real volume slider. */
export function AudioSettings() {
  const [prefs, setPref] = useAudioPrefs();
  const [volumes, setVolume] = useAudioVolumes();
  const [now, setNow] = useState<ReturnType<typeof musicStatus>>(null);
  useEffect(() => {
    const tick = () => setNow(musicStatus());
    tick();
    const t = window.setInterval(tick, 500);
    return () => window.clearInterval(t);
  }, []);
  const toggle = (key: AudioPrefKey) => {
    unlockAudio();
    setPref(key, !prefs[key]);
    if (!prefs[key]) playSound("tutorial", 40);
  };
  return (
    <div className="space-y-2" role="group" aria-label="Audio settings">
      {AUDIO_ROWS.map((row) => {
        const on = prefs[row.key] && (row.key === "master" || prefs.master);
        const id = `vol-${row.key}`;
        return (
          <div key={row.key} className="border-[2px] border-ink bg-white p-2" data-audio-row={row.key}>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={id} className="min-w-0">
                <span className="block font-extrabold uppercase">{row.label}</span>
                <span className="block text-[12px]">{row.help}</span>
              </label>
              <button
                type="button"
                className="btn btn-gray btn-toggle btn-small"
                style={{ minWidth: 64 }}
                aria-pressed={prefs[row.key]}
                aria-label={`${row.label}: ${prefs[row.key] ? "on" : "off"}`}
                disabled={row.key !== "master" && !prefs.master}
                onClick={() => toggle(row.key)}
              >
                {prefs[row.key] ? "On" : "Off"}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                id={id}
                type="range"
                className="pixel-range"
                min={0}
                max={100}
                step={5}
                value={volumes[row.key]}
                disabled={!on}
                aria-valuetext={`${volumes[row.key]} percent`}
                style={{ ["--fill" as string]: `${volumes[row.key]}%` }}
                onPointerDown={() => unlockAudio()}
                onKeyDown={() => unlockAudio()}
                onChange={(e) => setVolume(row.key, Number(e.target.value))}
                onPointerUp={() => {
                  if (row.key === "sfx" || row.key === "master") playSound("tutorial");
                }}
              />
              <output htmlFor={id} className="w-[44px] text-right text-[13px] font-extrabold tabular-nums" data-testid={`vol-${row.key}-value`}>
                {volumes[row.key]}%
              </output>
            </div>
          </div>
        );
      })}
      <p className="text-[12px]" data-testid="now-playing" data-playing={now?.playing ? "yes" : "no"} data-time={now ? now.time.toFixed(1) : "0"} data-volume={now ? now.volume.toFixed(3) : "0"} data-track={now?.track ?? ""}>
        {now?.playing ? `♪ Now playing: ${now.track}` : "♪ Music is paused."}
      </p>
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
