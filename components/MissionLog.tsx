"use client";

import type { LogEntry } from "@/game/types";
import { Modal } from "./Modal";

const KIND_LABEL: Record<LogEntry["kind"], { text: string; cls: string }> = {
  system: { text: "Info", cls: "" },
  event: { text: "Event", cls: "tag-warn" },
  decision: { text: "Decision", cls: "tag-ok" },
  engineering: { text: "Build", cls: "tag-ok" },
  report: { text: "Report", cls: "" },
  warning: { text: "Warning", cls: "tag-bad" },
};

export function MissionLogList({ log, maxHeight = 420, compact = false }: { log: LogEntry[]; maxHeight?: number; compact?: boolean }) {
  return (
    <ol className="scroll-y space-y-1 pr-1" style={{ maxHeight }} aria-label="Mission log entries" tabIndex={0}>
      {log.map((e, i) => (
        <li key={i} className="border-[2px] border-ink bg-white p-2 text-[length:calc(13px*var(--ts))]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tag" style={{ background: "#27334C", color: "#FFF1D0" }}>
              Sol {e.sol}
            </span>
            <span className={`tag ${KIND_LABEL[e.kind].cls}`}>{KIND_LABEL[e.kind].text}</span>
            <strong>{e.title}</strong>
          </div>
          {compact ? (
            <details>
              <summary className="cursor-pointer text-[length:calc(12px*var(--ts))] font-bold">Details</summary>
              <div>{e.detail}</div>
            </details>
          ) : (
            <div>{e.detail}</div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function MissionLog({ log, onClose }: { log: LogEntry[]; onClose: () => void }) {
  return (
    <Modal title="Mission Log" onClose={onClose} maxWidth={760}>
      <p className="mb-2 text-[length:calc(13px*var(--ts))]">Every event, decision and daily change, oldest first.</p>
      <MissionLogList log={log} />
    </Modal>
  );
}
