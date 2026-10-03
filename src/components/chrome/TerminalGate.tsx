"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";
import { useOperatorStore } from "@/state/operator";
import { getApi } from "@/api";
import { handleApiError } from "@/lib/handle-api-error";

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
  const pending = useCartStore(s => s.pendingDraft);
  const hydrated = usePairingStore((s) => s.hydrated);
  const refresh = useCatalogStore((s) => s.refresh);
  const loadShift = useShiftStore((s) => s.load);
  const shift = useShiftStore((s) => s.shift);
  const shiftHydrated = useShiftStore((s) => s.hydrated);
  const operator = useOperatorStore((s) => s.operator);
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
    if (!operator || (shift?.operatorUserId !== undefined && shift.operatorUserId !== operator.userId) || (pending?.operatorUserId !== undefined && pending.operatorUserId !== operator.userId)) {
      if (operator) {
        void getApi().lockOperator().catch(() => {});
        useOperatorStore.getState().lock();
      }
      if (pathname !== "/unlock") router.replace("/unlock");
      return;
    }
    if (pending) {
      if (pathname !== "/payment") router.replace("/payment");
      return;
    }
    // Wait for the first getCurrentShift before bouncing anyone around.
    if (!shiftHydrated) return;
    if (pathname === "/pair" || pathname === "/" || pathname === "/unlock") {
      // Land where the terminal is actually going. Sending everyone to /sale and bouncing whoever
      // has no open shift straight back out costs a second route transition, and on a freshly
      // paired device it means staring at a catalogue you cannot sell from yet.
      router.replace(shift ? "/sale" : "/shift-open");
      return;
    }
    if (!shift && NEEDS_SHIFT.includes(pathname)) router.replace("/shift-open");
    else if (shift && pathname === "/shift-open") router.replace("/sale");
  }, [hydrated, status, pathname, router, shift, shiftHydrated, pending, operator]);

  useEffect(() => {
    if (!hydrated || status !== "paired") return;
    const token = usePairingStore.getState().deviceToken;
    if (!token || bootedFor.current === token) return;
    bootedFor.current = token;
    void refresh();
    void loadShift().catch((error) => { try { handleApiError(error, router); } catch { /* Roster remains available for a retry. */ } });
  }, [hydrated, status, refresh, loadShift, router]);

  useEffect(() => {
    if (status !== "paired" || !operator) return;
    let lastHeartbeat = Date.now();
    let heartbeating = false;
    const check = () => {
      const state = useOperatorStore.getState();
      if (!state.token) return;
      if (state.lastActionAt === null || Date.now() - state.lastActionAt >= 5 * 60000 || !state.expiresAt || !Number.isFinite(Date.parse(state.expiresAt)) || Date.parse(state.expiresAt) <= Date.now()) {
        // Revoke while the header still exists, then clear memory immediately.
        void getApi().lockOperator().catch(() => {});
        state.lock();
      }
    };
    const onAction = () => {
      check();
      if (!useOperatorStore.getState().token) return;
      useOperatorStore.getState().touch();
      // Only human events extend server idle time; background catalog polls do not.
      if (!heartbeating && Date.now() - lastHeartbeat >= 30000) {
        lastHeartbeat = Date.now(); heartbeating = true;
        void getApi().currentOperator().catch((error) => { try { handleApiError(error, router); } catch { /* Connectivity can recover on the next action. */ } }).finally(() => { heartbeating = false; });
      }
    };
    const timer = setInterval(check, 1000);
    window.addEventListener("pointerdown", onAction);
    window.addEventListener("keydown", onAction);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", onAction);
      window.removeEventListener("keydown", onAction);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [status, operator, router]);

  useEffect(() => {
    if (!hydrated || status !== "paired") return;
    let inFlight = false;
    const renew = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        // Signed business logos expire after one hour. Refresh only catalog snapshots;
        // the cart keeps its locked prices and pending payments keep their original totals.
        await refresh();
      } catch {
        // Connectivity can recover on the next timer or focus event.
      } finally {
        inFlight = false;
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void renew(); };
    const onFocus = () => { void renew(); };
    const timer = setInterval(onFocus, 30 * 60 * 1000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated, status, refresh]);

  // One null frame while the persisted pairing rehydrates keeps /pair from flashing.
  if (!hydrated || (status === "paired" && operator && pending && pathname !== "/payment")) return null;
  if (status === "paired" && !operator && pathname !== "/unlock") return null;
  if (operator && ((shift?.operatorUserId !== undefined && shift.operatorUserId !== operator.userId) || (pending?.operatorUserId !== undefined && pending.operatorUserId !== operator.userId))) return null;
  return <>{children}</>;
}
