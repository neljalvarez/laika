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
  | "failure"
  | "talk"
  | "woof"
  | "gear"
  | "boom"
  | "whoosh"
  | "poosh"
  | "whine"
  | "type"
  | "rise"
  | "pop"
  | "cheer"
  | "sparkle"
  | "voice";

interface Note {
  /** Frequency in Hz. */
  f: number;
  /** Start time in seconds from the cue start. */
  t: number;
  /** Duration in seconds. */
  d: number;
  /** Optional pitch glide: frequency reached at the end of the note. */
  to?: number;
  /** Filtered noise instead of a tone (f = filter centre). */
  noise?: boolean;
  /** Per-note loudness multiplier. */
  g?: number;
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
  // Laika "speaking": a few quick, cute blips (not a voice).
  talk: { wave: "square", gain: 0.03, gap: 500, notes: [{ f: 620, t: 0, d: 0.045 }, { f: 740, t: 0.07, d: 0.045 }, { f: 560, t: 0.14, d: 0.045 }, { f: 700, t: 0.21, d: 0.06 }] },
  woof: { wave: "triangle", gain: 0.1, gap: 500, notes: [{ f: 392, t: 0, d: 0.07 }, { f: 262, t: 0.06, d: 0.1 }] },
  gear: { wave: "square", gain: 0.04, gap: 500, notes: seq([784, 988, 1175, 1568], 0.07, 0.08) },
  boom: { wave: "triangle", gain: 0.1, gap: 500, notes: [{ f: 110, t: 0, d: 0.18 }, { f: 73, t: 0.12, d: 0.3 }] },
  whoosh: { wave: "triangle", gain: 0.06, gap: 400, notes: seq([196, 262, 330, 440, 587], 0.06, 0.09) },
  // Upgrade impact "POOSH!": a soft noise puff, a falling thump and a bright confirmation chime.
  poosh: {
    wave: "square",
    gain: 0.09,
    gap: 400,
    notes: [
      { f: 1400, to: 300, t: 0, d: 0.28, noise: true, g: 1.6 },
      { f: 260, to: 90, t: 0, d: 0.2, g: 0.7 },
      { f: 784, t: 0.16, d: 0.07, g: 0.45 },
      { f: 1175, t: 0.23, d: 0.14, g: 0.45 },
    ],
  },
  // A quiet, short dog whimper for the failure scene (two soft falling glides).
  whine: {
    wave: "triangle",
    gain: 0.05,
    gap: 3000,
    notes: [
      { f: 820, to: 1150, t: 0, d: 0.28 },
      { f: 1120, to: 760, t: 0.3, d: 0.42 },
      { f: 900, to: 640, t: 0.76, d: 0.4, g: 0.7 },
    ],
  },
  /** Typewriter tick: very short and quiet so a whole line never gets loud. */
  type: { wave: "square", gain: 0.012, gap: 40, notes: [{ f: 1900, t: 0, d: 0.016 }] },
  rise: { wave: "square", gain: 0.03, gap: 1500, notes: [{ f: 220, to: 880, t: 0, d: 1.1 }] },
  pop: { wave: "square", gain: 0.035, gap: 120, notes: seq([660, 990], 0.05, 0.05) },
  cheer: {
    wave: "triangle",
    gain: 0.05,
    gap: 1500,
    notes: [
      { f: 1600, t: 0, d: 0.7, noise: true, g: 0.8 },
      ...seq([784, 988, 1175, 988, 1319], 0.1, 0.08),
    ],
  },
  sparkle: { wave: "triangle", gain: 0.045, gap: 600, notes: seq([1568, 2093, 2637, 3136], 0.06, 0.08) },
  /** The astronaut's speech: lower blips than Laika's. */
  voice: { wave: "square", gain: 0.03, gap: 400, notes: seq([330, 392, 294, 349], 0.08, 0.06) },
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

const DEFAULT_PREFS: AudioPrefs = { master: true, music: true, ambience: true, sfx: true };

/** Volume of each channel, 0–100. "master" scales everything. */
export type AudioVolumes = Record<AudioPrefKey, number>;
const DEFAULT_VOLUMES: AudioVolumes = { master: 70, music: 40, ambience: 30, sfx: 60 };
const VOLUME_KEY = `${PREF_KEY}/volumes`;
let volumes: AudioVolumes = DEFAULT_VOLUMES;
// Channel trims chosen so the default sliders sound balanced: the supplied
// music is mastered loud, the synthesized effects and wind are quiet.
const TRIM: Record<Exclude<AudioPrefKey, "master">, number> = { music: 0.5, ambience: 4.5, sfx: 2.4 };

/** Actual linear gain for a channel (0 when it or the master is off). Exported for tests. */
export function channelGain(key: Exclude<AudioPrefKey, "master">, p: AudioPrefs = prefs, v: AudioVolumes = volumes): number {
  if (!p.master || !p[key]) return 0;
  return (v.master / 100) * (v[key] / 100) * TRIM[key];
}
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
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AudioVolumes>;
      const v = { ...DEFAULT_VOLUMES };
      for (const key of Object.keys(v) as AudioPrefKey[]) {
        const n = Number(saved[key]);
        if (Number.isFinite(n)) v[key] = Math.max(0, Math.min(100, Math.round(n)));
      }
      volumes = v;
    }
  } catch {
    // Bad or blocked storage: default volumes.
  }
}

// Effects and ambience run through one gain node each, so sliders act at once.
let sfxBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(audio: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === audio.sampleRate) return noiseBuf;
  const b = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.8), audio.sampleRate);
  const d = b.getChannelData(0);
  let seed = 2026;
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  noiseBuf = b;
  return b;
}

/**
 * Silences every sound effect that is playing or already scheduled (used when a
 * cutscene is skipped). The next effect gets a fresh channel.
 */
export function stopAllSfx(): void {
  try {
    const old = sfxBus;
    sfxBus = null;
    if (old && ctx) {
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setValueAtTime(0, ctx.currentTime);
    }
    window.setTimeout(() => old?.disconnect(), 50);
  } catch {
    // Audio must never break the game.
  }
}
let ambienceBus: GainNode | null = null;
function bus(kind: "sfx" | "ambience", audio: AudioContext): GainNode {
  let node = kind === "sfx" ? sfxBus : ambienceBus;
  if (!node || node.context !== audio) {
    node = audio.createGain();
    node.gain.value = channelGain(kind);
    node.connect(audio.destination);
    if (kind === "sfx") sfxBus = node;
    else ambienceBus = node;
  }
  return node;
}
function applyVolumes(): void {
  try {
    if (ctx) {
      // Short glide instead of a jump, so moving a slider never clicks.
      sfxBus?.gain.setTargetAtTime(channelGain("sfx"), ctx.currentTime, 0.03);
      ambienceBus?.gain.setTargetAtTime(channelGain("ambience"), ctx.currentTime, 0.03);
    }
    if (music && !music.fading) music.el.volume = Math.min(1, channelGain("music"));
  } catch {
    // Audio must never break the game.
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

// ---------------------------------------------------------------------------
// Background layers. One controlled manager: each layer exists at most once,
// however often React components mount, unmount or re-render.
// ---------------------------------------------------------------------------

/**
 * Background music: the two tracks supplied by the team, played one after the
 * other in an endless loop. A single <audio> element exists for the whole app,
 * so switching tabs, opening Settings or advancing a sol never restarts it.
 */
export type MusicScene = "menu" | "game" | "none";
/**
 * The team's custom tracks. "Against the Crimson Sky" belongs to the main menu
 * only; gameplay plays "Below the Red Horizon" then "Last Light On The Ridge".
 */
export const MUSIC_TRACKS: { title: string; src: string; scene: Exclude<MusicScene, "none"> }[] = [
  { title: "Against the Crimson Sky", src: "/audio/against-the-crimson-sky.mp3", scene: "menu" },
  { title: "Below the Red Horizon", src: "/audio/below-the-red-horizon.mp3", scene: "game" },
  { title: "Last Light On The Ridge", src: "/audio/last-light-on-the-ridge.mp3", scene: "game" },
];
const playlist = (scene: Exclude<MusicScene, "none">) => MUSIC_TRACKS.filter((t) => t.scene === scene);
const AMBIENCE_GAIN = 0.03;

interface MusicPlayer {
  el: HTMLAudioElement;
  /** Which playlist is loaded, and the index within it. */
  scene: Exclude<MusicScene, "none">;
  track: number;
  playing: boolean;
  fading: boolean;
  fadeTimer: number | null;
}
let music: MusicPlayer | null = null;
let musicScene: MusicScene = "none";
/** Reasons the music must be silent right now (e.g. a sad scene or the memorial). */
const silencers = new Set<string>();
/** Where each playlist was paused, so returning to a screen resumes instead of restarting. */
const resumeAt: Record<Exclude<MusicScene, "none">, { track: number; time: number }> = {
  menu: { track: 0, time: 0 },
  game: { track: 0, time: 0 },
};
let musicGen = 0;
interface AmbienceLayer {
  out: GainNode;
  nodes: AudioScheduledSourceNode[];
}
let ambienceLayer: AmbienceLayer | null = null;

function fadeMusic(player: MusicPlayer, target: () => number, ms: number, done?: () => void): void {
  if (player.fadeTimer !== null) window.clearInterval(player.fadeTimer);
  const from = player.el.volume;
  const steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  player.fading = true;
  player.fadeTimer = window.setInterval(() => {
    i++;
    try {
      // The target is read every step, so a slider moved mid-fade is honoured.
      player.el.volume = Math.max(0, Math.min(1, from + ((target() - from) * i) / steps));
    } catch {
      i = steps;
    }
    if (i >= steps) {
      if (player.fadeTimer !== null) window.clearInterval(player.fadeTimer);
      player.fadeTimer = null;
      player.fading = false;
      done?.();
    }
  }, 40);
}

function loadTrack(player: MusicPlayer, scene: Exclude<MusicScene, "none">): void {
  if (player.el.src && player.scene !== scene) {
    resumeAt[player.scene] = { track: player.track, time: player.el.currentTime || 0 };
  }
  const list = playlist(scene);
  const pos = resumeAt[scene];
  player.scene = scene;
  player.track = pos.track % list.length;
  const want = new URL(list[player.track].src, window.location.href).href;
  if (player.el.src !== want) {
    player.el.src = list[player.track].src;
    if (pos.time > 0) {
      const t = pos.time;
      player.el.addEventListener("loadedmetadata", () => {
        try {
          player.el.currentTime = t;
        } catch {
          // Seeking failed: start from the top.
        }
      }, { once: true });
    }
  }
}

function startMusic(scene: Exclude<MusicScene, "none">): void {
  if (typeof Audio === "undefined") return;
  if (!music) {
    const el = new Audio();
    el.preload = "auto";
    const player: MusicPlayer = { el, scene, track: 0, playing: false, fading: false, fadeTimer: null };
    // When one track ends the next one of the same playlist begins, forever.
    el.addEventListener("ended", () => {
      const list = playlist(player.scene);
      player.track = (player.track + 1) % list.length;
      el.src = list[player.track].src;
      if (player.playing) void el.play().catch(() => undefined);
    });
    music = player;
    loadTrack(player, scene);
  }
  const player = music;
  const gen = ++musicGen;
  const begin = () => {
    if (gen !== musicGen) return;
    if (player.scene !== scene || !player.el.src) loadTrack(player, scene);
    player.playing = true;
    player.el.volume = 0;
    // play() can be refused before a user gesture; that is fine, we try again on the next sync.
    void player.el
      .play()
      .then(() => {
        if (player.playing && gen === musicGen) fadeMusic(player, () => Math.min(1, channelGain("music")), 800);
      })
      .catch(() => {
        player.playing = false;
      });
  };
  if (player.playing && player.scene === scene) return;
  if (player.playing && !player.el.paused) {
    // Changing screens: fade the old tune out (~0.4 s) before the new one starts.
    player.playing = false;
    fadeMusic(player, () => 0, 400, () => {
      player.el.pause();
      begin();
    });
    return;
  }
  begin();
}

/** Fades out (~0.4 s) and pauses, never rewinds, so the tune can carry on later. */
function stopMusic(): void {
  const player = music;
  if (!player || !player.playing) return;
  player.playing = false;
  const gen = ++musicGen;
  fadeMusic(player, () => 0, 400, () => {
    if (!player.playing && gen === musicGen) player.el.pause();
  });
}

/** Which screen's music should play: the main menu's, gameplay's, or none. */
export function setMusicScene(scene: MusicScene): void {
  if (musicScene === scene) return;
  musicScene = scene;
  syncLayers();
}

/** Silences (or releases) the music for a named reason, e.g. the memorial. */
export function setMusicSilenced(reason: string, on: boolean): void {
  if (on === silencers.has(reason)) return;
  if (on) silencers.add(reason);
  else silencers.delete(reason);
  syncLayers();
}

/** Soft synthesized "wind" (filtered noise) plus a faint equipment hum. Artistic, not a Mars recording. */
function startAmbience(audio: AudioContext): void {
  if (ambienceLayer) return;
  const out = audio.createGain();
  out.gain.setValueAtTime(0, audio.currentTime);
  out.gain.linearRampToValueAtTime(1, audio.currentTime + 1.5);
  out.connect(bus("ambience", audio));

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
    const wantMusic = unlocked && visible && prefs.master && prefs.music && musicScene !== "none" && silencers.size === 0;
    const wantAmbience = unlocked && visible && prefs.master && prefs.ambience;
    const audio = wantMusic || wantAmbience ? getContext() : ctx;
    if (wantMusic && musicScene !== "none") startMusic(musicScene);
    else stopMusic();
    if (wantAmbience && audio) startAmbience(audio);
    else stopAmbience(audio);
  } catch {
    // Audio must never break the game.
  }
}

/** Which loops are running right now (used by tests and the settings panel). */
export function activeLayers(): { music: boolean; ambience: boolean } {
  return { music: music !== null && music.playing, ambience: ambienceLayer !== null };
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
  applyVolumes();
  listeners.forEach((l) => l());
}

export function getAudioVolumes(): AudioVolumes {
  loadPref();
  return volumes;
}

/** Sets a channel volume (0–100). Takes effect immediately and is saved. */
export function setAudioVolume(key: AudioPrefKey, value: number): void {
  loadPref();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  if (!Number.isFinite(v) || volumes[key] === v) return;
  volumes = { ...volumes, [key]: v };
  try {
    window.localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes));
  } catch {
    // Still applies for this session.
  }
  applyVolumes();
  listeners.forEach((l) => l());
}

/** For tests and the browser check: what the music element is doing right now. */
export function musicStatus(): { playing: boolean; track: string; time: number; volume: number; scene: MusicScene } | null {
  if (!music) return null;
  return {
    playing: music.playing && !music.el.paused,
    track: playlist(music.scene)[music.track]?.title ?? "",
    time: music.el.currentTime,
    volume: music.el.volume,
    scene: musicScene,
  };
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
      const at = start + n.t;
      const peak = cue.gain * (n.g ?? 1);
      const amp = audio.createGain();
      // Short stepped envelope: instant attack, quick release (no clicks).
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(peak, at + 0.005);
      amp.gain.setValueAtTime(peak, at + Math.max(0.006, n.d - 0.02));
      amp.gain.linearRampToValueAtTime(0, at + n.d);
      amp.connect(bus("sfx", audio));
      let src: AudioScheduledSourceNode;
      if (n.noise) {
        const noise = audio.createBufferSource();
        noise.buffer = noiseBuffer(audio);
        const filter = audio.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 1.2;
        filter.frequency.setValueAtTime(n.f, at);
        if (n.to) filter.frequency.exponentialRampToValueAtTime(n.to, at + n.d);
        noise.connect(filter);
        filter.connect(amp);
        src = noise;
      } else {
        const osc = audio.createOscillator();
        osc.type = cue.wave;
        osc.frequency.setValueAtTime(n.f, at);
        if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, at + n.d);
        osc.connect(amp);
        src = osc;
      }
      src.start(at);
      src.stop(at + n.d + 0.02);
    }
    return true;
  } catch {
    return false;
  }
}

/** Test helper: forget throttling, layers and context. */
export function resetSoundForTests(): void {
  if (music) {
    if (music.fadeTimer !== null) clearInterval(music.fadeTimer);
    music.el.pause();
    music = null;
  }
  musicScene = "none";
  silencers.clear();
  resumeAt.menu = { track: 0, time: 0 };
  resumeAt.game = { track: 0, time: 0 };
  stopAmbience(null);
  ctx = null;
  sfxBus = null;
  ambienceBus = null;
  volumes = DEFAULT_VOLUMES;
  unlocked = false;
  prefs = DEFAULT_PREFS;
  prefLoaded = false;
  for (const k of Object.keys(lastPlayed) as SoundName[]) delete lastPlayed[k];
}

export const SERVER_PREFS: AudioPrefs = DEFAULT_PREFS;
export const SERVER_VOLUMES: AudioVolumes = DEFAULT_VOLUMES;
