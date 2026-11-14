"use client";

// Optional hands-on minigames. Which game appears depends on the building the
// player chose to work on. Winning adds a small condition bonus through the
// normal engine action; skipping gives the normal result. Closing cancels.
import { useCallback, useEffect, useRef, useState } from "react";
import { MODULES } from "@/data/modules";
import { CONFIG } from "@/game/config";
import type { ModuleId } from "@/game/types";
import { playSound } from "@/lib/sound";
import { Modal } from "./Modal";

export type MinigameKind = "dust" | "bolts" | "wires";

export function minigameFor(id: ModuleId): MinigameKind {
  if (id === "solar" || id === "greenhouse") return "dust";
  if (id === "habitat" || id === "shelter") return "bolts";
  return "wires";
}

const TITLES: Record<MinigameKind, { title: string; how: string }> = {
  dust: { title: "Sweep the dust!", how: "Tap every dust cloud before time runs out." },
  bolts: { title: "Tighten the bolts!", how: "Press TIGHTEN when the marker is inside the green zone. Get 3 hits." },
  wires: { title: "Match the lights!", how: "Watch the lights, then press them in the same order." },
};

type Result = "playing" | "won" | "lost";

// ---------- Dust: tap 6 clouds in 10 seconds ----------
const DUST_SPOTS: [number, number][] = [
  [12, 22],
  [34, 58],
  [52, 28],
  [70, 64],
  [84, 30],
  [24, 74],
];

function DustGame({ onDone }: { onDone: (won: boolean) => void }) {
  const [left, setLeft] = useState(DUST_SPOTS.map((_, i) => i));
  const [time, setTime] = useState(10);
  useEffect(() => {
    if (left.length === 0) {
      onDone(true);
      return;
    }
    if (time <= 0) {
      onDone(false);
      return;
    }
    const t = window.setTimeout(() => setTime((x) => x - 1), 1000);
    return () => window.clearTimeout(t);
  }, [time, left.length, onDone]);
  return (
    <div>
      <p className="mb-1 text-[13px] font-bold" aria-live="polite">
        Clouds left: {left.length} · Time: {time}s
      </p>
      <div className="minigame-field" style={{ height: 180 }}>
        <div aria-hidden="true" style={{ position: "absolute", left: "8%", right: "8%", top: "30%", height: "40%", background: "#2f6fd0", border: "3px solid #2a1a22" }} />
        {left.map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Dust cloud ${i + 1}`}
            data-testid="dust-spot"
            onClick={() => {
              playSound("click");
              setLeft((l) => l.filter((x) => x !== i));
            }}
            style={{
              position: "absolute",
              left: `${DUST_SPOTS[i][0]}%`,
              top: `${DUST_SPOTS[i][1]}%`,
              width: 34,
              height: 26,
              marginLeft: -17,
              marginTop: -13,
              background: "#D7864E",
              border: "3px solid #542D30",
              boxShadow: "inset -6px -4px 0 #A94F36",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Bolts: timing bar, 3 hits before 3 misses ----------
const ZONE: [number, number] = [40, 60];

function BoltGame({ onDone }: { onDone: (won: boolean) => void }) {
  const [pos, setPos] = useState(0);
  const dir = useRef(1);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  useEffect(() => {
    // Moves in 5% steps (pixel-style, not smooth).
    const t = window.setInterval(() => {
      setPos((p) => {
        let n = p + 5 * dir.current;
        if (n >= 100 || n <= 0) {
          dir.current *= -1;
          n = Math.max(0, Math.min(100, n));
        }
        return n;
      });
    }, 70);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (hits >= 3) onDone(true);
    else if (misses >= 3) onDone(false);
  }, [hits, misses, onDone]);
  const press = () => {
    if (pos >= ZONE[0] && pos <= ZONE[1]) {
      playSound("select");
      setHits((h) => h + 1);
    } else {
      playSound("error");
      setMisses((m) => m + 1);
    }
  };
  return (
    <div>
      <p className="mb-1 text-[13px] font-bold" aria-live="polite">
        Hits: {hits}/3 · Misses: {misses}/3
      </p>
      <div className="minigame-field" style={{ height: 48 }} aria-hidden="true">
        <div style={{ position: "absolute", left: `${ZONE[0]}%`, width: `${ZONE[1] - ZONE[0]}%`, top: 0, bottom: 0, background: "#81C995" }} />
        <div style={{ position: "absolute", left: `calc(${pos}% - 4px)`, width: 8, top: 0, bottom: 0, background: "#FFF1D0", borderLeft: "2px solid #2a1a22", borderRight: "2px solid #2a1a22" }} />
      </div>
      <button type="button" className="btn btn-go mt-2 w-full" onClick={press} data-testid="bolt-press" data-autofocus>
        Tighten!
      </button>
    </div>
  );
}

// ---------- Wires: repeat a 4-light sequence ----------
const LIGHTS = [
  { name: "Red", color: "#ED695B" },
  { name: "Yellow", color: "#F2CA76" },
  { name: "Blue", color: "#5fb7f0" },
];

function sequenceFor(seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < 4; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(s % 3);
  }
  return out;
}

function WireGame({ seed, onDone }: { seed: number; onDone: (won: boolean) => void }) {
  const seq = useRef(sequenceFor(seed)).current;
  const [showing, setShowing] = useState(0); // index of the light being shown; seq.length = done showing
  const [lit, setLit] = useState<number | null>(null);
  const [input, setInput] = useState<number[]>([]);
  useEffect(() => {
    if (showing >= seq.length) {
      setLit(null);
      return;
    }
    setLit(seq[showing]);
    const off = window.setTimeout(() => setLit(null), 450);
    const next = window.setTimeout(() => setShowing((s) => s + 1), 700);
    return () => {
      window.clearTimeout(off);
      window.clearTimeout(next);
    };
  }, [showing, seq]);
  const ready = showing >= seq.length;
  const press = (i: number) => {
    if (!ready) return;
    const next = [...input, i];
    setInput(next);
    if (seq[next.length - 1] !== i) {
      playSound("error");
      onDone(false);
    } else if (next.length === seq.length) {
      onDone(true);
    } else {
      playSound("select");
    }
  };
  return (
    <div>
      <p className="mb-1 text-[13px] font-bold" aria-live="polite">
        {ready ? `Your turn: ${input.length}/${seq.length}` : `Watch: light ${Math.min(showing + 1, seq.length)} of ${seq.length}`}
        {!ready && lit !== null && <span className="sr-only"> {LIGHTS[lit].name}</span>}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {LIGHTS.map((l, i) => (
          <button
            key={l.name}
            type="button"
            className="h-pixel"
            aria-label={`${l.name} light`}
            data-testid="wire-light"
            data-light={i}
            disabled={!ready}
            onClick={() => press(i)}
            style={{
              height: 70,
              border: "3px solid #2a1a22",
              background: lit === i ? l.color : ready ? l.color : "#3f4963",
              filter: lit === i ? "brightness(1.3)" : ready ? "none" : "brightness(0.8)",
              boxShadow: lit === i ? "0 0 0 4px #FFF1D0" : undefined,
              cursor: ready ? "pointer" : "default",
              color: "#2a1a22",
              fontSize: 13,
            }}
          >
            {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  moduleId: ModuleId;
  kind: "upgrade" | "repair";
  /** Used only to vary the light sequence. */
  seed: number;
  /** bonus=true when the game was won. */
  onFinish: (bonus: boolean) => void;
  onCancel: () => void;
}

export function Minigame({ moduleId, kind, seed, onFinish, onCancel }: Props) {
  const game = minigameFor(moduleId);
  const [result, setResult] = useState<Result>("playing");
  const [started, setStarted] = useState(false);
  const done = useCallback(
    (won: boolean) => {
      setResult((r) => {
        if (r !== "playing") return r;
        playSound(won ? "upgrade" : "error");
        return won ? "won" : "lost";
      });
    },
    [],
  );
  const name = MODULES[moduleId].name;
  const verb = kind === "upgrade" ? "upgrade" : "repair";
  return (
    <Modal
      title={`${kind === "upgrade" ? "Upgrade" : "Repair"}: ${name}`}
      maxWidth={520}
      onClose={onCancel}
      backdropClose={false}
      footer={
        result === "playing" ? (
          <button type="button" className="btn btn-gray" onClick={() => onFinish(false)} data-testid="minigame-skip">
            Skip game ({verb} normally)
          </button>
        ) : (
          <button type="button" className="btn btn-go" onClick={() => onFinish(result === "won")} data-autofocus data-testid="minigame-finish">
            Finish {verb}
          </button>
        )
      }
    >
      <div data-testid="minigame" data-game={game}>
        <h2 className="h-pixel text-[16px]">{TITLES[game].title}</h2>
        <p className="mb-2 text-[13px]">
          {TITLES[game].how} Win for <strong>+{CONFIG.minigameBonus} condition</strong>. Skip for the normal result.
        </p>
        {result === "playing" && !started && (
          <button type="button" className="btn w-full" onClick={() => setStarted(true)} data-autofocus data-testid="minigame-start">
            Start
          </button>
        )}
        {result === "playing" && started && game === "dust" && <DustGame onDone={done} />}
        {result === "playing" && started && game === "bolts" && <BoltGame onDone={done} />}
        {result === "playing" && started && game === "wires" && <WireGame seed={seed} onDone={done} />}
        {result !== "playing" && (
          <p
            className="border-[3px] border-ink p-2 text-[15px] font-bold"
            role="status"
            style={{ background: result === "won" ? "#81C995" : "#F2CA76" }}
            data-testid="minigame-result"
          >
            {result === "won"
              ? `Great work! The ${name} gets +${CONFIG.minigameBonus} condition.`
              : `Nice try! The ${verb} still works, just without the bonus.`}
          </p>
        )}
      </div>
    </Modal>
  );
}
