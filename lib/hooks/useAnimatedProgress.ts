"use client";

import { useEffect, useRef, useState } from "react";

const SETTLE_EASING = (t: number) => 1 - Math.pow(1 - t, 3);

export function useAnimatedProgress(target: number, durationMs = 800) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = progress;
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current == null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = SETTLE_EASING(t);
      const next =
        fromRef.current + (target - fromRef.current) * eased;
      setProgress(next);

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from current progress to new target
  }, [target, durationMs]);

  return Math.round(progress);
}
