"use client";

import type { ResourceKey, SolReport } from "@/game/types";
import { round1 } from "@/game/config";
import { summarizeReport } from "@/game/summary";
import type { Delivery } from "@/game/types";
import { Modal } from "./Modal";
import { WEATHER_TEXT } from "./ResourceHud";

const ROWS: { key: ResourceKey; label: string; goodWhenUp: boolean }[] = [
  { key: "power", label: "Power", goodWhenUp: true },
  { key: "lifeSupport", label: "Life Support", goodWhenUp: true },
  { key: "materials", label: "Materials", goodWhenUp: true },
  { key: "food", label: "Food", goodWhenUp: true },
  { key: "radiation", label: "Radiation Hazard", goodWhenUp: false },
];

const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

interface Props {
  report: SolReport;
  preview?: boolean;
  onClose: () => void;
  closeLabel: string;
  /** Optional line from Laika shown above the table (tutorial). */
  note?: string;
}

/** Itemised before / change / after table. Used for both the real report and the preview. */
export function SolReportModal({ report, preview = false, onClose, closeLabel, note }: Props) {
  return (
    <Modal
      title={preview ? `Preview of Sol ${report.sol} (nothing changes yet)` : `End of Sol ${report.sol} Report`}
      maxWidth={760}
      onClose={onClose}
      backdropClose={preview}
      footer={
        <button type="button" className={`btn ${preview ? "btn-gray" : "btn-go"}`} onClick={onClose} data-autofocus>
          {closeLabel}
        </button>
      }
    >
      <p className="mb-2 text-[length:calc(14px*var(--ts))]">
        Weather: <strong>{WEATHER_TEXT[report.weather].label}</strong> ({WEATHER_TEXT[report.weather].note}).{" "}
        {preview
          ? "This is what will happen if you advance now. Surprise events are not included."
          : "Here is exactly what changed and why."}
      </p>
      {note && (
        <p className="mb-2 border-[3px] border-ink bg-gold p-2 text-[length:calc(14px*var(--ts))] font-bold">
          Laika: “{note}”
        </p>
      )}
      <table className="report">
        <thead>
          <tr>
            <th scope="col">Resource</th>
            <th scope="col">Before</th>
            <th scope="col">Change</th>
            <th scope="col">After</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label, goodWhenUp }) => {
            const r = report.resources[key];
            const delta = round1(r.after - r.before);
            const good = delta === 0 ? null : delta > 0 === goodWhenUp;
            return (
              <tr key={key}>
                <th scope="row" style={{ background: "#fff" }}>
                  <div className="font-extrabold uppercase">{label}</div>
                  {r.lines.length > 0 && (
                    <ul className="text-[length:calc(12px*var(--ts))] font-normal">
                      {r.lines.map((l) => (
                        <li key={l.label}>
                          {sign(round1(l.amount))} {l.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.lines.length === 0 && <div className="text-[length:calc(12px*var(--ts))] font-normal">No daily change.</div>}
                </th>
                <td className="tabular-nums">{r.before}</td>
                <td className="tabular-nums font-extrabold" style={{ background: good === null ? "#fff" : good ? "#81C995" : "#F2CA76" }}>
                  {sign(delta)} {good === null ? "" : good ? "▲" : "▼"}
                </td>
                <td className="tabular-nums font-extrabold">{r.after}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {report.notes.length > 0 && (
        <div className="mt-3 border-[3px] border-ink bg-white p-2">
          <div className="font-extrabold uppercase">Engineer&apos;s notes</div>
          <ul className="list-disc pl-5 text-[length:calc(14px*var(--ts))]">
            {report.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

interface SummaryProps {
  report: SolReport;
  /** Materials that arrived for the sol now starting (already applied by the engine). */
  deliveries: Delivery[];
  continueLabel: string;
  onContinue: () => void;
  onFullReport: () => void;
}

/** Short end-of-sol summary: five real changes and the one most important message. */
export function SolSummaryModal({ report, deliveries, continueLabel, onContinue, onFullReport }: SummaryProps) {
  const headline = summarizeReport(report);
  const delivered = deliveries.reduce((sum, d) => sum + d.amount, 0);
  return (
    <Modal
      title={`Sol ${report.sol} report`}
      maxWidth={440}
      onClose={onContinue}
      backdropClose={false}
      footer={
        <>
          <button type="button" className="btn btn-gray" onClick={onFullReport}>
            View full report
          </button>
          <button type="button" className="btn btn-go" onClick={onContinue} data-autofocus>
            {continueLabel}
          </button>
        </>
      }
    >
      <div data-testid="sol-summary">
        <ul className="space-y-1">
          {ROWS.map(({ key, label, goodWhenUp }) => {
            const r = report.resources[key];
            const delta = round1(r.after - r.before);
            const good = delta === 0 ? null : delta > 0 === goodWhenUp;
            return (
              <li key={key} className="flex items-center justify-between gap-2 border-[2px] border-ink bg-white px-2 py-1" data-summary={key}>
                <span className="font-extrabold uppercase">{label}</span>
                <span
                  className="tag tabular-nums"
                  style={{ background: good === null ? "#fff" : good ? "#81C995" : "#F2CA76", fontSize: "calc(14px * var(--ts))", minWidth: 64, textAlign: "center" }}
                >
                  {sign(delta)}
                </span>
              </li>
            );
          })}
        </ul>
        <p
          className="mt-2 border-[3px] border-ink p-2 text-[length:calc(15px*var(--ts))] font-bold"
          style={{ background: headline.tone === "bad" ? "#ED695B" : headline.tone === "warn" ? "#F2CA76" : "#81C995", color: headline.tone === "bad" ? "#fff" : "#2a1a22" }}
        >
          {headline.message}
        </p>
        {delivered > 0 && (
          <p className="mt-2 border-[3px] border-ink bg-white p-2 text-[length:calc(14px*var(--ts))] font-bold" data-testid="delivery-note">
            Supplies! Mission Control sent {delivered} materials{deliveries.some((d) => d.kind === "emergency") ? " (emergency supplies)" : ""}!
          </p>
        )}
      </div>
    </Modal>
  );
}
