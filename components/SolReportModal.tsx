"use client";

import type { ResourceKey, SolReport } from "@/game/types";
import { round1 } from "@/game/config";
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
      footer={
        <button type="button" className={`btn ${preview ? "btn-gray" : "btn-go"}`} onClick={onClose} data-autofocus>
          {closeLabel}
        </button>
      }
    >
      <p className="mb-2 text-[14px]">
        Weather: <strong>{WEATHER_TEXT[report.weather].label}</strong> ({WEATHER_TEXT[report.weather].note}).{" "}
        {preview
          ? "This is what will happen if you advance now. Surprise events are not included."
          : "Here is exactly what changed and why."}
      </p>
      {note && (
        <p className="mb-2 border-[3px] border-ink bg-gold p-2 text-[14px] font-bold">
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
                    <ul className="text-[12px] font-normal">
                      {r.lines.map((l) => (
                        <li key={l.label}>
                          {sign(round1(l.amount))} {l.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.lines.length === 0 && <div className="text-[12px] font-normal">No daily change.</div>}
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
          <ul className="list-disc pl-5 text-[14px]">
            {report.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
