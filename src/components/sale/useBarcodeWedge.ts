"use client";

import { useEffect, useRef } from "react";
import { createWedgeBuffer } from "@/lib/barcode";

/**
 * Global scan capture — no field focus needed (pos-spec §4). Muted while a dialog is open so keys
 * typed into a modal never become a scan.
 */
export function useBarcodeWedge(onScan: (code: string) => void, enabled = true): void {
  const latest = useRef(onScan);
  latest.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    const buffer = createWedgeBuffer({ onScan: (code) => latest.current(code) });

    function handleKeyDown(e: KeyboardEvent) {
      if (document.querySelector('[role="dialog"]')) {
        buffer.reset();
        return;
      }
      buffer.feed(e.key, e.timeStamp);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
