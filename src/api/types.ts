import type {
  AdjustReason,
  BranchInfo,
  BusinessSettings,
  BusinessType,
  OrderType,
  PaymentMethod,
} from "@/domain/types";
import type { CartLine, DiscountSpec, ScPwdInfo } from "@/domain/cart";
import type { CartTotals } from "@/domain/totals";

export interface OwnerSession { token: string; email: string; ownerName: string }
export interface OperatorIdentity {
  userId: string;
  name: string;
  role: "owner" | "manager" | "cashier";
}
export interface OperatorRosterEntry extends OperatorIdentity { requiresSetup: boolean }
export interface OperatorUnlock {
  operator: OperatorIdentity;
  token: string;
  expiresAt: string;
}
export interface ActionApproval { approverUserId: string; pin: string }
export interface EmergencyCloseInput { countedCashC: number; reason: string; approval: ActionApproval }
export interface OperatorActivity {
  sales: Array<{ id: string; receiptNo: string; createdAt: string; status: SaleStatus; totalC: number; operatorUserId: string | null }>;
  shifts: Array<{ id: string; openedAt: string; closedAt: string | null; operatorUserId: string | null; overShortC: number | null }>;
}
export interface BusinessSummary { id: string; name: string; type: BusinessType; isDemo: boolean }
export interface PairingResult {
  deviceToken: string;
  business: BusinessSettings;
  branch: BranchInfo;
  terminalName: string;
  terminalCode: string;       // "T1", "T2", … assigned per branch, never reused
  receiptSeq: number;         // starting sequence for this terminal code (mock: 1; mirrors terminals.receipt_seq)
}

// id = client uuid — sale_payments is an append-only up-sync row (project-spec §5.2), so its id is
// client-generated from day one
export interface SalePayment {
  id: string;
  method: PaymentMethod;
  referenceNo: string | null;
  amountC: number;
  tenderedC: number;
  changeC: number;
}

export interface SaleDraft {
  id: string;                 // client uuid
  receiptNo: string;          // terminal-assigned
  shiftId: string;
  operatorUserId?: string | null;
  orderType: OrderType;
  lines: CartLine[];
  orderDiscount: DiscountSpec | null;
  scPwd: ScPwdInfo | null;
  totals: CartTotals;
  payment: SalePayment;
  createdAtDevice: string;
}

export type SaleStatus = "completed" | "voided" | "refunded";

export interface CompletedSale extends SaleDraft {
  status: SaleStatus;
  statusReason: string | null;
  createdAt: string;          // server-side (mock) clock
  voidedAt: string | null;
  refundedAt: string | null;
  refundShiftId: string | null; // open shift whose cash the refund hit; null = outside shift
  statusRequestedByUserId?: string | null;
  statusApprovedByUserId?: string | null;
}

export interface SaleSummary {
  id: string; receiptNo: string; createdAt: string; lineCount: number;
  orderType: OrderType; method: PaymentMethod; referenceNo: string | null;
  status: SaleStatus; statusReason: string | null; totalC: number; scPwd: boolean;
}

export interface CashMovement { id: string; type: "in" | "out"; amountC: number; reason: string; at: string; operatorUserId?: string | null }
export interface Shift { id: string; openedAt: string; closedAt: string | null; openingCashC: number | null; cashMovements: CashMovement[]; operatorUserId?: string | null; closedByUserId?: string | null; emergencyCloseReason?: string | null }

export interface ShiftTotals {
  grossC: number; saleCount: number;
  byMethod: Record<PaymentMethod, number>;
  voidCount: number; voidAmountC: number;
  refundCount: number; refundAmountC: number;
  scPwdDiscountC: number; serviceChargeC: number;
  cashSalesC: number; cashRefundsC: number; cashInC: number; cashOutC: number;
  expectedCashC: number;      // opening + cashSales − cashRefunds + cashIn − cashOut
}

export interface ZReport extends ShiftTotals {
  shiftId: string; openedAt: string; closedAt: string;
  openingCashC: number; countedCashC: number; overShortC: number;
  branchCode: string; terminalCode: string;
  operatorUserId?: string | null; closedByUserId?: string | null; emergencyCloseReason?: string | null;
}

export type LiveShiftTotals = (ShiftTotals & { blindCloseEnabled?: false }) | (
  Omit<ShiftTotals, 'byMethod' | 'cashSalesC' | 'cashRefundsC' | 'cashInC' | 'cashOutC' | 'expectedCashC'> & {
    blindCloseEnabled: true;
    byMethod: Omit<Record<PaymentMethod, number>, 'cash'> & { cash: null };
    cashSalesC: null; cashRefundsC: null; cashInC: null; cashOutC: null; expectedCashC: null;
  }
);

export interface StockAdjustInput {
  productId: string;
  variantId: string | null;
  newQty: number;
  reasonCategory: AdjustReason;
  note: string | null;
  approval?: ActionApproval;
}
