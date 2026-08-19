"use client";

import { useEffect, useState } from "react";

/**
 * Starts false so the prerendered HTML and the first client frame agree, then corrects on mount.
 * Structural swaps (side pane vs bottom sheet) key off this; everything else uses Tailwind classes.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

/** Below Tailwind's `md`: the collapsed phone layout (pos-spec §1). */
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
