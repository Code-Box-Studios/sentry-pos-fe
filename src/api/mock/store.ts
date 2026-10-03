import type { AdjustReason, StockLevel } from "@/domain/types";
import type { CompletedSale, OperatorIdentity, Shift } from "../types";
import { makeSeedCatalog } from "./seed";

export interface MockAdjustment {
  id: string;
  productId: string;
  variantId: string | null;
  qtyDelta: number;
  reasonCategory: AdjustReason;
  note: string | null;
  at: string;
  operatorUserId?: string;
  approvedByUserId?: string | null;
}

/** Synthetic development identities only, never production credentials. */
export interface MockStaff extends OperatorIdentity {
  active: boolean;
  branchIds: string[];
  pinHash: string | null;
  temporaryPinHash: string | null;
  temporaryExpiresAt: string | null;
  temporaryAttempts: number;
  pinFailCount: number;
  pinLockedUntil: string | null;
}
export type MockShift = Shift & { branchId?: string; terminalCode?: string; overShortC?: number };

export interface MockState {
  pairedBusinessId: string | null;
  pairedBranchId: string | null;
  terminalName: string;
  terminalCode: string;
  /** Never reset by unpair — a re-paired device gets T2, T3, … so receipt series cannot collide. */
  terminalPairCount: number;
  deviceRevoked: boolean;
  stock: StockLevel[];
  sales: (CompletedSale & { branchId?: string; terminalCode?: string })[];
  shifts: MockShift[];
  staff: MockStaff[];
  blindCloseEnabled: boolean;
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
    staff: [
      { userId: "mock-manager", name: "Ben Santos", role: "manager", active: true, branchIds: ["branch-mkt"], pinHash: "481f6cc0511143ccdd7e2d1b1b94faf0a700a8b49cd13922a70b5ae28acaa8c5", temporaryPinHash: null, temporaryExpiresAt: null, temporaryAttempts: 0, pinFailCount: 0, pinLockedUntil: null },
      { userId: "mock-cashier", name: "Ana Reyes", role: "cashier", active: true, branchIds: ["branch-mkt"], pinHash: null, temporaryPinHash: "e0bc60c82713f64ef8a57c0c40d02ce24fd0141d5cc3086259c19b1e62a62bea", temporaryExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(), temporaryAttempts: 0, pinFailCount: 0, pinLockedUntil: null },
    ],
    blindCloseEnabled: false,
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
