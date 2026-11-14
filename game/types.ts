// Canonical types for LAIKA: MISSION RED PLANET.
// All quantities are abstract game units — never NASA measurements.

export type ModuleId =
  | "habitat"
  | "solar"
  | "battery"
  | "lifeSupport"
  | "shelter"
  | "greenhouse";

export const MODULE_IDS: readonly ModuleId[] = [
  "habitat",
  "solar",
  "battery",
  "lifeSupport",
  "shelter",
  "greenhouse",
];

export type GreenhouseMode = "OFF" | "LOW" | "HIGH";
export type Weather = "CLEAR" | "DUSTY" | "STORM";
export type MissionStatus =
  | "intro"
  | "playing"
  | "outstanding"
  | "success"
  | "partial"
  | "failure";

export type ResourceKey =
  | "power"
  | "lifeSupport"
  | "materials"
  | "food"
  | "radiation";

export type Resources = Record<ResourceKey, number>;

export interface ModuleState {
  level: 1 | 2 | 3;
  condition: number; // 0–100
}

/** A temporary modifier created by an event choice. Ticks down once per sol. */
export interface TemporaryEffect {
  id: string;
  label: string;
  solsLeft: number;
  /** Multiplies solar generation. */
  solarMult?: number;
  /** Multiplies life-support recovery. */
  lsRecoveryMult?: number;
  /** Multiplies greenhouse harvest. */
  foodMult?: number;
  /** Multiplies the radiation hazard added each sol. */
  radMult?: number;
  /** Greenhouse and other nonessential loads are forced off. */
  nonessentialOff?: boolean;
  /** Laika waits in the shelter while this is active (visual + dialogue). */
  sheltering?: boolean;
}

export interface EventCost {
  materials?: number;
  power?: number;
  lifeSupport?: number;
  food?: number;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  /** Paid immediately; a choice is unavailable if any cost is unaffordable. */
  cost: EventCost;
  /** Immediate resource gains (resupply). */
  gain?: Partial<Record<"materials" | "food" | "lifeSupport" | "power", number>>;
  /** Raw radiation hazard added now. */
  radiation?: { amount: number; shielded: boolean };
  /** Condition lost by modules. */
  damage?: Partial<Record<ModuleId, number>>;
  /** Condition restored to modules. */
  repair?: Partial<Record<ModuleId, number>>;
  effects?: TemporaryEffect[];
  nearTerm: string;
  future: string;
  /** Short science explanation shown after choosing. */
  science: string;
  /** 0–1 engineering quality used by the Emergency Response score. */
  quality: number;
}

export type EventId =
  | "dust_storm"
  | "solar_radiation"
  | "water_recycler"
  | "panel_dust"
  | "habitat_malfunction"
  | "greenhouse_fault"
  | "resupply";

export interface MissionEvent {
  id: EventId;
  title: string;
  icon: "warning" | "radiation" | "power" | "food" | "lifeSupport" | "materials";
  description: string;
  /** Earliest and latest sols the event may appear on. */
  minSol: number;
  maxSol: number;
  weight: number;
  choices: EventChoice[];
}

export interface ReportLine {
  label: string;
  amount: number;
}

export interface ResourceReport {
  before: number;
  after: number;
  lines: ReportLine[];
}

export interface SolReport {
  sol: number;
  weather: Weather;
  resources: Record<ResourceKey, ResourceReport>;
  notes: string[];
  powerShortage: boolean;
  foodShortage: boolean;
}

export interface LogEntry {
  sol: number;
  kind: "system" | "event" | "decision" | "engineering" | "report" | "warning";
  title: string;
  detail: string;
}

export interface DecisionRecord {
  sol: number;
  eventId: EventId;
  eventTitle: string;
  choiceId: string;
  choiceLabel: string;
  quality: number;
}

export interface SolSnapshot {
  sol: number;
  resources: Resources;
  conditions: Record<ModuleId, number>;
  powerShortage: boolean;
  foodShortage: boolean;
}

export interface Metrics {
  powerShortageSols: number;
  foodShortageSols: number;
  lifeSupportCriticalSols: number;
  materialsSpent: number;
  upgradesBuilt: number;
  repairsDone: number;
}

export interface EventOutcome {
  eventTitle: string;
  choiceLabel: string;
  science: string;
  changes: string[];
}

export interface LastAction {
  kind: "upgrade" | "repair" | "mode" | "event";
  moduleId?: ModuleId;
  sol: number;
}

export interface TutorialState {
  active: boolean;
  /** 0 welcome, 1 inspect solar, 2 read meters, 3 greenhouse mode, 4 preview, 5 advance. */
  step: number;
  /** True once the tutorial was finished or skipped (optional so old saves stay valid). */
  completed?: boolean;
  /** Step-numbering version; absent in saves made before the welcome stage existed. */
  v?: number;
}

export interface MissionState {
  version: number;
  seed: number;
  /** Current PRNG state; saved so reloading never rerolls. */
  rng: number;
  difficulty: "standard";
  status: MissionStatus;
  sol: number;
  maxSols: number;
  resources: Resources;
  modules: Record<ModuleId, ModuleState>;
  greenhouseMode: GreenhouseMode;
  /** Sols of crop growth completed (needs CROP_ESTABLISH_SOLS to harvest). */
  cropProgress: number;
  weather: Weather;
  forecast: Weather;
  stormSolsLeft: number;
  pendingEvent: EventId | null;
  eventOutcome: EventOutcome | null;
  seenEvents: EventId[];
  effects: TemporaryEffect[];
  actionsLeft: number;
  /** Consecutive sols with an essential power shortage. */
  powerEmergencySols: number;
  /** Consecutive sols without enough food. */
  foodEmergencySols: number;
  /** True while the end-of-sol report must be acknowledged. */
  reportPending: boolean;
  lastReport: SolReport | null;
  log: LogEntry[];
  history: SolSnapshot[];
  decisions: DecisionRecord[];
  metrics: Metrics;
  lastAction: LastAction | null;
  tutorial: TutorialState;
  failureReason: string | null;
  /** Last rejected action, shown as a clear message. */
  notice: string | null;
}

export type GameAction =
  | { type: "BEGIN_MISSION" }
  | { type: "SET_GREENHOUSE_MODE"; mode: GreenhouseMode }
  | { type: "UPGRADE"; moduleId: ModuleId }
  | { type: "REPAIR"; moduleId: ModuleId }
  | { type: "RESOLVE_EVENT"; choiceId: string }
  | { type: "DISMISS_OUTCOME" }
  | { type: "ADVANCE_SOL" }
  | { type: "DISMISS_REPORT" }
  | { type: "TUTORIAL_STEP"; from: number }
  | { type: "TUTORIAL_BACK" }
  | { type: "TUTORIAL_SKIP" }
  | { type: "TUTORIAL_REPLAY" }
  | { type: "CLEAR_NOTICE" };
