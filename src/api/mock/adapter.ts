import type { BranchInfo, CatalogPayload, StockLevel } from "@/domain/types";
import { manilaDateKey, nowIso } from "@/lib/time";
import { milliToQty, qtyToMilli } from "@/lib/qty";
import { newId } from "@/lib/uuid";
import { computeTotals } from "@/domain/totals";
import type { PosApi } from "../client";
import {
  NetworkError,
  OperatorSessionError,
  PinInvalidError,
  PinLockedError,
  StockConflictError,
  UnauthorizedError,
  ValidationError,
  type StockConflict,
} from "../errors";
import type {
  ActionApproval, BusinessSummary, CashMovement, CompletedSale, EmergencyCloseInput, OperatorActivity, OperatorIdentity,
  OperatorRosterEntry, OperatorUnlock, OwnerSession, PairingResult,
  LiveShiftTotals, SaleDraft, SaleSummary, Shift, ShiftTotals, StockAdjustInput, ZReport,
} from "../types";
import { makeSeedCatalog, SEED_BRANCHES, SEED_BUSINESSES, SEED_OWNER } from "./seed";
import { loadMockState, saveMockState, type MockState, type MockShift } from "./store";

/** Four wrong PINs lock the terminal for five minutes (pos-spec §7 throttling). */
const PIN_ATTEMPT_LIMIT = 4;
const PIN_LOCK_SECONDS = 300;

export interface MockPosApiOptions {
  /** 0 in tests; ~120 ms in the app so loading states are exercised. */
  latencyMs?: number;
}

/**
 * Stands in for the NestJS /pos/* API until sentry-pos-be ships. State lives in localStorage so a
 * reload keeps the till: same append-only event shapes, same client UUIDs, same failure modes.
 */
export class MockPosApi implements PosApi {
  private readonly latencyMs: number;
  private operatorSession: (OperatorUnlock & { lastActivityAt: number; pinHash: string }) | null = null;

  constructor(opts: MockPosApiOptions = {}) {
    this.latencyMs = opts.latencyMs ?? 120;
  }

  private person(s: MockState, userId: string) {
    if (userId === "mock-owner") return { userId, name: SEED_OWNER.name, role: "owner" as const,
      active: true, branchIds: SEED_BRANCHES.map((branch) => branch.id), pinHash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92" };
    return s.staff.find((person) => person.userId === userId && person.active && person.branchIds.includes(s.pairedBranchId ?? "")) ?? null;
  }

  private async digest(pin: string): Promise<string> {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  private requireOperator(s: MockState): OperatorIdentity {
    this.pairedContext(s);
    const session = this.operatorSession;
    const person = session && this.person(s, session.operator.userId);
    if (!session || !person?.pinHash || person.pinHash !== session.pinHash || person.role !== session.operator.role ||
      Date.parse(session.expiresAt) <= Date.now() || Date.now() - session.lastActivityAt >= 5 * 60000) {
      this.operatorSession = null;
      throw new OperatorSessionError("Operator session expired or revoked");
    }
    session.lastActivityAt = Date.now();
    return session.operator;
  }

  private requireDrawer(s: MockState, operator: OperatorIdentity): MockShift {
    const shift = this.openShiftOf(s);
    if (!shift) throw new ValidationError("No shift is open");
    if (shift.operatorUserId !== operator.userId) throw new ValidationError("Only the original operator may resume this drawer");
    return shift;
  }

  private async verifyPin(s: MockState, userId: string, pin?: string): Promise<void> {
    const person = this.person(s, userId);
    if (!person?.pinHash) throw new ValidationError("This approver is not ready at this branch");
    const counters = userId === "mock-owner" ? s : s.staff.find((row) => row.userId === userId)!;
    if (counters.pinLockedUntil && Date.parse(counters.pinLockedUntil) > Date.now())
      throw new PinLockedError(Math.ceil((Date.parse(counters.pinLockedUntil) - Date.now()) / 1000));
    if (await this.digest(pin ?? "") !== person.pinHash) {
      counters.pinFailCount += 1;
      if (counters.pinFailCount >= PIN_ATTEMPT_LIMIT) counters.pinLockedUntil = new Date(Date.now() + PIN_LOCK_SECONDS * 1000).toISOString();
      saveMockState(s);
      throw new PinInvalidError(Math.max(0, PIN_ATTEMPT_LIMIT - counters.pinFailCount));
    }
    counters.pinFailCount = 0; counters.pinLockedUntil = null; saveMockState(s);
  }

  private async authorize(s: MockState, operator: OperatorIdentity, refund: boolean, pin?: string, approval?: ActionApproval): Promise<string | null> {
    if (operator.role !== "cashier") {
      if (!refund) return null;
      await this.verifyPin(s, operator.userId, pin);
      return operator.userId;
    }
    if (!approval) throw new ValidationError("Manager or owner approval is required");
    const approver = this.person(s, approval.approverUserId);
    if (!approver || approver.role === "cashier") throw new ValidationError("A manager or owner must approve");
    await this.verifyPin(s, approver.userId, approval.pin);
    return approver.userId;
  }

  // ---------------------------------------------------------------- plumbing

  private async enter(): Promise<MockState> {
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs));
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new NetworkError();
    return loadMockState();
  }

  /** Post-pairing calls all 401 once the portal remote-unpairs the device (project-spec §8). */
  private async enterPaired(): Promise<MockState> {
    const s = await this.enter();
    if (s.deviceRevoked) throw new UnauthorizedError();
    return s;
  }

  private assertOwner(email: string, password: string): void {
    if (email.trim().toLowerCase() !== SEED_OWNER.email || password !== SEED_OWNER.password) {
      throw new ValidationError("Wrong email or password");
    }
  }

  /** Dev-only hook standing in for the portal's remote unpair. */
  debugRevokeDevice(): void {
    const s = loadMockState();
    s.deviceRevoked = true;
    saveMockState(s);
  }

  // ---------------------------------------------------------------- pairing

  async ownerSignIn(email: string, password: string): Promise<OwnerSession> {
    await this.enter();
    this.assertOwner(email, password);
    return { token: `mock-owner-${newId()}`, email: SEED_OWNER.email, ownerName: SEED_OWNER.name };
  }

  async listBusinesses(_session: OwnerSession): Promise<BusinessSummary[]> {
    await this.enter();
    return SEED_BUSINESSES.map((b) => ({ id: b.id, name: b.name, type: b.type, isDemo: b.isDemo }));
  }

  async listBranches(_session: OwnerSession, businessId: string): Promise<BranchInfo[]> {
    await this.enter();
    if (!SEED_BUSINESSES.some((b) => b.id === businessId)) throw new ValidationError("Unknown business");
    return structuredClone(SEED_BRANCHES);
  }

  async pairTerminal(
    _session: OwnerSession,
    businessId: string,
    branchId: string,
    terminalName: string
  ): Promise<PairingResult> {
    const s = await this.enter();
    const business = SEED_BUSINESSES.find((b) => b.id === businessId);
    const branch = SEED_BRANCHES.find((b) => b.id === branchId);
    if (!business) throw new ValidationError("Unknown business");
    if (!branch) throw new ValidationError("Unknown branch");
    if (!terminalName.trim()) throw new ValidationError("Terminal name is required");

    s.terminalPairCount += 1;
    s.pairedBusinessId = business.id;
    s.pairedBranchId = branch.id;
    s.terminalName = terminalName.trim();
    s.terminalCode = `T${s.terminalPairCount}`;
    s.deviceRevoked = false;
    this.operatorSession = null;
    s.stock = makeSeedCatalog().stock;
    saveMockState(s);

    return {
      deviceToken: `mock-device-${newId()}`,
      business: structuredClone(business),
      branch: structuredClone(branch),
      terminalName: s.terminalName,
      terminalCode: s.terminalCode,
      receiptSeq: 1,
    };
  }

  async unpair(email: string, password: string): Promise<void> {
    const s = await this.enter();
    this.assertOwner(email, password);
    // terminalPairCount, sales and shifts survive — only the pairing itself is cleared.
    s.pairedBusinessId = null;
    s.pairedBranchId = null;
    s.terminalName = "";
    s.terminalCode = "";
    s.deviceRevoked = false;
    this.operatorSession = null;
    saveMockState(s);
  }

  async health(): Promise<{ ok: true }> {
    await this.enter();
    return { ok: true };
  }

  // ---------------------------------------------------------------- catalog

  private pairedContext(s: MockState) {
    const business = SEED_BUSINESSES.find((b) => b.id === s.pairedBusinessId);
    const branch = SEED_BRANCHES.find((b) => b.id === s.pairedBranchId);
    if (!business || !branch) throw new UnauthorizedError("Terminal is not paired");
    return { business, branch };
  }

  async pullCatalog(): Promise<CatalogPayload> {
    const s = await this.enterPaired();
    const { business, branch } = this.pairedContext(s);
    const seed = makeSeedCatalog();
    return structuredClone({
      ...seed,
      business,
      branch,
      terminal: { name: s.terminalName, code: s.terminalCode },
      stock: s.stock,
      loadedAt: nowIso(),
    });
  }

  // Human unlock state is deliberately instance-only, unlike the paired device.
  async listOperators(): Promise<OperatorRosterEntry[]> {
    const s = await this.enterPaired();
    this.pairedContext(s);
    return [{ userId: "mock-owner", name: SEED_OWNER.name, role: "owner", requiresSetup: false },
      ...s.staff.filter((person) => person.active && person.branchIds.includes(s.pairedBranchId ?? ""))
        .map(({ userId, name, role, pinHash }) => ({ userId, name, role, requiresSetup: !pinHash }))];
  }

  async unlockOperator(userId: string, pin: string): Promise<OperatorUnlock> {
    const s = await this.enterPaired();
    this.pairedContext(s);
    const person = this.person(s, userId);
    if (!person) throw new ValidationError("Operator is not assigned here");
    if (!person.pinHash) throw new ValidationError("Change your temporary PIN first");
    await this.verifyPin(s, userId, pin);
    const shift = this.openShiftOf(s);
    if (shift && shift.operatorUserId !== userId) throw new ValidationError("Only the original operator may resume this drawer");
    const operator: OperatorIdentity = { userId, name: person.name, role: person.role };
    const session: OperatorUnlock = {
      operator, token: `mock-operator-${newId()}`,
      expiresAt: new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
    };
    this.operatorSession = { ...session, lastActivityAt: Date.now(), pinHash: person.pinHash };
    return session;
  }

  async setupOperatorPin(userId: string, temporaryPin: string, newPin: string): Promise<OperatorUnlock> {
    const s = await this.enterPaired();
    if (!/^\d{6}$/.test(newPin) || newPin === temporaryPin) throw new ValidationError("Choose a different six-digit PIN");
    const person = s.staff.find((row) => row.userId === userId && row.active && row.branchIds.includes(s.pairedBranchId ?? ""));
    if (!person?.temporaryPinHash || !person.temporaryExpiresAt || Date.parse(person.temporaryExpiresAt) <= Date.now() || person.temporaryAttempts >= 5)
      throw new ValidationError("Temporary PIN expired or already used");
    if (await this.digest(temporaryPin) !== person.temporaryPinHash) {
      person.temporaryAttempts += 1; saveMockState(s); throw new PinInvalidError(Math.max(0, 5 - person.temporaryAttempts));
    }
    const shift = this.openShiftOf(s);
    if (shift && shift.operatorUserId !== userId) throw new ValidationError("Only the original operator may resume this drawer");
    person.pinHash = await this.digest(newPin); person.temporaryPinHash = null; person.temporaryExpiresAt = null;
    saveMockState(s);
    return this.unlockOperator(userId, newPin);
  }

  async currentOperator(): Promise<OperatorIdentity> {
    return this.requireOperator(await this.enterPaired());
  }

  async lockOperator(): Promise<void> {
    await this.currentOperator();
    this.operatorSession = null;
  }

  async getOperatorActivity(): Promise<OperatorActivity> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    const own = (userId: string | null | undefined) => operator.role !== "cashier" || userId === operator.userId;
    return {
      sales: s.sales.filter((sale) => (!sale.branchId || sale.branchId === s.pairedBranchId) && own(sale.operatorUserId)).slice(-100).reverse().map((sale) => ({ id: sale.id, receiptNo: sale.receiptNo, createdAt: sale.createdAt, status: sale.status, totalC: sale.totals.totalC, operatorUserId: sale.operatorUserId ?? null })),
      shifts: s.shifts.filter((shift) => (!shift.branchId || shift.branchId === s.pairedBranchId) && own(shift.operatorUserId)).slice(-100).reverse().map((shift) => ({ id: shift.id, openedAt: shift.openedAt, closedAt: shift.closedAt, operatorUserId: shift.operatorUserId ?? null, overShortC: shift.closedAt ? shift.overShortC ?? null : null })),
    };
  }

  // ---------------------------------------------------------------- shifts

  private openShiftOf(s: MockState): MockShift | null {
    return s.shifts.find((sh) => sh.closedAt === null && (!sh.branchId || sh.branchId === s.pairedBranchId) && (!sh.terminalCode || sh.terminalCode === s.terminalCode)) ?? null;
  }

  async getCurrentShift(): Promise<Shift | null> {
    const s = await this.enterPaired();
    const shift = this.openShiftOf(s);
    if (!shift) return null;
    const operator = this.operatorSession ? this.requireOperator(s) : null;
    if (operator) this.requireDrawer(s, operator);
    return structuredClone(!operator || s.blindCloseEnabled ? { ...shift, openingCashC: null, cashMovements: [] } : shift);
  }

  async openShift(openingCashC: number): Promise<Shift> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    if (this.openShiftOf(s)) throw new ValidationError("A shift is already open on this terminal");
    if (!Number.isInteger(openingCashC) || openingCashC < 0) throw new ValidationError("Opening float must be zero or more");
    const shift: MockShift = {
      id: newId(),
      openedAt: nowIso(),
      closedAt: null,
      openingCashC,
      cashMovements: [],
      operatorUserId: operator.userId,
      branchId: s.pairedBranchId!, terminalCode: s.terminalCode,
    };
    s.shifts.push(shift);
    saveMockState(s);
    return structuredClone(shift);
  }

  async addCashMovement(input: { type: "in" | "out"; amountC: number; reason: string }): Promise<CashMovement> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    const shift = this.requireDrawer(s, operator);
    if (!Number.isInteger(input.amountC) || input.amountC <= 0) throw new ValidationError("Amount must be more than zero");
    if (!input.reason.trim()) throw new ValidationError("A reason is required");
    const movement: CashMovement = {
      id: newId(),
      type: input.type,
      amountC: input.amountC,
      reason: input.reason.trim(),
      at: nowIso(),
      operatorUserId: operator.userId,
    };
    shift.cashMovements.push(movement);
    saveMockState(s);
    return structuredClone(movement);
  }

  /**
   * X/Z aggregation. A sale sold in this shift counts as sold unless it was voided — a later refund
   * does not un-sell it, it subtracts separately (pos-spec §8).
   */
  private totalsFor(s: MockState, shift: Shift): ShiftTotals {
    if (shift.openingCashC === null) throw new ValidationError("The stored opening cash is unavailable");
    const ofShift = s.sales.filter((sale) => sale.shiftId === shift.id);
    const sold = ofShift.filter((sale) => sale.status !== "voided");
    const voided = ofShift.filter((sale) => sale.status === "voided");
    const refunds = s.sales.filter((sale) => sale.status === "refunded" && sale.refundShiftId === shift.id);

    const byMethod: ShiftTotals["byMethod"] = { cash: 0, card: 0, gcash: 0, maya: 0, other: 0 };
    for (const sale of sold) byMethod[sale.payment.method] += sale.totals.totalC;

    const sum = (rows: CompletedSale[], pick: (sale: CompletedSale) => number) =>
      rows.reduce((acc, sale) => acc + pick(sale), 0);

    const cashSalesC = sum(sold.filter((sale) => sale.payment.method === "cash"), (sale) => sale.totals.totalC);
    const cashRefundsC = sum(refunds.filter((sale) => sale.payment.method === "cash"), (sale) => sale.totals.totalC);
    const cashInC = shift.cashMovements.filter((m) => m.type === "in").reduce((acc, m) => acc + m.amountC, 0);
    const cashOutC = shift.cashMovements.filter((m) => m.type === "out").reduce((acc, m) => acc + m.amountC, 0);

    return {
      grossC: sum(sold, (sale) => sale.totals.totalC),
      saleCount: sold.length,
      byMethod,
      voidCount: voided.length,
      voidAmountC: sum(voided, (sale) => sale.totals.totalC),
      refundCount: refunds.length,
      refundAmountC: sum(refunds, (sale) => sale.totals.totalC),
      scPwdDiscountC: sum(sold, (sale) => sale.totals.scPwdDiscountC),
      serviceChargeC: sum(sold, (sale) => sale.totals.serviceChargeC),
      cashSalesC,
      cashRefundsC,
      cashInC,
      cashOutC,
      expectedCashC: shift.openingCashC + cashSalesC - cashRefundsC + cashInC - cashOutC,
    };
  }

  async getShiftTotals(): Promise<LiveShiftTotals> {
    const s = await this.enterPaired();
    const shift = this.requireDrawer(s, this.requireOperator(s));
    const totals = this.totalsFor(s, shift);
    return s.blindCloseEnabled ? { ...totals, blindCloseEnabled: true, byMethod: { ...totals.byMethod, cash: null }, cashSalesC: null, cashRefundsC: null, cashInC: null, cashOutC: null, expectedCashC: null } : totals;
  }

  async closeShift(countedCashC: number): Promise<ZReport> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    const shift = this.requireDrawer(s, operator);
    return this.finishClose(s, shift, countedCashC, operator.userId);
  }

  async emergencyCloseShift(input: EmergencyCloseInput): Promise<ZReport> {
    const s = await this.enterPaired();
    const shift = this.openShiftOf(s);
    if (!shift) throw new ValidationError("No shift is open");
    const original = shift.operatorUserId ? this.person(s, shift.operatorUserId) : null;
    if (original?.pinHash) throw new ValidationError("An active shift operator must close their own drawer");
    if (!input.reason.trim()) throw new ValidationError("An emergency close reason is required");
    const approver = this.person(s, input.approval.approverUserId);
    if (!approver || approver.role === "cashier") throw new ValidationError("A manager or owner must approve");
    await this.verifyPin(s, approver.userId, input.approval.pin);
    return this.finishClose(s, shift, input.countedCashC, approver.userId, input.reason.trim());
  }

  private finishClose(s: MockState, shift: MockShift, countedCashC: number, closerId: string, reason?: string): ZReport {
    const { branch } = this.pairedContext(s);
    if (!Number.isInteger(countedCashC) || countedCashC < 0) throw new ValidationError("Counted cash must be zero or more");

    const totals = this.totalsFor(s, shift);
    const closedAt = nowIso();
    shift.closedAt = closedAt;
    shift.closedByUserId = closerId; shift.emergencyCloseReason = reason ?? null;
    shift.overShortC = countedCashC - totals.expectedCashC;
    saveMockState(s);

    return {
      ...totals,
      shiftId: shift.id,
      operatorUserId: shift.operatorUserId,
      closedByUserId: closerId,
      emergencyCloseReason: reason ?? null,
      openedAt: shift.openedAt,
      closedAt,
      openingCashC: shift.openingCashC ?? 0,
      countedCashC,
      overShortC: countedCashC - totals.expectedCashC,
      branchCode: branch.code,
      terminalCode: s.terminalCode,
    };
  }

  // ---------------------------------------------------------------- stock

  private levelIndex(s: MockState, productId: string, variantId: string | null): number {
    const exact = s.stock.findIndex((l) => l.productId === productId && l.variantId === variantId);
    if (exact !== -1) return exact;
    // A tracked variant with no row of its own falls back to the product-level count.
    if (variantId !== null) return s.stock.findIndex((l) => l.productId === productId && l.variantId === null);
    return -1;
  }

  /** Applies a signed milli-unit delta to a stock row; a missing row means the line is unconstrained. */
  private moveStock(s: MockState, productId: string, variantId: string | null, qtyDelta: number): void {
    const i = this.levelIndex(s, productId, variantId);
    if (i === -1) return;
    const level = s.stock[i]!;
    level.qty = milliToQty(qtyToMilli(level.qty) + qtyToMilli(qtyDelta));
  }

  async getStockLevels(): Promise<StockLevel[]> {
    const s = await this.enterPaired();
    return structuredClone(s.stock);
  }

  async adjustStock(input: StockAdjustInput): Promise<StockLevel> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    const approvedBy = await this.authorize(s, operator, false, undefined, input.approval);
    if (!(input.newQty >= 0)) throw new ValidationError("Quantity cannot be negative");

    const i = this.levelIndex(s, input.productId, input.variantId);
    const current = i === -1 ? 0 : s.stock[i]!.qty;
    const qtyDelta = milliToQty(qtyToMilli(input.newQty) - qtyToMilli(current));

    const level: StockLevel = { productId: input.productId, variantId: input.variantId, qty: input.newQty };
    if (i === -1) s.stock.push(level);
    else s.stock[i] = { ...s.stock[i]!, qty: input.newQty };

    // The real API appends stock_movements(adjustment); keep the audit convention here too.
    s.adjustments.push({
      id: newId(),
      productId: input.productId,
      variantId: input.variantId,
      qtyDelta,
      reasonCategory: input.reasonCategory,
      note: input.note,
      at: nowIso(),
      operatorUserId: operator.userId, approvedByUserId: approvedBy,
    });
    saveMockState(s);
    return structuredClone(i === -1 ? level : s.stock[i]!);
  }

  // ---------------------------------------------------------------- sales

  /** Key order is irrelevant — only the numbers have to agree. */
  private canonical(value: unknown): string {
    return JSON.stringify(value, (_key, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
        : v
    );
  }

  private receipt(row: MockState["sales"][number]): CompletedSale {
    const result = structuredClone(row);
    delete result.branchId;
    delete result.terminalCode;
    return result;
  }

  async completeSale(draft: SaleDraft): Promise<CompletedSale> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    const { business } = this.pairedContext(s);
    const recorded = s.sales.find((sale) => sale.id === draft.id);
    if (recorded) {
      if (recorded.operatorUserId !== operator.userId || (recorded.terminalCode && recorded.terminalCode !== s.terminalCode)) throw new ValidationError("This sale belongs to another operator or terminal");
      return this.receipt(recorded);
    }
    const shift = this.requireDrawer(s, operator);
    if (shift.id !== draft.shiftId || (draft.operatorUserId !== undefined && draft.operatorUserId !== operator.userId)) throw new ValidationError("The sale's operator or shift does not match");
    if (!business.allowMiscItems && draft.lines.some((line) => line.productId === null)) throw new ValidationError("Miscellaneous items are disabled");
    const named = makeSeedCatalog().discounts;
    const validDiscount = (discount: SaleDraft["orderDiscount"], target: "line" | "order") => {
      if (!discount) return;
      if (discount.source === "free") {
        if (operator.role !== "owner") throw new ValidationError("Free-entry discounts are owner-only");
      } else if (!named.some((row) => row.id === discount.discountId && row.active && row.kind === discount.kind && row.value === discount.value && (row.appliesTo === target || row.appliesTo === "both"))) {
        throw new ValidationError("Choose an active business discount");
      }
    };
    validDiscount(draft.orderDiscount, "order");
    for (const line of draft.lines) validDiscount(line.discount, "line");

    // The server recomputes rather than trusting the client, and so does the mock.
    const recomputed = computeTotals(
      {
        id: draft.id,
        orderType: draft.orderType,
        lines: draft.lines,
        orderDiscount: draft.orderDiscount,
        scPwd: draft.scPwd,
      },
      { taxRate: business.taxRate, serviceChargeRate: business.serviceChargeRate }
    );
    if (this.canonical(recomputed) !== this.canonical(draft.totals)) {
      throw new ValidationError("Totals do not match a server-side recompute");
    }
    if (draft.payment.amountC !== recomputed.totalC) {
      throw new ValidationError("Payment amount does not match the total");
    }

    // Stock is checked for the whole basket before anything moves — a sale never half-commits.
    const wanted = new Map<string, number>();
    const conflicts: StockConflict[] = [];
    for (const line of draft.lines) {
      if (line.productId === null || !line.trackStock) continue;
      const i = this.levelIndex(s, line.productId, line.variantId);
      if (i === -1) continue;
      const key = `${line.productId}:${line.variantId ?? ""}`;
      const claimed = (wanted.get(key) ?? 0) + qtyToMilli(line.qty);
      wanted.set(key, claimed);
      const availableMilli = qtyToMilli(s.stock[i]!.qty);
      if (claimed > availableMilli) {
        conflicts.push({
          lineId: line.id,
          productId: line.productId,
          variantId: line.variantId,
          availableQty: milliToQty(availableMilli),
        });
      }
    }
    if (conflicts.length > 0) throw new StockConflictError(conflicts);

    for (const line of draft.lines) {
      if (line.productId === null || !line.trackStock) continue;
      this.moveStock(s, line.productId, line.variantId, -line.qty);
    }

    const sale: CompletedSale = {
      ...structuredClone(draft),
      operatorUserId: operator.userId,
      status: "completed",
      statusReason: null,
      createdAt: nowIso(),
      voidedAt: null,
      refundedAt: null,
      refundShiftId: null,
    };
    s.sales.push({ ...sale, branchId: s.pairedBranchId!, terminalCode: s.terminalCode });
    saveMockState(s);
    return this.receipt(sale);
  }

  async listSales(filter: { date: string | null }): Promise<SaleSummary[]> {
    const s = await this.enterPaired();
    this.requireOperator(s);
    return s.sales
      .map((sale, index) => ({ sale, index }))
      .filter(({ sale }) => (!sale.branchId || sale.branchId === s.pairedBranchId) && (!sale.terminalCode || sale.terminalCode === s.terminalCode) && (filter.date === null || manilaDateKey(sale.createdAt) === filter.date))
      // Sales inside the same millisecond fall back to append order, newest last written first.
      .sort((a, b) => b.sale.createdAt.localeCompare(a.sale.createdAt) || b.index - a.index)
      .map(({ sale }) => ({
        id: sale.id,
        receiptNo: sale.receiptNo,
        createdAt: sale.createdAt,
        lineCount: sale.lines.length,
        orderType: sale.orderType,
        method: sale.payment.method,
        referenceNo: sale.payment.referenceNo,
        status: sale.status,
        statusReason: sale.statusReason,
        totalC: sale.totals.totalC,
        scPwd: sale.scPwd !== null,
      }));
  }

  async getSale(id: string): Promise<CompletedSale> {
    const s = await this.enterPaired();
    const sale = s.sales.find((row) => row.id === id);
    if (!sale) throw new ValidationError("Sale not found");
    return this.receipt(sale);
  }

  /** Void and refund both put the goods back on the shelf (pos-spec §9). */
  private returnStock(s: MockState, sale: CompletedSale): void {
    for (const line of sale.lines) {
      if (line.productId === null || !line.trackStock) continue;
      this.moveStock(s, line.productId, line.variantId, line.qty);
    }
  }

  async voidSale(id: string, reason: string, approval?: ActionApproval): Promise<CompletedSale> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    const approvedBy = await this.authorize(s, operator, false, undefined, approval);
    const sale = s.sales.find((row) => row.id === id);
    if (!sale) throw new ValidationError("Sale not found");
    if (sale.status !== "completed") throw new ValidationError(`A ${sale.status} sale cannot be voided`);
    if (!reason.trim()) throw new ValidationError("A reason is required");
    const shift = this.requireDrawer(s, operator);
    if (shift.id !== sale.shiftId) {
      throw new ValidationError("Voids only while the sale's shift is open — refund it instead");
    }

    sale.status = "voided";
    sale.voidedAt = nowIso();
    sale.statusReason = reason.trim();
    sale.statusRequestedByUserId = operator.userId;
    sale.statusApprovedByUserId = approvedBy;
    this.returnStock(s, sale);
    saveMockState(s);
    return this.receipt(sale);
  }

  async refundSale(id: string, reason: string, pin?: string, approval?: ActionApproval): Promise<CompletedSale> {
    const s = await this.enterPaired();
    const operator = this.requireOperator(s);
    const approvedBy = await this.authorize(s, operator, true, pin, approval);

    const sale = s.sales.find((row) => row.id === id);
    if (!sale) throw new ValidationError("Sale not found");
    if (sale.status !== "completed") throw new ValidationError(`A ${sale.status} sale cannot be refunded`);
    if (!reason.trim()) throw new ValidationError("A reason is required");

    const shift = this.openShiftOf(s);
    if (shift) this.requireDrawer(s, operator);
    sale.status = "refunded";
    sale.refundedAt = nowIso();
    sale.statusReason = reason.trim();
    sale.statusRequestedByUserId = operator.userId;
    sale.statusApprovedByUserId = approvedBy;
    // Only a refund taken during the sale's own shift touches that shift's expected cash.
    sale.refundShiftId = shift && shift.id === sale.shiftId ? shift.id : null;
    this.returnStock(s, sale);
    saveMockState(s);
    return this.receipt(sale);
  }
}
