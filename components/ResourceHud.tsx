import { CONFIG, round1 } from "@/game/config";
import { batteryCapacity } from "@/game/engine";
import { resourceStatus, type ResourceStatus } from "@/game/status";
import type { MissionState, ResourceKey, Weather } from "@/game/types";
import { PixelSprite } from "./pixel/PixelSprite";
import { ICONS, type IconName } from "./pixel/sprites";
import { Reveal } from "./Reveal";

interface MeterProps {
  id: ResourceKey;
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

const SEGMENTS = 10;

/**
 * A vertical bar with no number on it. Hover, focus or tap shows the exact
 * value. Critical meters keep a blinking warning icon so danger is never hidden.
 */
function Meter({ id, icon, label, value, max, color, status, hint, delta, goodWhenUp }: MeterProps) {
  const filled = Math.max(0, Math.min(SEGMENTS, Math.round((value / max) * SEGMENTS)));
  const deltaText =
    delta === null ? null : delta === 0 ? "±0 last sol" : `${delta > 0 ? "▲ +" : "▼ −"}${Math.abs(delta)} last sol`;
  const deltaGood = delta !== null && delta !== 0 && delta > 0 === goodWhenUp;
  return (
    <Reveal
      className="vmeter-wrap"
      label={`${label}: ${value} of ${max}, ${status.word}${deltaText ? `, ${deltaText}` : ""}`}
      testId={`meter-${id}`}
      side="right"
      bubbleWidth={190}
      trigger={
        <span className={`vmeter${status.level === "bad" ? " meter-bad" : ""}`} data-meter={id} data-value={value}>
          <span className="vmeter-bar" aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} className="vmeter-seg" style={SEGMENTS - 1 - i < filled ? { background: color } : undefined} />
            ))}
          </span>
          <span className={status.level === "bad" ? "blink" : undefined} aria-hidden="true">
            <PixelSprite grid={ICONS[status.level === "bad" ? "warning" : icon]} scale={2} />
          </span>
        </span>
      }
    >
      <span className="block text-[12px] font-extrabold uppercase">{label}</span>
      <span className="block text-[20px] font-extrabold tabular-nums" data-testid={`meter-value-${id}`}>
        {value}
        <span className="text-[12px]"> / {max}</span>
      </span>
      <span className={`tag ${status.level === "ok" ? "tag-ok" : status.level === "warn" ? "tag-warn" : "tag-bad"}`}>{status.word}</span>
      {deltaText && (
        <span className="mt-1 block text-[12px] font-bold" style={{ color: delta === 0 ? "#66708c" : deltaGood ? "#2f7d45" : "#a94f36" }}>
          {deltaText}
        </span>
      )}
      <span className="mt-1 block text-[11px]">{hint}</span>
    </Reveal>
  );
}

export const WEATHER_TEXT: Record<Weather, { label: string; icon: IconName; note: string }> = {
  CLEAR: { label: "Clear", icon: "sun", note: "Solar ×1.0" },
  DUSTY: { label: "Dusty", icon: "dust", note: "Solar ×0.75" },
  STORM: { label: "Dust storm", icon: "warning", note: "Solar ×0.40" },
};

export function ResourceHud({ state }: { state: MissionState }) {
  const r = state.resources;
  const cap = batteryCapacity(state);
  // Only show "last sol" changes for the sol that just finished.
  const report = state.lastReport && state.lastReport.sol === state.sol - 1 ? state.lastReport : null;
  const delta = (key: ResourceKey): number | null =>
    report ? round1(report.resources[key].after - report.resources[key].before) : null;
  return (
    <div className="vmeters" aria-label="Resource meters. Hover, focus or tap a bar to see its number.">
      <Meter id="power" icon="power" label="Power" value={r.power} max={cap} color="#F2CA76" status={resourceStatus(state, "power")} delta={delta("power")} goodWhenUp hint="Runs everything. Essential systems use 18 each sol." />
      <Meter id="lifeSupport" icon="lifeSupport" label="Life Support" value={r.lifeSupport} max={100} color="#5fb7f0" status={resourceStatus(state, "lifeSupport")} delta={delta("lifeSupport")} goodWhenUp hint="Laika's air and water. At 0 the mission ends." />
      <Meter id="materials" icon="materials" label="Materials" value={r.materials} max={Math.max(80, r.materials)} color="#b9c2d6" status={resourceStatus(state, "materials")} delta={null} goodWhenUp hint="For upgrades and repairs. They do not grow back." />
      <Meter id="food" icon="food" label="Food" value={r.food} max={CONFIG.foodCap} color="#81C995" status={resourceStatus(state, "food")} delta={delta("food")} goodWhenUp hint="Laika eats 2 each sol." />
      <Meter id="radiation" icon="radiation" label="Rad Hazard" value={r.radiation} max={100} color="#ED695B" status={resourceStatus(state, "radiation")} delta={delta("radiation")} goodWhenUp={false} hint="Made-up risk score. Keep it low. At 100 the mission ends." />
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
