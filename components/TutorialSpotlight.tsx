"use client";

// Tutorial spotlight: dims everything except the current target, which stays
// fully interactive. The hole follows the real element every frame, so it
// survives resizes, scrolling, tab changes and layout shifts.
import { useEffect, useRef, useState, type ReactNode } from "react";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PAD = 6;
const GAP = 16;
const DIM = "rgba(20, 28, 50, 0.64)";

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Put the dialogue next to the target, wherever it covers the target least. */
function placeCard(target: Box | null, cw: number, ch: number, vw: number, vh: number): { left: number; top: number } {
  const clampX = (x: number) => Math.max(8, Math.min(x, vw - cw - 8));
  const clampY = (y: number) => Math.max(8, Math.min(y, vh - ch - 8));
  if (!target) return { left: clampX((vw - cw) / 2), top: clampY((vh - ch) / 2) };
  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  const options = [
    { left: clampX(cx - cw / 2), top: clampY(target.top + target.height + GAP) },
    { left: clampX(cx - cw / 2), top: clampY(target.top - GAP - ch) },
    { left: clampX(target.left + target.width + GAP), top: clampY(cy - ch / 2) },
    { left: clampX(target.left - GAP - cw), top: clampY(cy - ch / 2) },
  ];
  let best = options[0];
  let bestCover = Infinity;
  for (const o of options) {
    const cover = overlap({ ...o, width: cw, height: ch }, target);
    if (cover < bestCover) {
      best = o;
      bestCover = cover;
    }
  }
  return best;
}

interface Props {
  /** CSS selector of the element to spotlight; null dims the whole screen. */
  target: string | null;
  /** Accessible name for the dialogue. */
  label: string;
  children: ReactNode;
}

export function TutorialSpotlight({ target, label, children }: Props) {
  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState({ w: 1280, h: 720 });
  const [card, setCard] = useState({ w: 360, h: 200 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll the target into view once per target (needed on phones).
  useEffect(() => {
    if (!target) return;
    const el = document.querySelector(target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
  }, [target]);

  // Follow the real element. Only state-changing frames cause a re-render.
  useEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      const el = target ? document.querySelector(target) : null;
      const r = el ? el.getBoundingClientRect() : null;
      const c = cardRef.current?.getBoundingClientRect();
      const next = r && r.width > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
      const key = [next?.left, next?.top, next?.width, next?.height, c?.width, c?.height, window.innerWidth, window.innerHeight]
        .map((n) => (n === undefined ? "x" : Math.round(n)))
        .join(",");
      if (key !== last) {
        last = key;
        setBox(next);
        setView({ w: window.innerWidth, h: window.innerHeight });
        if (c) setCard({ w: c.width, h: c.height });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const hole = box
    ? { left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }
    : null;
  const pos = placeCard(hole, card.w, card.h, view.w, view.h);

  return (
    <div className="spotlight" data-testid="tutorial-spotlight">
      {hole ? (
        <>
          {/* Four dim panels around the hole. They block clicks; the hole does not. */}
          <div className="spotlight-dim" style={{ left: 0, top: 0, width: "100%", height: Math.max(0, hole.top), background: DIM }} />
          <div className="spotlight-dim" style={{ left: 0, top: hole.top + hole.height, width: "100%", bottom: 0, background: DIM }} />
          <div className="spotlight-dim" style={{ left: 0, top: hole.top, width: Math.max(0, hole.left), height: hole.height, background: DIM }} />
          <div className="spotlight-dim" style={{ left: hole.left + hole.width, top: hole.top, right: 0, height: hole.height, background: DIM }} />
          <div className="spotlight-frame" style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }} aria-hidden="true">
            <span className="spotlight-pointer" />
          </div>
        </>
      ) : (
        <div className="spotlight-dim" style={{ inset: 0, background: DIM }} />
      )}
      <div
        ref={cardRef}
        className="spotlight-card panel"
        role="dialog"
        aria-label={label}
        style={{ left: pos.left, top: pos.top }}
      >
        {children}
      </div>
    </div>
  );
}
