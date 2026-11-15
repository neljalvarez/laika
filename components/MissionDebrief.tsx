"use client";

import { getLaikaLine } from "@/data/dialogue";
import { MODULES } from "@/data/modules";
import { bestDecision, engineeringLesson, whatToImprove } from "@/game/debrief";
import { computeScore, ENDING_RULES, ENDING_TEXT, gradeFor } from "@/game/scoring";
import { difficultyOf } from "@/game/difficulty";
import { MODULE_IDS, type MissionState } from "@/game/types";
import { LaikaSprite } from "./LaikaSprite";
import { earnedGear } from "./pixel/sprites";
import { MissionLogList } from "./MissionLog";

interface Props {
  state: MissionState;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function MissionDebrief({ state, onPlayAgain, onMenu }: Props) {
  const score = computeScore(state);
  const tier = state.status === "outstanding" || state.status === "success" || state.status === "partial" ? state.status : "failure";
  const ending = ENDING_TEXT[tier];
  const laika = getLaikaLine(state);
  const solsDone = state.history.length;
  const best = bestDecision(state);
  const improve = whatToImprove(state, score);
  const lesson = engineeringLesson(state);
  const success = state.status === "success" || state.status === "outstanding";
  const gear = earnedGear(state.sol, success);
  const missionsOffered = Math.max(1, Math.min(state.sol, state.maxSols));

  return (
    <main className="mx-auto max-w-[1100px] space-y-3 p-3">
      <section className="panel">
        <div className="panel-title">
          <span>Mission Debrief</span>
          <span className={`tag ${tier === "failure" ? "tag-bad" : tier === "partial" ? "tag-warn" : "tag-ok"}`} style={{ color: tier === "failure" ? "#fff" : "#2a1a22" }}>
            {solsDone}/{state.maxSols} sols
          </span>
        </div>
        <div className="flex flex-col items-center gap-4 p-4 sm:flex-row">
          <div className="border-[3px] border-ink bg-slate p-2">
            <LaikaSprite mood={laika.mood} scale={5} motion={laika.mood === "celebrate" ? "laika-hop-brief" : undefined} gear={gear} />
          </div>
          <div className="flex-1">
            <h1 className="h-pixel text-[26px] leading-tight">{ending.title}</h1>
            <p>{ending.body}</p>
            {state.failureReason && (
              <p className="mt-2 border-[3px] border-ink bg-white p-2 text-[14px]" role="status">
                <strong>Why the mission ended:</strong> {state.failureReason}
              </p>
            )}
            <p className="mt-2 text-[14px]">
              <strong>Laika:</strong> “{laika.text}”
            </p>
          </div>
          <div className="panel-dark px-5 py-3 text-center">
            <div className="text-[12px] font-extrabold uppercase tracking-wide">Total score</div>
            <div className="text-[40px] font-extrabold leading-none tabular-nums" data-testid="total-score">
              {score.total}
            </div>
            <div className="text-[14px] font-extrabold">out of 100</div>
            <div className="text-[18px] font-extrabold text-gold" data-testid="debrief-grade">
              Grade {gradeFor(score.total)}
            </div>
            <div className="mt-1 text-[11px] font-extrabold uppercase" data-testid="debrief-difficulty">
              {difficultyOf(state).label} mode
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-title">Score breakdown</div>
          <ul className="space-y-2 p-3">
            {score.categories.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2 text-[14px] font-extrabold uppercase">
                  <span>{c.label}</span>
                  <span className="tabular-nums">
                    {c.score} / {c.max}
                  </span>
                </div>
                <div className="h-[12px] border-[2px] border-ink bg-white" aria-hidden="true">
                  <div style={{ width: `${(c.score / c.max) * 100}%`, height: "100%", background: "#2f6fd0" }} />
                </div>
                <div className="text-[12px]">{c.explanation}</div>
              </li>
            ))}
          </ul>
          <p className="border-t-[3px] border-ink p-3 text-[12px]">
            {score.progress < 1
              ? `The mission ended after ${solsDone} of ${state.maxSols} sols, so every category is scaled by ${solsDone}/${state.maxSols}. `
              : ""}
            Played on {difficultyOf(state).label} ({difficultyOf(state).title}). Scores from different difficulties are not directly
            comparable. Outstanding needs {ENDING_RULES.outstanding.score}+ points, life support {ENDING_RULES.outstanding.lifeSupport}+, radiation
            hazard under {ENDING_RULES.outstanding.radiationBelow}, every module at {ENDING_RULES.outstanding.minCondition}%+ condition and no
            shortages. Success needs {ENDING_RULES.success.score}+ points, life support {ENDING_RULES.success.lifeSupport}+ and radiation
            hazard under {ENDING_RULES.success.radiationBelow}.
          </p>
        </section>

        <section className="panel">
          <div className="panel-title">What you learned</div>
          <div className="space-y-2 p-3 text-[14px]" data-testid="debrief-learning">
            <div className="border-[3px] border-ink bg-white p-2">
              <div className="h-pixel text-[12px]">
                <span className="tag tag-ok">★</span> Your best decision
              </div>
              {best ? (
                <>
                  <p className="font-bold">{best.title}</p>
                  {best.text && <p className="text-[13px]">{best.text}</p>}
                </>
              ) : (
                <p className="text-[13px]">No single decision stood out. Try making a big choice early next time.</p>
              )}
            </div>
            <div className="border-[3px] border-ink bg-white p-2">
              <div className="h-pixel text-[12px]">
                <span className="tag tag-warn">▲</span> What to improve
              </div>
              {improve ? (
                <>
                  <p className="font-bold">{improve.title}</p>
                  <p className="text-[13px]">{improve.text}</p>
                </>
              ) : (
                <p className="text-[13px]">Every area scored well. Try a different build order and compare!</p>
              )}
            </div>
            <div className="border-[3px] border-ink bg-white p-2">
              <div className="h-pixel text-[12px]">
                <span className="tag" style={{ background: "#6fb1f5" }}>💡</span> Engineering lesson: {lesson.title}
              </div>
              <p className="text-[13px]">{lesson.text}</p>
            </div>
            <p className="text-[13px]">
              <strong>Daily missions:</strong> {state.missionsDone.length} of {missionsOffered} completed ·{" "}
              <strong>Insights found:</strong> {state.insights.length} · <strong>Gears:</strong> {state.gears}
            </p>
            {gear.length > 0 && (
              <p className="text-[13px]" data-testid="debrief-gear">
                <strong>Laika&apos;s outfit:</strong> {gear.map((g) => g.name).join(", ")}
              </p>
            )}
          </div>
          <div className="panel-title" style={{ borderTop: "3px solid #2a1a22" }}>
            Final outpost
          </div>
          <table className="report m-3" style={{ width: "calc(100% - 24px)", fontSize: 13 }}>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Level</th>
                <th scope="col">Condition</th>
              </tr>
            </thead>
            <tbody>
              {MODULE_IDS.map((id) => (
                <tr key={id}>
                  <td>{MODULES[id].name}</td>
                  <td>{state.modules[id].level}/3</td>
                  <td>{Math.round(state.modules[id].condition)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-title">Major decisions</div>
          <div className="p-3">
            {state.decisions.length === 0 ? (
              <p className="text-[14px]">No emergency decisions were needed.</p>
            ) : (
              <ol className="space-y-1 text-[13px]">
                {state.decisions.map((d, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 border-[2px] border-ink bg-white p-1">
                    <span className="tag" style={{ background: "#27334C", color: "#FFF1D0" }}>
                      Sol {d.sol}
                    </span>
                    <span>
                      {d.eventTitle}: <strong>{d.choiceLabel}</strong>
                    </span>
                    <span className={`tag ${d.quality >= 0.8 ? "tag-ok" : d.quality >= 0.5 ? "tag-warn" : "tag-bad"}`}>
                      {d.quality >= 0.8 ? "Strong fix" : d.quality >= 0.5 ? "Workaround" : "Risky"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Sol by sol</div>
          <details className="p-3 pb-0 text-[13px]">
            <summary className="cursor-pointer font-bold">Show every sol</summary>
          <div className="scroll-y pb-3" style={{ maxHeight: 300 }} tabIndex={0} aria-label="Sol by sol resource table">
            <table className="report" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th scope="col">Sol</th>
                  <th scope="col">Power</th>
                  <th scope="col">Life</th>
                  <th scope="col">Food</th>
                  <th scope="col">Rad</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {state.history.map((h) => (
                  <tr key={h.sol}>
                    <td>{h.sol}</td>
                    <td>{h.resources.power}</td>
                    <td>{h.resources.lifeSupport}</td>
                    <td>{h.resources.food}</td>
                    <td>{h.resources.radiation}</td>
                    <td style={{ textAlign: "left" }}>
                      {[h.powerShortage ? "Power shortage" : "", h.foodShortage ? "Food shortage" : ""].filter(Boolean).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">Full mission log</div>
        <details className="p-3 text-[13px]">
          <summary className="cursor-pointer font-bold">Show the full log</summary>
          <MissionLogList log={state.log} maxHeight={260} compact />
        </details>
      </section>

      <div className="flex flex-wrap justify-center gap-3 pb-6">
        <button type="button" className="btn btn-go" onClick={onPlayAgain}>
          Play Again (same difficulty)
        </button>
        <button type="button" className="btn btn-gray" onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </main>
  );
}
