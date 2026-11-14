"use client";

// A small trigger that hides its text until the player hovers, focuses or taps
// it. Works with mouse (hover), keyboard (focus / Enter) and touch (tap to pin).
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  /** What is always visible (an icon, a bar...). */
  trigger: ReactNode;
  /** Accessible name of the trigger (should include the hidden text for screen readers). */
  label: string;
  /** Hidden content. */
  children: ReactNode;
  /** Where the bubble opens relative to the trigger. */
  side?: "below" | "above" | "right";
  className?: string;
  bubbleWidth?: number;
  /** Called the first time the content is shown. */
  onReveal?: () => void;
  testId?: string;
}

export function Reveal({ trigger, label, children, side = "below", className = "", bubbleWidth = 240, onReveal, testId }: Props) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  // Horizontal nudge so the bubble never goes past the screen edge (phones).
  const [shift, setShift] = useState(0);
  const id = useId();
  const open = hover || pinned;

  useEffect(() => {
    if (open) onReveal?.();
  }, [open, onReveal]);

  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const el = bubble.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = r.left - shift;
    const right = r.right - shift;
    const vw = document.documentElement.clientWidth;
    if (right > vw - 8) setShift(vw - 8 - right);
    else if (left < 8) setShift(8 - left);
    else if (shift !== 0) setShift(0);
    // Only re-measure when the bubble opens.
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tap elsewhere or press Escape to close a pinned bubble.
  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setPinned(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [pinned]);

  const pos: React.CSSProperties =
    side === "below"
      ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
      : side === "above"
        ? { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
        : { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };

  return (
    <span
      ref={wrap}
      className={`reveal ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="reveal-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        data-testid={testId}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        onClick={() => setPinned((p) => !p)}
      >
        {trigger}
      </button>
      {open && (
        <span
          ref={bubble}
          id={id}
          role="tooltip"
          className="reveal-bubble panel"
          style={{ ...pos, width: bubbleWidth, maxWidth: "calc(100vw - 16px)", marginLeft: shift }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
