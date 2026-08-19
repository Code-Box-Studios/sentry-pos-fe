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
}

export interface SaleSummary {
  id: string; receiptNo: string; createdAt: string; lineCount: number;
  orderType: OrderType; method: PaymentMethod; referenceNo: string | null;
  status: SaleStatus; statusReason: string | null; totalC: number; scPwd: boolean;
}

export interface CashMovement { id: string; type: "in" | "out"; amountC: number; reason: string; at: string }
export interface Shift { id: string; openedAt: string; closedAt: string | null; openingCashC: number; cashMovements: CashMovement[] }

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
}

export interface StockAdjustInput {
  productId: string;
  variantId: string | null;
  newQty: number;
  reasonCategory: AdjustReason;
  note: string | null;
}
