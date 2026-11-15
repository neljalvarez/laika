"use client";

import { useState } from "react";
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from "@/game/difficulty";
import { Modal } from "./Modal";

interface Props {
  defaultTraining: boolean;
  /** Sol of an existing save that starting will replace, if any. */
  savedSol: number | null;
  hasSave: boolean;
  onStart: (difficulty: Difficulty, training: boolean) => void;
  onClose: () => void;
}

/** Chosen once, before the mission starts. Saved with the mission. */
export function DifficultySelect({ defaultTraining, savedSol, hasSave, onStart, onClose }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [training, setTraining] = useState(defaultTraining);
  return (
    <Modal
      title="Choose difficulty"
      maxWidth={640}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-gray" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-go" onClick={() => onStart(difficulty, training)} data-autofocus>
            Start Mission
          </button>
        </>
      }
    >
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTY_ORDER.map((id) => {
          const d = DIFFICULTIES[id];
          const on = difficulty === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              className="cursor-pointer border-[3px] border-ink p-2 text-left"
              style={{ background: on ? "#F2CA76" : "#fff", boxShadow: on ? "inset 0 0 0 3px #2a1a22" : undefined }}
              onClick={() => setDifficulty(id)}
            >
              <div className="h-pixel text-[length:calc(16px*var(--ts))]">
                {on ? "▶ " : ""}
                {d.label}
              </div>
              <div className="text-[length:calc(12px*var(--ts))] font-bold">{d.title}</div>
              <div className="mt-1 text-[length:calc(13px*var(--ts))]">{d.blurb}</div>
              <div className="mt-1 text-[length:calc(12px*var(--ts))]">
                Start with {d.startMaterials} materials.
                <br />
                {d.deliveries.length > 0
                  ? `${d.deliveries.length} supply ${d.deliveries.length === 1 ? "delivery" : "deliveries"}.`
                  : "No planned deliveries."}
              </div>
            </button>
          );
        })}
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[length:calc(14px*var(--ts))] font-bold">
        <input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} style={{ width: 20, height: 20 }} />
        Play the training first (good for new players)
      </label>
      {hasSave && (
        <p className="mt-2 border-[3px] border-ink bg-gold p-2 text-[length:calc(13px*var(--ts))] font-bold" role="note">
          This replaces your saved mission{savedSol ? ` (Sol ${savedSol})` : ""}.
        </p>
      )}
    </Modal>
  );
}
