"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  ariaLabel?: string;
  alignmentClassName?: string;
  panelClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared accessible modal wrapper with Escape dismissal, Tab focus trapping,
 * backdrop click handling, and focus restoration to the invoking control.
 */
export function AccessibleDialog({
  open,
  onClose,
  labelledBy,
  ariaLabel,
  alignmentClassName = "items-center justify-center p-4",
  panelClassName = "w-full max-w-lg",
  initialFocusRef,
  children,
}: AccessibleDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const rafId = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current;
      if (target) {
        target.focus();
        return;
      }
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        panelRef.current?.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === panelRef.current || !panelRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panelRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      const previous = previousFocusRef.current;
      if (previous && previous.isConnected) {
        previous.focus();
      }
    };
  }, [open, initialFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm ${alignmentClassName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : labelledBy}
        tabIndex={-1}
        className={`outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
