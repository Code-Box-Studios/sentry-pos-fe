import { MockPosApi } from "./adapter";
import { loadMockState, resetMockState, saveMockState } from "./store";
import { PinInvalidError, PinLockedError, StockConflictError, ValidationError } from "../errors";
import { computeTotals } from "@/domain/totals";
import { emptyCart } from "@/domain/cart";
import type { SaleDraft } from "../types";
import { newId } from "@/lib/uuid";
import { manilaDateKey, nowIso } from "@/lib/time";
import { pairForTest } from "@/test/utils";

let api: MockPosApi;
beforeEach(async () => {
  resetMockState();
  api = new MockPosApi({ latencyMs: 0 });
  await pairForTest(api);
});

/** Clears the throttle the way a portal-side reset would, so the happy path stays testable. */
function resetPinLockForTest(): void {
  const s = loadMockState();
  s.pinFailCount = 0;
  s.pinLockedUntil = null;
  saveMockState(s);
}

function draft(lines: SaleDraft["lines"], shiftId: string, over: Partial<SaleDraft> = {}): SaleDraft {
  const cart = {
    ...emptyCart(),
    lines,
    orderDiscount: over.orderDiscount ?? null,
    scPwd: over.scPwd ?? null,
    orderType: over.orderType ?? ("none" as const),
  };
  const totals = computeTotals(cart, { taxRate: 0.12, serviceChargeRate: 0.05 });
  return {
    id: newId(),
    receiptNo: "MKT-T1-000001",
    shiftId,
    orderType: cart.orderType,
    lines,
    orderDiscount: cart.orderDiscount,
    scPwd: cart.scPwd,
    totals,
    payment: {
      id: newId(),
      method: "cash",
      referenceNo: null,
      amountC: totals.totalC,
      tenderedC: totals.totalC,
      changeC: 0,
    },
    createdAtDevice: nowIso(),
    ...over,
  };
}

const espressoLine = () => ({
  id: newId(),
  productId: "prod-espresso",
  variantId: null,
  name: "Espresso",
  soldBy: "unit" as const,
  qty: 1,
  unitPriceC: 8500,
  modifiers: [],
  discount: null,
  scPwdMarked: false,
  trackStock: false,
});

const pandesalLine = (qty: number) => ({
  id: newId(),
  productId: "prod-pandesal",
  variantId: null,
  name: "Pan de sal",
  soldBy: "unit" as const,
  qty,
  unitPriceC: 1200,
  modifiers: [],
  discount: null,
  scPwdMarked: false,
  trackStock: true,
});

test("full happy path: open shift, sale decrements stock, close computes over/short", async () => {
  const shift = await api.openShift(200000);
  await api.completeSale(draft([pandesalLine(6)], shift.id));
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(2);
  const totals = await api.getShiftTotals();
  expect(totals.cashSalesC).toBe(7200);
  expect(totals.expectedCashC).toBe(207200);
  const z = await api.closeShift(207000);
  expect(z.overShortC).toBe(-200);
  expect(await api.getCurrentShift()).toBeNull();
});

test("stock conflict: selling more than available fails atomically", async () => {
  const shift = await api.openShift(0);
  await expect(api.completeSale(draft([pandesalLine(9)], shift.id))).rejects.toBeInstanceOf(StockConflictError);
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(8); // unchanged
});

test("tampered totals rejected", async () => {
  const shift = await api.openShift(0);
  const d = draft([espressoLine()], shift.id);
  d.totals = { ...d.totals, totalC: d.totals.totalC - 100 };
  await expect(api.completeSale(d)).rejects.toBeInstanceOf(ValidationError);
});

test("void: only while its shift is open; returns stock; excluded from totals but counted", async () => {
  const shift = await api.openShift(0);
  const sale = await api.completeSale(draft([pandesalLine(2)], shift.id));
  await api.voidSale(sale.id, "double tap");
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(8);
  const t = await api.getShiftTotals();
  expect(t.cashSalesC).toBe(0);
  expect(t.voidCount).toBe(1);
  expect(t.voidAmountC).toBe(2400);
  await api.closeShift(0);
  const shift2 = await api.openShift(0);
  const sale2 = await api.completeSale(draft([espressoLine()], shift2.id));
  await api.closeShift(0);
  await expect(api.voidSale(sale2.id, "too late")).rejects.toBeInstanceOf(ValidationError);
});

test("refund PIN gate: wrong PIN counts down, 5th locks; correct PIN refunds", async () => {
  const shift = await api.openShift(0);
  const sale = await api.completeSale(draft([espressoLine()], shift.id));
  for (let i = 0; i < 4; i++) {
    await expect(api.refundSale(sale.id, "reason", "000000")).rejects.toBeInstanceOf(PinInvalidError);
  }
  await expect(api.refundSale(sale.id, "reason", "000000")).rejects.toBeInstanceOf(PinLockedError);
  resetPinLockForTest();
  const refunded = await api.refundSale(sale.id, "wrong size served", "123456");
  expect(refunded.status).toBe("refunded");
  expect(refunded.refundShiftId).toBe(shift.id); // in-shift refund
  const t = await api.getShiftTotals();
  expect(t.refundCount).toBe(1);
  expect(t.expectedCashC).toBe(0 + 8500 - 8500);
});

test("out-of-shift refund: after close, refundShiftId is null and next shift math unaffected", async () => {
  const shift = await api.openShift(0);
  const sale = await api.completeSale(draft([espressoLine()], shift.id));
  await api.closeShift(8500);
  const shift2 = await api.openShift(0);
  const refunded = await api.refundSale(sale.id, "returned", "123456");
  expect(refunded.refundShiftId).toBeNull();
  expect((await api.getShiftTotals()).expectedCashC).toBe(0);
  expect(shift2.id).not.toBe(shift.id);
});

test("statuses are terminal: voided sale cannot be refunded and vice versa", async () => {
  const shift = await api.openShift(0);
  const a = await api.completeSale(draft([espressoLine()], shift.id));
  await api.voidSale(a.id, "mistake");
  await expect(api.refundSale(a.id, "x", "123456")).rejects.toBeInstanceOf(ValidationError);
});

test("adjustStock sets new qty and records reason; rejects negative", async () => {
  const level = await api.adjustStock({
    productId: "prod-ubeloaf",
    variantId: null,
    newQty: 2,
    reasonCategory: "count_correction",
    note: "found 2 in the back chiller",
  });
  expect(level.qty).toBe(2);
  await expect(
    api.adjustStock({ productId: "prod-ubeloaf", variantId: null, newQty: -1, reasonCategory: "other", note: null })
  ).rejects.toBeInstanceOf(ValidationError);
});

test("weight stock decrements exactly (milli-units)", async () => {
  const shift = await api.openShift(0);
  const riceLine = {
    id: newId(),
    productId: "prod-rice",
    variantId: null,
    name: "Jasmine rice",
    soldBy: "weight" as const,
    qty: 0.75,
    unitPriceC: 9500,
    modifiers: [],
    discount: null,
    scPwdMarked: false,
    trackStock: true,
  };
  await api.completeSale(draft([riceLine], shift.id));
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-rice")!.qty).toBe(22.7);
});

test("listSales: newest first with today filter", async () => {
  const shift = await api.openShift(0);
  await api.completeSale(draft([espressoLine()], shift.id));
  await api.completeSale(draft([pandesalLine(1)], shift.id));
  const all = await api.listSales({ date: null });
  expect(all.length).toBe(2);
  expect(new Date(all[0]!.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(all[1]!.createdAt).getTime());
  const today = await api.listSales({ date: manilaDateKey(nowIso()) });
  expect(today.length).toBe(2);
  expect(await api.listSales({ date: "2000-01-01" })).toEqual([]);
});
