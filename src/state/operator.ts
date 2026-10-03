import { create } from "zustand";
import type { OperatorIdentity, OperatorUnlock } from "@/api/types";

interface OperatorState {
  token: string | null;
  operator: OperatorIdentity | null;
  expiresAt: string | null;
  lastActionAt: number | null;
  unlock(result: OperatorUnlock): void;
  lock(): void;
  touch(): void;
}

/** Intentionally not persisted: reload requires a fresh human PIN unlock. */
export const useOperatorStore = create<OperatorState>((set) => ({
  token: null,
  operator: null,
  expiresAt: null,
  lastActionAt: null,
  unlock: (result) => set({
    token: result.token,
    operator: result.operator,
    expiresAt: result.expiresAt,
    lastActionAt: Date.now(),
  }),
  lock: () => set({ token: null, operator: null, expiresAt: null, lastActionAt: null }),
  touch: () => set((state) => state.token ? { lastActionAt: Date.now() } : {}),
}));
