import { create } from "zustand";
import type { CompletedSale } from "@/api/types";

interface LastSaleState {
  sale: CompletedSale | null;
  set(sale: CompletedSale | null): void;
}

/** Carries the just-completed sale to the receipt screen. Deliberately not persisted. */
export const useLastSaleStore = create<LastSaleState>()((set) => ({
  sale: null,
  set: (sale) => set({ sale }),
}));
