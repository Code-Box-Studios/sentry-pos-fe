"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";

/** Selling requires an open shift, so these two routes are gated behind one (pos-spec §8). */
const NEEDS_SHIFT = ["/sale", "/payment"];

/**
 * One terminal, one branch: an unpaired device can only reach /pair, and a paired one never sees it
 * again (pos-spec §3).
 */
export function TerminalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = usePairingStore((s) => s.status);
  const hydrated = usePairingStore((s) => s.hydrated);
  const refresh = useCatalogStore((s) => s.refresh);
  const loadShift = useShiftStore((s) => s.load);
  const shift = useShiftStore((s) => s.shift);
  const shiftHydrated = useShiftStore((s) => s.hydrated);
  const bootedFor = useRef<string | null>(null);
  const clearedCartFor = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (status === "unpaired") {
      // Whatever cleared the pairing — Settings' unpair, or a portal remote-unpair 401 caught in the
      // catalog store — leaves the cart behind. No sale should survive into the next pairing.
      if (!clearedCartFor.current) {
        clearedCartFor.current = true;
        useCartStore.getState().resetAll();
      }
      if (pathname !== "/pair") router.replace("/pair");
      return;
    }
    clearedCartFor.current = false;
    if (pathname === "/pair" || pathname === "/") {
      router.replace("/sale");
      return;
    }
    // Wait for the first getCurrentShift before bouncing anyone around.
    if (!shiftHydrated) return;
    if (!shift && NEEDS_SHIFT.includes(pathname)) router.replace("/shift-open");
    else if (shift && pathname === "/shift-open") router.replace("/sale");
  }, [hydrated, status, pathname, router, shift, shiftHydrated]);

  useEffect(() => {
    if (!hydrated || status !== "paired") return;
    const token = usePairingStore.getState().deviceToken;
    if (!token || bootedFor.current === token) return;
    bootedFor.current = token;
    void refresh();
    void loadShift();
  }, [hydrated, status, refresh, loadShift]);

  // One null frame while the persisted pairing rehydrates keeps /pair from flashing.
  if (!hydrated) return null;
  return <>{children}</>;
}
