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

/**
 * Four independent switches. "master" is the original Sound On/Off button and
 * silences everything. Music OFF never touches ambience.
 */
export interface AudioPrefs {
  master: boolean;
  music: boolean;
  ambience: boolean;
  sfx: boolean;
}
export type AudioPrefKey = keyof AudioPrefs;

const DEFAULT_PREFS: AudioPrefs = { master: true, music: false, ambience: true, sfx: true };
const PREF_KEYS: Record<AudioPrefKey, string> = {
  master: PREF_KEY, // same key as before, so an earlier mute is respected
  music: `${PREF_KEY}/music`,
  ambience: `${PREF_KEY}/ambience`,
  sfx: `${PREF_KEY}/sfx`,
};

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let unlocked = false;
let prefs: AudioPrefs = DEFAULT_PREFS;
let prefLoaded = false;
let visibilityHooked = false;
const lastPlayed: Partial<Record<SoundName, number>> = {};
const listeners = new Set<() => void>();

function loadPref(): void {
  if (prefLoaded || typeof window === "undefined") return;
  prefLoaded = true;
  const next = { ...DEFAULT_PREFS };
  try {
    for (const key of Object.keys(PREF_KEYS) as AudioPrefKey[]) {
      const raw = window.localStorage.getItem(PREF_KEYS[key]);
      if (raw === "on") next[key] = true;
      else if (raw === "off") next[key] = false;
    }
  } catch {
    // Storage blocked: defaults apply for this session.
  }
  prefs = next;
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

// ---------------------------------------------------------------------------
// Background layers. One controlled manager: each layer exists at most once,
// however often React components mount, unmount or re-render.
// ---------------------------------------------------------------------------

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

/** Original 8-bar loop in A minor (Am – F – C – G, twice). 0 = rest. */
const MUSIC_LEAD: number[] = [
  69, 0, 72, 0, 76, 0, 72, 0,
  69, 0, 72, 0, 77, 0, 72, 0,
  67, 0, 72, 0, 76, 0, 79, 0,
  67, 0, 71, 0, 74, 0, 71, 0,
  76, 0, 72, 0, 69, 0, 72, 0,
  77, 0, 72, 0, 69, 0, 0, 0,
  76, 0, 79, 0, 76, 0, 72, 0,
  74, 0, 71, 0, 67, 0, 0, 0,
];
const MUSIC_BASS: number[] = [45, 41, 48, 43, 45, 41, 48, 43];
const STEP_SECONDS = 60 / 84 / 2; // eighth notes at a slow 84 BPM
const MUSIC_LEAD_GAIN = 0.018;
const MUSIC_BASS_GAIN = 0.045;
const AMBIENCE_GAIN = 0.03;

interface MusicLayer {
  out: GainNode;
  timer: number;
  step: number;
  nextTime: number;
}
interface AmbienceLayer {
  out: GainNode;
  nodes: AudioScheduledSourceNode[];
}
let musicLayer: MusicLayer | null = null;
let ambienceLayer: AmbienceLayer | null = null;

function tone(audio: AudioContext, out: AudioNode, wave: OscillatorType, freq: number, at: number, dur: number, gain: number): void {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.02);
  amp.gain.setValueAtTime(gain, at + dur * 0.6);
  amp.gain.linearRampToValueAtTime(0, at + dur);
  osc.connect(amp);
  amp.connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function scheduleMusic(audio: AudioContext): void {
  const layer = musicLayer;
  if (!layer) return;
  // Look a little ahead so timing stays steady even if the tab is busy.
  if (layer.nextTime < audio.currentTime) layer.nextTime = audio.currentTime + 0.05;
  while (layer.nextTime < audio.currentTime + 0.6) {
    const lead = MUSIC_LEAD[layer.step];
    if (lead) tone(audio, layer.out, "square", midi(lead), layer.nextTime, STEP_SECONDS * 1.7, MUSIC_LEAD_GAIN);
    if (layer.step % 8 === 0) {
      tone(audio, layer.out, "triangle", midi(MUSIC_BASS[layer.step / 8]), layer.nextTime, STEP_SECONDS * 7.5, MUSIC_BASS_GAIN);
    }
    layer.step = (layer.step + 1) % MUSIC_LEAD.length;
    layer.nextTime += STEP_SECONDS;
  }
}

function startMusic(audio: AudioContext): void {
  if (musicLayer) return;
  const out = audio.createGain();
  out.gain.setValueAtTime(0, audio.currentTime);
  out.gain.linearRampToValueAtTime(1, audio.currentTime + 0.8);
  out.connect(audio.destination);
  const timer = window.setInterval(() => {
    try {
      scheduleMusic(audio);
    } catch {
      // Ignore: music is decoration only.
    }
  }, 150);
  musicLayer = { out, timer, step: 0, nextTime: audio.currentTime + 0.1 };
  scheduleMusic(audio);
}

function stopMusic(audio: AudioContext | null): void {
  const layer = musicLayer;
  if (!layer) return;
  musicLayer = null;
  window.clearInterval(layer.timer);
  try {
    if (audio) {
      layer.out.gain.cancelScheduledValues(audio.currentTime);
      layer.out.gain.setValueAtTime(layer.out.gain.value, audio.currentTime);
      layer.out.gain.linearRampToValueAtTime(0, audio.currentTime + 0.25);
    }
    window.setTimeout(() => layer.out.disconnect(), 400);
  } catch {
    // Already gone.
  }
}

/** Soft synthesized "wind" (filtered noise) plus a faint equipment hum. Artistic, not a Mars recording. */
function startAmbience(audio: AudioContext): void {
  if (ambienceLayer) return;
  const out = audio.createGain();
  out.gain.setValueAtTime(0, audio.currentTime);
  out.gain.linearRampToValueAtTime(1, audio.currentTime + 1.5);
  out.connect(audio.destination);

  const seconds = 4;
  const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 1957;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff; // deterministic noise, no Math.random
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  filter.Q.value = 0.6;
  const wind = audio.createGain();
  wind.gain.value = AMBIENCE_GAIN;
  // Slow swells so the wind breathes instead of hissing constantly.
  const swell = audio.createOscillator();
  swell.frequency.value = 0.07;
  const swellDepth = audio.createGain();
  swellDepth.gain.value = AMBIENCE_GAIN * 0.6;
  swell.connect(swellDepth);
  swellDepth.connect(wind.gain);
  const sweep = audio.createOscillator();
  sweep.frequency.value = 0.045;
  const sweepDepth = audio.createGain();
  sweepDepth.gain.value = 140;
  sweep.connect(sweepDepth);
  sweepDepth.connect(filter.frequency);
  noise.connect(filter);
  filter.connect(wind);
  wind.connect(out);

  const hum = audio.createOscillator();
  hum.type = "sine";
  hum.frequency.value = 55;
  const humGain = audio.createGain();
  humGain.gain.value = 0.012;
  hum.connect(humGain);
  humGain.connect(out);

  const nodes: AudioScheduledSourceNode[] = [noise, swell, sweep, hum];
  for (const n of nodes) n.start();
  ambienceLayer = { out, nodes };
}

function stopAmbience(audio: AudioContext | null): void {
  const layer = ambienceLayer;
  if (!layer) return;
  ambienceLayer = null;
  try {
    if (audio) {
      layer.out.gain.cancelScheduledValues(audio.currentTime);
      layer.out.gain.setValueAtTime(layer.out.gain.value, audio.currentTime);
      layer.out.gain.linearRampToValueAtTime(0, audio.currentTime + 0.3);
    }
    window.setTimeout(() => {
      for (const n of layer.nodes) {
        try {
          n.stop();
        } catch {
          // Already stopped.
        }
      }
      layer.out.disconnect();
    }, 450);
  } catch {
    // Already gone.
  }
}

/** Starts or stops the loops so they match the preferences. Safe to call any time. */
function syncLayers(): void {
  try {
    if (typeof document === "undefined") return;
    const visible = document.visibilityState !== "hidden";
    const wantMusic = unlocked && visible && prefs.master && prefs.music;
    const wantAmbience = unlocked && visible && prefs.master && prefs.ambience;
    const audio = wantMusic || wantAmbience ? getContext() : ctx;
    if (wantMusic && audio) startMusic(audio);
    else stopMusic(audio);
    if (wantAmbience && audio) startAmbience(audio);
    else stopAmbience(audio);
  } catch {
    // Audio must never break the game.
  }
}

/** Which loops are running right now (used by tests and the settings panel). */
export function activeLayers(): { music: boolean; ambience: boolean } {
  return { music: musicLayer !== null, ambience: ambienceLayer !== null };
}

/** Call from a real pointer/keyboard event. Until then nothing can play. */
export function unlockAudio(): void {
  loadPref();
  if (typeof document !== "undefined" && !visibilityHooked) {
    visibilityHooked = true;
    document.addEventListener("visibilitychange", syncLayers); // pause loops in a hidden tab
  }
  if (unlocked) return;
  unlocked = true;
  syncLayers();
}

export function getAudioPrefs(): AudioPrefs {
  loadPref();
  return prefs;
}

export function setAudioPref(key: AudioPrefKey, on: boolean): void {
  loadPref();
  if (prefs[key] === on) return;
  prefs = { ...prefs, [key]: on };
  try {
    window.localStorage.setItem(PREF_KEYS[key], on ? "on" : "off");
  } catch {
    // Preference simply will not persist; it still applies this session.
  }
  syncLayers();
  listeners.forEach((l) => l());
}

export function isSoundEnabled(): boolean {
  return getAudioPrefs().master;
}

export function setSoundEnabled(on: boolean): void {
  setAudioPref("master", on);
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Plays a sound-effect cue. Returns true only if notes were actually scheduled. */
export function playSound(name: SoundName, delayMs = 0): boolean {
  try {
    loadPref();
    if (!prefs.master || !prefs.sfx) return false;
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

/** Test helper: forget throttling, layers and context. */
export function resetSoundForTests(): void {
  stopMusic(null);
  stopAmbience(null);
  ctx = null;
  unlocked = false;
  prefs = DEFAULT_PREFS;
  prefLoaded = false;
  for (const k of Object.keys(lastPlayed) as SoundName[]) delete lastPlayed[k];
}

export const SERVER_PREFS: AudioPrefs = DEFAULT_PREFS;
