"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes an open dropdown on Escape or on a pointer press outside `ref`.
 *
 * Listening on `pointerdown` rather than `click` is what makes two dropdowns in
 * the same bar mutually exclusive: pressing the second trigger closes the first
 * before its own click handler opens it, so only one panel is ever on screen.
 */
export function useDismissable(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, ref, close]);
}
