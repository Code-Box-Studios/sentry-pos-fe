import type { BranchInfo, CatalogPayload, StockLevel } from "@/domain/types";
import type {
  ActionApproval, BusinessSummary, CashMovement, CompletedSale, EmergencyCloseInput, OperatorActivity, OperatorIdentity,
  OperatorRosterEntry, OperatorUnlock, OwnerSession, PairingResult,
  LiveShiftTotals, SaleDraft, SaleSummary, Shift, StockAdjustInput, ZReport,
} from "./types";

/** THE seam to the future NestJS /pos/* API — swapping adapters touches nothing outside src/api. */
export interface PosApi {
  ownerSignIn(email: string, password: string): Promise<OwnerSession>;
  listBusinesses(session: OwnerSession): Promise<BusinessSummary[]>;
  listBranches(session: OwnerSession, businessId: string): Promise<BranchInfo[]>;
  pairTerminal(session: OwnerSession, businessId: string, branchId: string, terminalName: string): Promise<PairingResult>;
  unpair(email: string, password: string): Promise<void>;
  health(): Promise<{ ok: true }>;
  pullCatalog(): Promise<CatalogPayload>;
  listOperators(): Promise<OperatorRosterEntry[]>;
  unlockOperator(userId: string, pin: string): Promise<OperatorUnlock>;
  setupOperatorPin(userId: string, temporaryPin: string, newPin: string): Promise<OperatorUnlock>;
  currentOperator(): Promise<OperatorIdentity>;
  lockOperator(): Promise<void>;
  getOperatorActivity(): Promise<OperatorActivity>;
  getCurrentShift(operatorToken?: string): Promise<Shift | null>;
  openShift(openingCashC: number): Promise<Shift>;
  addCashMovement(input: { type: "in" | "out"; amountC: number; reason: string }): Promise<CashMovement>;
  getShiftTotals(): Promise<LiveShiftTotals>;
  closeShift(countedCashC: number): Promise<ZReport>;
  emergencyCloseShift(input: EmergencyCloseInput): Promise<ZReport>;
  completeSale(draft: SaleDraft): Promise<CompletedSale>;
  listSales(filter: { date: string | null }): Promise<SaleSummary[]>;   // date = Manila YYYY-MM-DD; null = all
  getSale(id: string): Promise<CompletedSale>;
  voidSale(id: string, reason: string, approval?: ActionApproval): Promise<CompletedSale>;
  refundSale(id: string, reason: string, pin?: string, approval?: ActionApproval): Promise<CompletedSale>;
  getStockLevels(): Promise<StockLevel[]>;
  adjustStock(input: StockAdjustInput): Promise<StockLevel>;
}
