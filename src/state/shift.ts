import { create } from "zustand";
import { getApi } from "@/api";
import type { Shift, ZReport } from "@/api/types";

interface ShiftState {
  shift: Shift | null;
  hydrated: boolean;
  load(): Promise<void>;
  open(openingCashC: number): Promise<void>;
  addCashMovement(type: "in" | "out", amountC: number, reason: string): Promise<void>;
  close(countedCashC: number): Promise<ZReport>;
  /** Local clear only — no closeShift call. For unpair and 401 paths. */
  reset(): void;
}

export const useShiftStore = create<ShiftState>()((set) => ({
  shift: null,
  hydrated: false,
  load: async () => {
    try {
      const shift = await getApi().getCurrentShift();
      set({ shift, hydrated: true });
    } catch (e) {
      // TerminalGate waits on `hydrated` to pick a landing route, so this has to settle even when
      // the call fails — otherwise one bad request parks the terminal on a blank screen. Treating
      // "unknown" as "no shift" is the safe way to be wrong: selling needs one, so the worst case
      // is a trip to /shift-open. A 401 from a remote unpair is caught by the catalog refresh that
      // TerminalGate fires alongside this.
      set({ shift: null, hydrated: true });
      throw e;
    }
  },
  open: async (openingCashC) => {
    set({ shift: await getApi().openShift(openingCashC), hydrated: true });
  },
  addCashMovement: async (type, amountC, reason) => {
    await getApi().addCashMovement({ type, amountC, reason });
    set({ shift: await getApi().getCurrentShift() });
  },
  close: async (countedCashC) => {
    const z = await getApi().closeShift(countedCashC);
    set({ shift: null });
    return z;
  },
  reset: () => set({ shift: null, hydrated: false }),
}));
