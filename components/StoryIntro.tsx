"use client";

import { useState } from "react";
import type { LaikaMood } from "@/data/dialogue";
import { LaikaSprite } from "./LaikaSprite";

const PANELS: { title: string; mood: LaikaMood; text: string[]; bullets?: string[] }[] = [
  {
    title: "A different history",
    mood: "idle",
    text: [
      "In 1957, a small dog named Laika became the first animal to orbit Earth. In real life, she did not survive her flight.",
      "This game tells a made-up story instead. In our story, Laika was rescued and came home a hero.",
    ],
  },
  {
    title: "A new mission",
    mood: "happy",
    text: [
      "Years later, in our story, humans are getting ready to live on Mars. Someone has to check the outpost first.",
      "Laika volunteers. Tail wagging, she rides a robot lander down to the Red Planet.",
    ],
  },
  {
    title: "Your mission",
    mood: "alert",
    text: [
      "Keep Laika's Mars outpost running for 10 sols. Manage power, food and life support while getting ready for the first crew.",
    ],
    bullets: [
      "Materials are limited: one upgrade or repair each sol.",
      "Emergencies will happen. Every choice has a cost.",
      "Upgrades make buildings stronger. Repairs fix damage.",
      "The mission ends early if air runs out, if power or food runs out 2 sols in a row, or if radiation hazard reaches 100.",
    ],
  },
];

/** briefOnly: the cutscene already told the story, so show just the "Your mission" panel. */
export function StoryIntro({ onDone, briefOnly = false }: { onDone: () => void; briefOnly?: boolean }) {
  const [i, setI] = useState(briefOnly ? PANELS.length - 1 : 0);
  const panel = PANELS[i];
  const last = i === PANELS.length - 1;
  return (
    <main className="mx-auto flex min-h-screen max-w-[760px] flex-col justify-center p-3">
      <section className="panel" aria-live="polite">
        <div className="panel-title">
          <span>{panel.title}</span>
          {!briefOnly && (
            <span>
              {i + 1}/{PANELS.length}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-start">
          <div className="border-[3px] border-ink bg-slate p-2">
            <LaikaSprite mood={panel.mood} scale={5} />
          </div>
          <div className="space-y-2 text-[16px]">
            {panel.text.map((t) => (
              <p key={t}>{t}</p>
            ))}
            {panel.bullets && (
              <ul className="list-disc space-y-1 pl-5 text-[14px]" data-testid="mission-brief">
                {panel.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t-[3px] border-ink p-3">
          {briefOnly ? (
            <span />
          ) : (
            <button type="button" className="btn btn-gray" onClick={onDone}>
              Skip story
            </button>
          )}
          <div className="flex gap-2">
            {i > 0 && !briefOnly && (
              <button type="button" className="btn btn-gray" onClick={() => setI(i - 1)}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-go" onClick={() => (last ? onDone() : setI(i + 1))}>
              {last ? "Begin Sol 1" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
