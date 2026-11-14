"use client";

import type { Dispatch } from "react";
import { EVENTS } from "@/data/events";
import { canAfford } from "@/game/events";
import type { EventChoice, GameAction, MissionState } from "@/game/types";
import { Modal } from "./Modal";
import { PixelSprite } from "./pixel/PixelSprite";
import { ICONS } from "./pixel/sprites";

function costTags(choice: EventChoice): string[] {
  const c = choice.cost;
  const tags: string[] = [];
  if (c.materials) tags.push(`−${c.materials} materials`);
  if (c.power) tags.push(`−${c.power} power`);
  if (c.lifeSupport) tags.push(`−${c.lifeSupport} life support`);
  if (c.food) tags.push(`−${c.food} food`);
  if (choice.gain) {
    for (const [k, v] of Object.entries(choice.gain)) tags.push(`+${v} ${k === "lifeSupport" ? "life support" : k}`);
  }
  return tags.length > 0 ? tags : ["Free"];
}

export function MissionEventModal({ state, dispatch }: { state: MissionState; dispatch: Dispatch<GameAction> }) {
  if (!state.pendingEvent) return null;
  const event = EVENTS[state.pendingEvent];
  return (
    <Modal title={`Sol ${state.sol} — Mission Control Alert`} maxWidth={900} tone={event.id === "resupply" ? "normal" : "alert"}>
      <div className="mb-3 flex items-start gap-3">
        <div className="border-[3px] border-ink bg-navy p-1">
          <PixelSprite grid={ICONS[event.icon]} scale={5} />
        </div>
        <div>
          <h2 className="h-pixel text-[18px]">{event.title}</h2>
          <p>{event.description}</p>
          <p className="mt-1 text-[13px] font-bold">You must choose before the sol can continue.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {event.choices.map((choice, i) => {
          const afford = canAfford(state, choice);
          return (
            <div key={choice.id} className="flex flex-col border-[3px] border-ink bg-white p-2">
              <h3 className="h-pixel text-[14px]">
                {String.fromCharCode(65 + i)}. {choice.label}
              </h3>
              <p className="text-[13px]">{choice.description}</p>
              <div className="my-1 flex flex-wrap gap-1">
                {costTags(choice).map((t) => (
                  <span key={t} className={`tag ${t.startsWith("−") ? "tag-warn" : "tag-ok"}`}>
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[13px]">
                <strong>Now:</strong> {choice.nearTerm}
              </p>
              <p className="mb-2 text-[13px]">
                <strong>Later:</strong> {choice.future}
              </p>
              <div className="mt-auto">
                {!afford.ok && (
                  <p className="mb-1 text-[12px] font-bold" role="note">
                    Not available: {afford.reason}
                  </p>
                )}
                <button
                  type="button"
                  className="btn w-full"
                  disabled={!afford.ok}
                  data-autofocus={i === 0 ? true : undefined}
                  onClick={() => dispatch({ type: "RESOLVE_EVENT", choiceId: choice.id })}
                >
                  Choose {String.fromCharCode(65 + i)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function EventOutcomeModal({ state, dispatch }: { state: MissionState; dispatch: Dispatch<GameAction> }) {
  const o = state.eventOutcome;
  if (!o) return null;
  const close = () => dispatch({ type: "DISMISS_OUTCOME" });
  return (
    <Modal
      title="Decision Result"
      maxWidth={560}
      onClose={close}
      footer={
        <button type="button" className="btn btn-go" onClick={close} data-autofocus>
          Continue
        </button>
      }
    >
      <h2 className="h-pixel text-[16px]">{o.eventTitle}</h2>
      <p>
        You chose: <strong>{o.choiceLabel}</strong>
      </p>
      <div className="mt-2 font-extrabold uppercase">What changed</div>
      <ul className="list-disc pl-5 text-[14px]">
        {o.changes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="mt-2 border-[3px] border-ink bg-white p-2">
        <div className="font-extrabold uppercase">Why it works this way</div>
        <p className="text-[14px]">{o.science}</p>
      </div>
    </Modal>
  );
}
