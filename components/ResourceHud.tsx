import { CONFIG, round1 } from "@/game/config";
import { batteryCapacity } from "@/game/engine";
import { resourceStatus, type ResourceStatus } from "@/game/status";
import type { MissionState, ResourceKey, Weather } from "@/game/types";
import { PixelSprite } from "./pixel/PixelSprite";
import { ICONS, type IconName } from "./pixel/sprites";

interface MeterProps {
  icon: IconName;
  label: string;
  value: number;
  max: number;
  color: string;
  status: ResourceStatus;
  hint: string;
  /** Real change during the last completed sol (from the engine's report). */
  delta: number | null;
  goodWhenUp: boolean;
}

function Meter({ icon, label, value, max, color, status, hint, delta, goodWhenUp }: MeterProps) {
  const filled = Math.max(0, Math.min(10, Math.round((value / max) * 10)));
  const deltaText =
    delta === null ? null : delta === 0 ? "±0 last sol" : `${delta > 0 ? "▲ +" : "▼ −"}${Math.abs(delta)} last sol`;
  const deltaGood = delta !== null && delta !== 0 && delta > 0 === goodWhenUp;
  return (
    <div
      className={`meter${status.level === "bad" ? " meter-bad" : ""}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}, ${status.word}${deltaText ? `, ${deltaText}` : ""}`}
      title={hint}
    >
      <div className="flex items-center justify-between gap-1 text-[12px] font-extrabold uppercase tracking-wide">
        <span className="flex min-w-0 items-center gap-1">
          <span className={status.level === "bad" ? "blink" : undefined}>
            <PixelSprite grid={ICONS[status.level === "bad" ? "warning" : icon]} scale={2} />
          </span>
          <span className="truncate">{label}</span>
        </span>
        <span className={`tag ${status.level === "ok" ? "tag-ok" : status.level === "warn" ? "tag-warn" : "tag-bad"}`} style={{ color: status.level === "bad" ? "#fff" : "#2a1a22", fontSize: 10 }}>
          {status.word}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="meter-segs flex-1" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="meter-seg" style={i < filled ? { background: color } : undefined} />
          ))}
        </div>
        <span className="whitespace-nowrap text-[13px] font-extrabold tabular-nums">
          {value}/{max}
        </span>
      </div>
      {deltaText && (
        <div className="meter-delta" style={{ color: delta === 0 ? "#b9c2d6" : deltaGood ? "#81C995" : "#F2CA76" }}>
          {deltaText}
        </div>
      )}
    </div>
  );
}

export const WEATHER_TEXT: Record<Weather, { label: string; icon: IconName; note: string }> = {
  CLEAR: { label: "Clear", icon: "sun", note: "Solar ×1.0" },
  DUSTY: { label: "Dusty", icon: "dust", note: "Solar ×0.75" },
  STORM: { label: "Dust storm", icon: "warning", note: "Solar ×0.40" },
};

export function ResourceHud({ state, highlight }: { state: MissionState; highlight: boolean }) {
  const r = state.resources;
  const cap = batteryCapacity(state);
  // Only show "last sol" changes for the sol that just finished.
  const report = state.lastReport && state.lastReport.sol === state.sol - 1 ? state.lastReport : null;
  const delta = (key: ResourceKey): number | null =>
    report ? round1(report.resources[key].after - report.resources[key].before) : null;
  return (
    <div
      id="hud-meters"
      className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 ${highlight ? "tutorial-target" : ""}`}
      aria-label="Resource meters"
    >
      <Meter icon="power" label="Power" value={r.power} max={cap} color="#F2CA76" status={resourceStatus(state, "power")} delta={delta("power")} goodWhenUp hint="Battery charge. Essential systems use 18 per sol." />
      <Meter icon="lifeSupport" label="Life Support" value={r.lifeSupport} max={100} color="#5fb7f0" status={resourceStatus(state, "lifeSupport")} delta={delta("lifeSupport")} goodWhenUp hint="Air and water reserve. Zero ends the mission." />
      <Meter icon="materials" label="Materials" value={r.materials} max={Math.max(72, r.materials)} color="#b9c2d6" status={resourceStatus(state, "materials")} delta={null} goodWhenUp hint="Limited supply for upgrades and repairs." />
      <Meter icon="food" label="Food" value={r.food} max={CONFIG.foodCap} color="#81C995" status={resourceStatus(state, "food")} delta={delta("food")} goodWhenUp hint="Laika eats 2 per sol. Storage holds 30." />
      <Meter icon="radiation" label="Rad Hazard" value={r.radiation} max={100} color="#ED695B" status={resourceStatus(state, "radiation")} delta={delta("radiation")} goodWhenUp={false} hint="Fictional risk score. Lower is better. 100 ends the mission." />
    </div>
  );
}

export function WeatherBadge({ label, weather }: { label: string; weather: Weather }) {
  const w = WEATHER_TEXT[weather];
  return (
    <div className="flex items-center gap-2 border-[3px] border-ink bg-cream px-2 py-1">
      <PixelSprite grid={ICONS[w.icon]} scale={2} />
      <div className="leading-tight">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-maroon">{label}</div>
        <div className="text-[13px] font-extrabold uppercase">
          {w.label} <span className="font-bold normal-case opacity-80">({w.note})</span>
        </div>
      </div>
    </div>
  );
}
