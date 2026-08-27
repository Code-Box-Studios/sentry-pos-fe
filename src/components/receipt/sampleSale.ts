import type { CompletedSale } from "@/api/types";
import type { CartLine } from "@/domain/cart";
import { computeTotals } from "@/domain/totals";

const LINES: CartLine[] = [
  {
    id: "sample-1",
    productId: "prod-latte",
    variantId: "var-latte-l",
    name: "Iced Latte — Large",
    soldBy: "unit",
    qty: 1,
    unitPriceC: 14500,
    modifiers: [{ groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 }],
    discount: null,
    scPwdMarked: false,
    trackStock: false,
  },
  {
    id: "sample-2",
    productId: "prod-pandesal",
    variantId: null,
    name: "Pan de sal",
    soldBy: "unit",
    qty: 6,
    unitPriceC: 1200,
    modifiers: [],
    discount: null,
    scPwdMarked: false,
    trackStock: true,
  },
];

const totals = computeTotals(
  { id: "sample-cart", orderType: "takeout", lines: LINES, orderDiscount: null, scPwd: null },
  { taxRate: 0.12, serviceChargeRate: 0.05 }
);

/** Canned sale behind Settings' test print and receipt preview. Real totals, fixed timestamp. */
export const SAMPLE_SALE: CompletedSale = {
  id: "sample-sale",
  receiptNo: "SAMPLE-0000",
  shiftId: "sample-shift",
  orderType: "takeout",
  lines: LINES,
  orderDiscount: null,
  scPwd: null,
  totals,
  payment: {
    id: "sample-payment",
    method: "cash",
    referenceNo: null,
    amountC: totals.totalC,
    tenderedC: 30000,
    changeC: 30000 - totals.totalC,
  },
  createdAtDevice: "2026-08-19T02:42:00.000Z",
  status: "completed",
  statusReason: null,
  createdAt: "2026-08-19T02:42:00.000Z",
  voidedAt: null,
  refundedAt: null,
  refundShiftId: null,
};
