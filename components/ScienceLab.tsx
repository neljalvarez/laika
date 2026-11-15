"use client";

import { useEffect } from "react";
import { MODULES } from "@/data/modules";
import { SCIENCE_CARDS, SCIENCE_DISCLAIMER } from "@/data/science";
import { Modal } from "./Modal";
import { PixelSprite } from "./pixel/PixelSprite";
import { ICONS } from "./pixel/sprites";

interface Props {
  onClose: () => void;
  /** Card to scroll to and open (from a building's "Why does this matter?"). */
  focus?: string;
}

export function ScienceLab({ onClose, focus }: Props) {
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`science-${focus}`);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.querySelector<HTMLElement>("h2")?.focus();
  }, [focus]);

  return (
    <Modal title="NASA Science Lab" onClose={onClose} maxWidth={980}>
      <p className="mb-3 text-[length:calc(14px*var(--ts))]">
        Real space science behind the game. <strong>Blue</strong> = what NASA really found. <strong>Orange</strong> = how our
        game keeps it simple. Game numbers are made-up units.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {SCIENCE_CARDS.map((card) => (
          <article
            key={card.id}
            id={`science-${card.id}`}
            data-card={card.id}
            className="border-[3px] border-ink bg-white"
            style={focus === card.id ? { boxShadow: "0 0 0 4px #F2CA76" } : undefined}
          >
            <div className="flex items-center gap-2 border-b-[3px] border-ink bg-slate px-2 py-1">
              <span className="border-[2px] border-ink bg-navy p-[2px]">
                <PixelSprite grid={ICONS[card.icon]} scale={3} />
              </span>
              <h2 className="h-pixel text-[length:calc(15px*var(--ts))] text-cream" tabIndex={-1}>
                {card.title}
              </h2>
            </div>
            <div className="space-y-2 p-2 text-[length:calc(13px*var(--ts))]">
              <p className="text-[length:calc(14px*var(--ts))] font-bold">{card.simple}</p>
              <div className="border-l-[6px] border-pixelblue pl-2">
                <div className="h-pixel text-[length:calc(12px*var(--ts))]">
                  <span className="tag" style={{ background: "#6fb1f5" }}>
                    Real
                  </span>{" "}
                  What NASA found
                </div>
                <p>{card.observed}</p>
              </div>
              <div className="border-l-[6px] border-sand pl-2">
                <div className="h-pixel text-[length:calc(12px*var(--ts))]">
                  <span className="tag tag-warn">Game</span> How we simplify it
                </div>
                <p>{card.simplified}</p>
              </div>
              <p>
                <strong>In the game:</strong> {card.mechanic}
                {card.modules.length > 0 && <> ({card.modules.map((m) => MODULES[m].name).join(", ")})</>}
              </p>
              <details>
                <summary className="cursor-pointer font-bold">More details and sources</summary>
                <p className="mt-1">{card.details}</p>
                <ul className="mt-1 list-disc pl-5">
                  {card.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.title}
                      </a>{" "}
                      — {s.publisher}, {s.date}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[length:calc(12px*var(--ts))]">{SCIENCE_DISCLAIMER}</p>
    </Modal>
  );
}
