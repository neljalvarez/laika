"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  /** When provided, Escape and the Close button call it. Mandatory dialogs omit it. */
  onClose?: () => void;
  maxWidth?: number;
  footer?: ReactNode;
  /** "alert" adds hazard stripes under the title for emergencies. */
  tone?: "normal" | "alert";
  /** Set false for dialogs a stray click must not dismiss (reports). */
  backdropClose?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible pixel-style dialog: focus moves in, Tab is trapped, focus returns on close. */
export function Modal({ title, children, onClose, maxWidth = 720, footer, tone = "normal", backdropClose = true }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    if (node) {
      const first = node.querySelector<HTMLElement>("[data-autofocus]") ?? node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }
    return () => {
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && onClose) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => backdropClose && e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        className="modal panel"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="panel-title">
          <span id={titleId}>{title}</span>
          {onClose && (
            <button type="button" className="btn btn-gray btn-small" onClick={onClose} aria-label={`Close ${title}`}>
              Close ✕
            </button>
          )}
        </div>
        {tone === "alert" && <div className="alert-stripes" aria-hidden="true" />}
        <div className="p-3 sm:p-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t-[3px] border-ink p-3">{footer}</div>}
      </div>
    </div>
  );
}
