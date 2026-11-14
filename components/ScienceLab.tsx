"use client";

import { SCIENCE_CARDS, SCIENCE_DISCLAIMER } from "@/data/science";
import { Modal } from "./Modal";

export function ScienceLab({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="NASA Science Lab" onClose={onClose} maxWidth={960}>
      <p className="mb-3 text-[14px]">
        Real space science inspired this game. Each card shows what was really observed, and how our game
        simplifies it. <strong>Game numbers are made-up units, not real measurements.</strong>
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {SCIENCE_CARDS.map((card) => (
          <article key={card.id} className="border-[3px] border-ink bg-white">
            <h2 className="h-pixel border-b-[3px] border-ink bg-slate px-2 py-1 text-[14px] text-cream">{card.title}</h2>
            <div className="space-y-2 p-2 text-[13px]">
              <p>
                <strong>Mission / instrument:</strong> {card.mission}
                <br />
                <strong>When and where:</strong> {card.context}
              </p>
              <div className="border-l-[6px] border-pixelblue pl-2">
                <div className="h-pixel text-[12px]">
                  <span className="tag" style={{ background: "#6fb1f5" }}>
                    Real
                  </span>{" "}
                  What was observed
                </div>
                <p>{card.observed}</p>
              </div>
              <div className="border-l-[6px] border-sand pl-2">
                <div className="h-pixel text-[12px]">
                  <span className="tag tag-warn">Game</span> What our game simplifies
                </div>
                <p>{card.simplified}</p>
              </div>
              <p className="font-bold">{card.mechanic}</p>
              <p>
                Source:{" "}
                <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {card.sourceTitle}
                </a>
                {card.extraSource && (
                  <>
                    {" "}
                    · Also:{" "}
                    <a href={card.extraSource.url} target="_blank" rel="noopener noreferrer">
                      {card.extraSource.title}
                    </a>
                  </>
                )}
              </p>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[12px]">{SCIENCE_DISCLAIMER}</p>
    </Modal>
  );
}
