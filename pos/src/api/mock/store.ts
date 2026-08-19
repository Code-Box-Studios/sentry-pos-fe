import type { AdjustReason, StockLevel } from "@/domain/types";
import type { CompletedSale, Shift } from "../types";
import { makeSeedCatalog } from "./seed";

export interface MockAdjustment {
  id: string;
  productId: string;
  variantId: string | null;
  qtyDelta: number;
  reasonCategory: AdjustReason;
  note: string | null;
  at: string;
}

export interface MockState {
  pairedBusinessId: string | null;
  pairedBranchId: string | null;
  terminalName: string;
  terminalCode: string;
  /** Never reset by unpair — a re-paired device gets T2, T3, … so receipt series cannot collide. */
  terminalPairCount: number;
  deviceRevoked: boolean;
  stock: StockLevel[];
  sales: CompletedSale[];
  shifts: Shift[];
  adjustments: MockAdjustment[];
  pinFailCount: number;
  pinLockedUntil: string | null;
}

const KEY = "sentry-pos:mock:v1";

export function freshMockState(): MockState {
  return {
    pairedBusinessId: null,
    pairedBranchId: null,
    terminalName: "",
    terminalCode: "",
    terminalPairCount: 0,
    deviceRevoked: false,
    stock: makeSeedCatalog().stock,
    sales: [],
    shifts: [],
    adjustments: [],
    pinFailCount: 0,
    pinLockedUntil: null,
  };
}

export function loadMockState(): MockState {
  if (typeof localStorage === "undefined") return freshMockState();
  const raw = localStorage.getItem(KEY);
  if (!raw) return freshMockState();
  try {
    return { ...freshMockState(), ...(JSON.parse(raw) as Partial<MockState>) };
  } catch {
    return freshMockState();
  }
}

export function saveMockState(s: MockState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetMockState(): void {
  saveMockState(freshMockState());
}
