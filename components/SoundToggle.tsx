"use client";

import { playSound, unlockAudio } from "@/lib/sound";
import { useSoundEnabled } from "./useGameSounds";

/** Real mute switch. The preference is saved in the browser. */
export function SoundToggle({ small = true }: { small?: boolean }) {
  const [on, setOn] = useSoundEnabled();
  return (
    <button
      type="button"
      className={`btn btn-gray btn-toggle ${small ? "btn-small" : ""}`}
      aria-pressed={on}
      aria-label={on ? "Sound is on. Turn sound off" : "Sound is off. Turn sound on"}
      onClick={() => {
        unlockAudio();
        setOn(!on);
        if (!on) playSound("tutorial", 30);
      }}
    >
      <span aria-hidden="true">{on ? "♪ Sound: On" : "♪ Sound: Off"}</span>
    </button>
  );
}
