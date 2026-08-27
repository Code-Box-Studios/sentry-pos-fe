import { toast } from "sonner";
import { NetworkError, UnauthorizedError } from "@/api/errors";
import { useCartStore } from "@/state/cart";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";

/**
 * The one full-reset choke point. Used by unpair and by the remote-unpair 401 so a device can never
 * be left half-paired (project-spec §8).
 */
export function resetTerminalState(): void {
  usePairingStore.getState().unpair();
  useCartStore.getState().resetAll();
  useShiftStore.getState().reset();
}

interface RouterLike {
  replace(href: string): void;
}

/**
 * Turns API failures into the terminal's two standing reactions: a revoked device resets to pairing,
 * and a dead network says so. Anything else is a real bug and rethrows.
 */
export function handleApiError(e: unknown, router?: RouterLike): void {
  if (e instanceof UnauthorizedError) {
    resetTerminalState();
    router?.replace("/pair");
    return;
  }
  if (e instanceof NetworkError) {
    toast.error("Offline — no network, no selling until the offline milestone");
    return;
  }
  throw e;
}
