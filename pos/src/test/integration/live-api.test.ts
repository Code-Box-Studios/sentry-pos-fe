// Live FE↔BE contract test — runs only when POS_E2E_API_URL points at a seeded sentry-pos-be
// (see the workspace README). Pairs a fresh terminal per run (T-codes are never reused, so
// repeat runs are fine); `npm run db:seed` in sentry-pos-be resets everything.
import { HttpPosApi } from "@/api/http/adapter";
import {
  PinInvalidError, StockConflictError, UnauthorizedError, ValidationError,
} from "@/api/errors";
import type { CompletedSale, OwnerSession, PairingResult, SaleDraft } from "@/api/types";
import type { Cart, CartLine } from "@/domain/cart";
import { computeTotals } from "@/domain/totals";
import type { CatalogPayload } from "@/domain/types";
import { newId } from "@/lib/uuid";

const BASE = process.env.POS_E2E_API_URL;
const live = BASE ? describe : describe.skip;

let deviceToken: string | null = null;
const api = new HttpPosApi({ baseUrl: (BASE ?? "").replace(/\/+$/, ""), getDeviceToken: () => deviceToken });

let session: OwnerSession;
let pairing: PairingResult;
let catalog: CatalogPayload;
let shiftId: string;
let receiptSeq: number;
let parityDraft: SaleDraft;
let paritySale: CompletedSale;

function receiptNo(): string {
  return `${pairing.branch.code}-${pairing.terminalCode}-${String(receiptSeq).padStart(6, "0")}`;
}

// `trackStock` is required, never defaulted: the terminal snapshots the catalog product's own flag
// onto the line (state/cart.ts) and BOTH engines stock-check off that snapshot, so a fixture that
// guesses it would 409 untracked made-to-order drinks that have no branch_stock row at all.
function line(
  partial: Partial<CartLine> & Pick<CartLine, "productId" | "name" | "qty" | "unitPriceC" | "trackStock">,
): CartLine {
  return {
    id: newId(), variantId: null, soldBy: "unit", modifiers: [],
    discount: null, scPwdMarked: false, ...partial,
  };
}

function draftFor(cart: Cart, tamperTotalC = 0): SaleDraft {
  const { taxRate, serviceChargeRate } = catalog.business;
  const computed = computeTotals(cart, { taxRate, serviceChargeRate });
  const totals = tamperTotalC ? { ...computed, totalC: computed.totalC + tamperTotalC } : computed;
  return {
    id: newId(),
    receiptNo: receiptNo(),
    shiftId,
    orderType: cart.orderType,
    lines: cart.lines,
    orderDiscount: cart.orderDiscount,
    scPwd: cart.scPwd,
    totals,
    payment: {
      id: newId(), method: "cash", referenceNo: null,
      amountC: totals.totalC, tenderedC: totals.totalC + 10000, changeC: 10000,
    },
    createdAtDevice: new Date().toISOString(),
  };
}

function simpleCart(): Cart {
  const pandesal = catalog.products.find((p) => /pan de sal/i.test(p.name))!;
  return {
    id: newId(), orderType: "none", orderDiscount: null, scPwd: null,
    lines: [line({ productId: pandesal.id, name: pandesal.name, qty: 1, unitPriceC: pandesal.priceC, trackStock: pandesal.trackStock })],
  };
}

live("live API golden path", () => {
  it("pairs a fresh terminal with the seed owner", async () => {
    await expect(api.health()).resolves.toEqual({ ok: true });
    session = await api.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
    const businesses = await api.listBusinesses(session);
    const kape = businesses.find((b) => !b.isDemo && b.name === "Kape Diaria");
    expect(kape).toBeDefined();
    const branches = await api.listBranches(session, kape!.id);
    const mkt = branches.find((b) => b.code === "MKT");
    expect(mkt).toBeDefined();
    pairing = await api.pairTerminal(session, kape!.id, mkt!.id, "Integration till");
    deviceToken = pairing.deviceToken;
    receiptSeq = pairing.receiptSeq;
    expect(pairing.business.taxRate).toBe(0.12);
  });

  it("pulls the catalog and opens a shift", async () => {
    catalog = await api.pullCatalog();
    expect(catalog.branch.code).toBe("MKT");
    const shift = await api.openShift(500000);
    shiftId = shift.id;
    expect(shift.closedAt).toBeNull();
  });

  it("completes a worst-case sale — FE totals must match the BE recompute exactly", async () => {
    // variant + modifiers + weight qty + SC/PWD + named order discount + dine-in service charge:
    // every branch of the totals engine in one draft.
    const iced = catalog.products.find((p) => p.name === "Iced Latte")!;
    const variant = iced.variants[0];
    const groups = catalog.modifierGroups.filter((g) => iced.modifierGroupIds.includes(g.id));
    expect(groups.length).toBeGreaterThan(0);
    const mods = groups.map((g) => {
      const m = g.modifiers.find((x) => x.priceDeltaC > 0) ?? g.modifiers[0];
      return { groupId: g.id, modifierId: m.id, name: m.name, priceDeltaC: m.priceDeltaC };
    });
    const rice = catalog.products.find((p) => p.soldBy === "weight")!;
    const pandesal = catalog.products.find((p) => /pan de sal/i.test(p.name))!;
    const merienda = catalog.discounts.find((d) => /merienda/i.test(d.name))!;

    const cart: Cart = {
      id: newId(),
      orderType: "dine_in",
      orderDiscount: { source: "named", discountId: merienda.id, name: merienda.name, kind: merienda.kind, value: merienda.value },
      scPwd: { idNo: "SC-2026-0001", name: "Lolo Ben" },
      lines: [
        line({ productId: iced.id, variantId: variant.id, name: `${iced.name} — ${variant.name}`, qty: 2, unitPriceC: variant.priceC, modifiers: mods, trackStock: iced.trackStock }),
        line({ productId: rice.id, name: rice.name, soldBy: "weight", qty: 0.75, unitPriceC: rice.priceC, scPwdMarked: true, trackStock: rice.trackStock }),
        line({ productId: pandesal.id, name: pandesal.name, qty: 3, unitPriceC: pandesal.priceC, trackStock: pandesal.trackStock }),
      ],
    };

    parityDraft = draftFor(cart);
    paritySale = await api.completeSale(parityDraft);
    receiptSeq += 1;
    expect(paritySale.status).toBe("completed");
    expect(paritySale.totals).toEqual(parityDraft.totals); // accepted AND stored our math verbatim
  });

  it("replays the identical draft idempotently", async () => {
    await expect(api.completeSale(parityDraft)).resolves.toEqual(paritySale);
  });

  it("rejects tampered totals", async () => {
    await expect(api.completeSale(draftFor(simpleCart(), 1))).rejects.toBeInstanceOf(ValidationError);
  });

  it("409s an oversell with the conflicting line", async () => {
    const ube = catalog.products.find((p) => /ube/i.test(p.name))!;
    expect(catalog.stock.find((s) => s.productId === ube.id)?.qty).toBe(0); // seeded out-of-stock
    const cart: Cart = {
      id: newId(), orderType: "none", orderDiscount: null, scPwd: null,
      lines: [line({ productId: ube.id, name: ube.name, qty: 1, unitPriceC: ube.priceC, trackStock: ube.trackStock })],
    };
    const err = await api.completeSale(draftFor(cart)).catch((e) => e);
    expect(err).toBeInstanceOf(StockConflictError);
    expect(err.conflicts[0]).toMatchObject({ productId: ube.id, availableQty: 0 });
  });

  it("voids a sale inside its own shift", async () => {
    const sale = await api.completeSale(draftFor(simpleCart()));
    receiptSeq += 1;
    const voided = await api.voidSale(sale.id, "integration void");
    expect(voided.status).toBe("voided");
    expect(voided.voidedAt).not.toBeNull();
  });

  it("gates refunds behind the PIN, then refunds with the right one", async () => {
    const err = await api.refundSale(paritySale.id, "integration refund", "000000").catch((e) => e);
    expect(err).toBeInstanceOf(PinInvalidError);
    expect(typeof err.attemptsRemaining).toBe("number");
    const refunded = await api.refundSale(paritySale.id, "integration refund", "123456");
    expect(refunded.status).toBe("refunded");
    expect(refunded.refundShiftId).toBe(shiftId); // refunded inside the sale's own shift
  });

  it("closes the shift with a consistent Z report", async () => {
    await api.addCashMovement({ type: "in", amountC: 10000, reason: "float top-up" });
    const totals = await api.getShiftTotals();
    expect(totals.cashInC).toBe(10000);
    expect(totals.voidCount).toBe(1);
    expect(totals.refundCount).toBe(1);
    expect(totals.expectedCashC).toBe(
      500000 + totals.cashSalesC - totals.cashRefundsC + totals.cashInC - totals.cashOutC
    );
    const z = await api.closeShift(totals.expectedCashC);
    expect(z.overShortC).toBe(0);
    expect(z.branchCode).toBe("MKT");
    expect(z.terminalCode).toBe(pairing.terminalCode);
    await expect(api.getCurrentShift()).resolves.toBeNull();
  });

  it("unpairs and the device token dies with it", async () => {
    await api.unpair("maria@kapediaria.ph", "sentry-demo");
    await expect(api.pullCatalog()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
