import { create } from "zustand";
import { getApi } from "@/api";
import { UnauthorizedError } from "@/api/errors";
import type { CatalogPayload, StockLevel } from "@/domain/types";
import { usePairingStore } from "./pairing";
import { useShiftStore } from "./shift";

/**
 * Clears what this store is allowed to reach. It deliberately does NOT import handle-api-error:
 * that module pulls in the cart store, which imports this one, and the cycle wrecks module
 * evaluation. TerminalGate finishes the job (cart included) when it sees the terminal go unpaired.
 */
function clearTerminal(): void {
  usePairingStore.getState().unpair();
  useShiftStore.getState().reset();
}

export function stockKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? ""}`;
}

function toStockMap(levels: StockLevel[]): Map<string, number> {
  return new Map(levels.map((l) => [stockKey(l.productId, l.variantId), l.qty]));
}

interface CatalogState {
  catalog: CatalogPayload | null;
  /** Local mirror of branch stock, keyed `${productId}:${variantId ?? ""}`. */
  stock: Map<string, number>;
  refresh(): Promise<void>;
  refreshStock(): Promise<void>;
  /** null = the product is not stock-tracked, so nothing constrains the sale. */
  availableQty(productId: string, variantId: string | null): number | null;
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  catalog: null,
  stock: new Map(),
  refresh: async () => {
    try {
      const catalog = await getApi().pullCatalog();
      set({ catalog, stock: toStockMap(catalog.stock) });
    } catch (e) {
      // A remote unpair 401s the next call; state only — TerminalGate handles the redirect.
      if (e instanceof UnauthorizedError) clearTerminal();
      else throw e;
    }
  },
  refreshStock: async () => {
    try {
      set({ stock: toStockMap(await getApi().getStockLevels()) });
    } catch (e) {
      // State only — TerminalGate handles the redirect once the pairing is gone.
      if (e instanceof UnauthorizedError) clearTerminal();
      else throw e;
    }
  },
  availableQty: (productId, variantId) => {
    const { stock } = get();
    const exact = stock.get(stockKey(productId, variantId));
    if (exact !== undefined) return exact;
    if (variantId !== null) {
      const atProduct = stock.get(stockKey(productId, null));
      if (atProduct !== undefined) return atProduct;
    }
    return null;
  },
}));
