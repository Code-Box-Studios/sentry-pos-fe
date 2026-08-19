import type { BranchInfo, CatalogPayload, StockLevel } from "@/domain/types";
import { nowIso } from "@/lib/time";
import { newId } from "@/lib/uuid";
import type { PosApi } from "../client";
import { NetworkError, UnauthorizedError, ValidationError } from "../errors";
import type {
  BusinessSummary, CashMovement, CompletedSale, OwnerSession, PairingResult,
  SaleDraft, SaleSummary, Shift, ShiftTotals, StockAdjustInput, ZReport,
} from "../types";
import { makeSeedCatalog, SEED_BRANCHES, SEED_BUSINESSES, SEED_OWNER } from "./seed";
import { loadMockState, saveMockState, type MockState } from "./store";

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

  constructor(opts: MockPosApiOptions = {}) {
    this.latencyMs = opts.latencyMs ?? 120;
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

  // ------------------------------------------------- implemented in Task 6

  async getCurrentShift(): Promise<Shift | null> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async openShift(_openingCashC: number): Promise<Shift> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async addCashMovement(_input: { type: "in" | "out"; amountC: number; reason: string }): Promise<CashMovement> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async getShiftTotals(): Promise<ShiftTotals> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async closeShift(_countedCashC: number): Promise<ZReport> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async completeSale(_draft: SaleDraft): Promise<CompletedSale> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async listSales(_filter: { date: string | null }): Promise<SaleSummary[]> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async getSale(_id: string): Promise<CompletedSale> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async voidSale(_id: string, _reason: string): Promise<CompletedSale> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async refundSale(_id: string, _reason: string, _pin: string): Promise<CompletedSale> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async getStockLevels(): Promise<StockLevel[]> {
    await this.enterPaired();
    throw new Error("not implemented");
  }

  async adjustStock(_input: StockAdjustInput): Promise<StockLevel> {
    await this.enterPaired();
    throw new Error("not implemented");
  }
}
