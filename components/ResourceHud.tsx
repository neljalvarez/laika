import { CONFIG } from "@/game/config";
import { batteryCapacity } from "@/game/engine";
import type { MissionState, Weather } from "@/game/types";
import { PixelSprite } from "./pixel/PixelSprite";
import { ICONS, type IconName } from "./pixel/sprites";

interface MeterProps {
  icon: IconName;
  label: string;
  value: number;
  max: number;
  color: string;
  status: { word: string; level: "ok" | "warn" | "bad" };
  hint: string;
}

function Meter({ icon, label, value, max, color, status, hint }: MeterProps) {
  const filled = Math.max(0, Math.min(10, Math.round((value / max) * 10)));
  return (
    <div
      className="meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}, ${status.word}`}
      title={hint}
    >
      <div className="flex items-center justify-between gap-1 text-[12px] font-extrabold uppercase tracking-wide">
        <span className="flex min-w-0 items-center gap-1">
          <PixelSprite grid={ICONS[icon]} scale={2} />
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
    </div>
  );
}

const lowIsBad = (v: number, warn: number, bad: number): MeterProps["status"] =>
  v <= bad ? { word: "Critical", level: "bad" } : v <= warn ? { word: "Low", level: "warn" } : { word: "OK", level: "ok" };

export const WEATHER_TEXT: Record<Weather, { label: string; icon: IconName; note: string }> = {
  CLEAR: { label: "Clear", icon: "sun", note: "Solar ×1.0" },
  DUSTY: { label: "Dusty", icon: "dust", note: "Solar ×0.75" },
  STORM: { label: "Dust storm", icon: "warning", note: "Solar ×0.40" },
};

export function ResourceHud({ state, highlight }: { state: MissionState; highlight: boolean }) {
  const r = state.resources;
  const cap = batteryCapacity(state);
  const rad: MeterProps["status"] =
    r.radiation >= 85
      ? { word: "Danger", level: "bad" }
      : r.radiation >= CONFIG.radiationWarning
        ? { word: "High", level: "warn" }
        : { word: "OK", level: "ok" };
  return (
    <div
      id="hud-meters"
      className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 ${highlight ? "tutorial-target" : ""}`}
      aria-label="Resource meters"
    >
      <Meter icon="power" label="Power" value={r.power} max={cap} color="#F2CA76" status={lowIsBad(r.power, 30, 18)} hint="Battery charge. Essential systems use 18 per sol." />
      <Meter icon="lifeSupport" label="Life Support" value={r.lifeSupport} max={100} color="#5fb7f0" status={lowIsBad(r.lifeSupport, 45, CONFIG.lifeSupportCritical)} hint="Air and water reserve. Zero ends the mission." />
      <Meter icon="materials" label="Materials" value={r.materials} max={Math.max(72, r.materials)} color="#b9c2d6" status={r.materials < 6 ? { word: "Low", level: "warn" } : { word: "OK", level: "ok" }} hint="Limited supply for upgrades and repairs." />
      <Meter icon="food" label="Food" value={r.food} max={CONFIG.foodCap} color="#81C995" status={lowIsBad(r.food, 6, 2)} hint="Laika eats 2 per sol. Storage holds 30." />
      <Meter icon="radiation" label="Rad Hazard" value={r.radiation} max={100} color="#ED695B" status={rad} hint="Fictional risk score. Lower is better. 100 ends the mission." />
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
