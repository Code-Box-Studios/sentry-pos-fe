import type { CompletedSale } from "@/api/types";
import { makeSeedCatalog } from "@/api/mock/seed";
import type { Cart, CartLine } from "@/domain/cart";
import { computeTotals } from "@/domain/totals";
import type { BranchInfo, BusinessSettings } from "@/domain/types";

const seed = makeSeedCatalog();
export const FIXTURE_BUSINESS: BusinessSettings = seed.business;
export const FIXTURE_BRANCH: BranchInfo = seed.branch;

const SETTINGS = {
  taxRate: FIXTURE_BUSINESS.taxRate,
  serviceChargeRate: FIXTURE_BUSINESS.serviceChargeRate,
};

function line(partial: Partial<CartLine> & { id: string; name: string; unitPriceC: number; qty: number }): CartLine {
  return {
    productId: "p",
    variantId: null,
    soldBy: "unit",
    modifiers: [],
    discount: null,
    scPwdMarked: true,
    trackStock: false,
    ...partial,
  };
}

/** The design-06 basket, at the spec-correct numbers: subtotal 423.25 → total 432.86. */
export const DESIGN_CART: Cart = {
  id: "cart-design",
  orderType: "dine_in",
  orderDiscount: null,
  scPwd: null,
  lines: [
    line({
      id: "l1",
      name: "Iced Latte — Large",
      unitPriceC: 14500,
      qty: 1,
      modifiers: [{ groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 }],
    }),
    line({ id: "l2", name: "Pan de sal", unitPriceC: 1200, qty: 6 }),
    line({
      id: "l3",
      name: "Ensaymada",
      unitPriceC: 5500,
      qty: 2,
      discount: { source: "named", discountId: "disc-merienda", name: "Merienda 10%", kind: "percent", value: 10 },
    }),
    line({ id: "l4", name: "Jasmine rice", unitPriceC: 9500, qty: 0.75, soldBy: "weight" }),
  ],
};

export function saleFrom(
  cart: Cart,
  over: Partial<CompletedSale> = {},
  tenderedC = 50000
): CompletedSale {
  const totals = computeTotals(cart, SETTINGS);
  return {
    id: "sale-1",
    receiptNo: "MKT-T1-000318",
    shiftId: "shift-1",
    orderType: cart.orderType,
    lines: cart.lines,
    orderDiscount: cart.orderDiscount,
    scPwd: cart.scPwd,
    totals,
    payment: {
      id: "pay-1",
      method: "cash",
      referenceNo: null,
      amountC: totals.totalC,
      tenderedC,
      changeC: Math.max(0, tenderedC - totals.totalC),
    },
    createdAtDevice: "2026-08-19T02:42:00.000Z",
    status: "completed",
    statusReason: null,
    createdAt: "2026-08-19T02:42:00.000Z",
    voidedAt: null,
    refundedAt: null,
    refundShiftId: null,
    ...over,
  };
}

export const DESIGN_SALE: CompletedSale = saleFrom(DESIGN_CART);
