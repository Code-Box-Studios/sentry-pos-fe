"use client";

import { useEffect, useState } from "react";

const FORMAT = new Intl.NumberFormat("en-PH");

/**
 * Counts up to `value` once, shortly after mount.
 *
 * The server renders the final figure, so the number is correct without JS and there is nothing to
 * reconcile at hydration; the effect then rewinds to zero and eases back up. Reduced motion skips
 * the whole thing and leaves the figure as rendered.
 */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const DELAY = 700;
    const DURATION = 1400;
    const start = performance.now();
    let frame = 0;

    setShown(0);

    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start - DELAY) / DURATION));
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{FORMAT.format(shown)}</>;
}
