// Tiny original 8-bit sound engine built on the Web Audio API.
// - No audio files, no dependencies. Every cue is a few square/triangle notes.
// - The AudioContext is created only after a real user gesture.
// - Every call is wrapped so an audio failure can never break gameplay.

export type SoundName =
  | "hover"
  | "click"
  | "select"
  | "tutorial"
  | "warning"
  | "upgrade"
  | "error"
  | "sol"
  | "event"
  | "success"
  | "failure";

interface Note {
  /** Frequency in Hz. */
  f: number;
  /** Start time in seconds from the cue start. */
  t: number;
  /** Duration in seconds. */
  d: number;
}

interface Cue {
  wave: OscillatorType;
  gain: number;
  notes: Note[];
  /** Minimum milliseconds between two plays of this cue (anti-spam). */
  gap: number;
}

const seq = (freqs: number[], step: number, dur = step): Note[] => freqs.map((f, i) => ({ f, t: i * step, d: dur }));

export const CUES: Record<SoundName, Cue> = {
  hover: { wave: "square", gain: 0.018, gap: 70, notes: [{ f: 880, t: 0, d: 0.025 }] },
  click: { wave: "square", gain: 0.05, gap: 60, notes: seq([660, 990], 0.04) },
  select: { wave: "triangle", gain: 0.09, gap: 80, notes: seq([523, 784], 0.05) },
  tutorial: { wave: "triangle", gain: 0.09, gap: 200, notes: seq([659, 880], 0.08, 0.1) },
  warning: { wave: "square", gain: 0.05, gap: 1500, notes: seq([440, 330, 440, 330], 0.13, 0.11) },
  upgrade: { wave: "square", gain: 0.05, gap: 300, notes: seq([523, 659, 784, 1047], 0.08, 0.09) },
  error: { wave: "square", gain: 0.04, gap: 300, notes: seq([165, 123], 0.11, 0.12) },
  sol: { wave: "triangle", gain: 0.1, gap: 500, notes: seq([392, 523, 659], 0.09, 0.12) },
  event: { wave: "square", gain: 0.05, gap: 800, notes: [{ f: 740, t: 0, d: 0.09 }, { f: 740, t: 0.14, d: 0.09 }, { f: 587, t: 0.28, d: 0.16 }] },
  success: { wave: "square", gain: 0.05, gap: 2000, notes: [...seq([523, 659, 784, 1047], 0.11, 0.1), { f: 784, t: 0.5, d: 0.1 }, { f: 1047, t: 0.62, d: 0.3 }] },
  failure: { wave: "triangle", gain: 0.1, gap: 2000, notes: [...seq([392, 330, 262], 0.16, 0.15), { f: 196, t: 0.48, d: 0.35 }] },
};

const PREF_KEY = "laika-mission-red-planet/sound";

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let unlocked = false;
let enabled = true;
let prefLoaded = false;
const lastPlayed: Partial<Record<SoundName, number>> = {};
const listeners = new Set<() => void>();

function loadPref(): void {
  if (prefLoaded || typeof window === "undefined") return;
  prefLoaded = true;
  try {
    enabled = window.localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    enabled = true;
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || !unlocked) return null;
  try {
    if (!ctx) {
      const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a real pointer/keyboard event. Until then nothing can play. */
export function unlockAudio(): void {
  unlocked = true;
  loadPref();
}

export function isSoundEnabled(): boolean {
  loadPref();
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  loadPref();
  enabled = on;
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Preference simply will not persist; sound still works this session.
  }
  listeners.forEach((l) => l());
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Plays a cue. Returns true only if notes were actually scheduled. */
export function playSound(name: SoundName, delayMs = 0): boolean {
  try {
    loadPref();
    if (!enabled) return false;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const cue = CUES[name];
    const last = lastPlayed[name];
    if (last !== undefined && now + delayMs - last < cue.gap) return false;
    const audio = getContext();
    if (!audio) return false;
    lastPlayed[name] = now + delayMs;
    const start = audio.currentTime + 0.01 + delayMs / 1000;
    for (const n of cue.notes) {
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      osc.type = cue.wave;
      osc.frequency.setValueAtTime(n.f, start + n.t);
      // Short stepped envelope: instant attack, quick release (no clicks).
      amp.gain.setValueAtTime(0, start + n.t);
      amp.gain.linearRampToValueAtTime(cue.gain, start + n.t + 0.005);
      amp.gain.setValueAtTime(cue.gain, start + n.t + Math.max(0.006, n.d - 0.02));
      amp.gain.linearRampToValueAtTime(0, start + n.t + n.d);
      osc.connect(amp);
      amp.connect(audio.destination);
      osc.start(start + n.t);
      osc.stop(start + n.t + n.d + 0.02);
    }
    return true;
  } catch {
    return false;
  }
}

/** Test helper: forget throttling and context. */
export function resetSoundForTests(): void {
  ctx = null;
  unlocked = false;
  enabled = true;
  prefLoaded = false;
  for (const k of Object.keys(lastPlayed) as SoundName[]) delete lastPlayed[k];
}
