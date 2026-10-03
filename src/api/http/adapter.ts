import type { BranchInfo, CatalogPayload, StockLevel } from "@/domain/types";
import type {
  ActionApproval, BusinessSummary, CashMovement, CompletedSale, EmergencyCloseInput, OperatorActivity, OperatorIdentity,
  OperatorRosterEntry, OperatorUnlock, OwnerSession, PairingResult,
  LiveShiftTotals, SaleDraft, SaleSummary, Shift, StockAdjustInput, ZReport,
} from "../types";
import type { PosApi } from "../client";
import {
  ApiError, NetworkError, OperatorSessionError, PinInvalidError, PinLockedError,
  StockConflictError, UnauthorizedError, ValidationError,
  type StockConflict,
} from "../errors";

export interface HttpPosApiOptions {
  /** e.g. "http://localhost:4000/v1" — no trailing slash */
  baseUrl: string;
  /** Read per request so pairing/unpairing needs no adapter rebuild. */
  getDeviceToken: () => string | null;
  /** In-memory human session; never read from persisted pairing state. */
  getOperatorToken?: () => string | null;
}

interface ErrorBody {
  code?: string;
  message?: string;
  conflicts?: StockConflict[];
  attemptsRemaining?: number;
  retryAfterSeconds?: number;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: ErrorBody;
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    return new ApiError("internal_error", `API error (HTTP ${res.status})`);
  }
  const message = body.message ?? `API error (HTTP ${res.status})`;
  switch (body.code) {
    case "unauthorized": return new UnauthorizedError(message);
    case "operator_unauthorized": return new OperatorSessionError(message);
    case "validation": return new ValidationError(message);
    case "stock_conflict": return new StockConflictError(body.conflicts ?? []);
    case "pin_invalid": return new PinInvalidError(body.attemptsRemaining ?? 0);
    case "pin_locked": return new PinLockedError(body.retryAfterSeconds ?? 0);
    // login_invalid, login_locked, owner_suspended, forbidden, not_found, … — the server
    // message is user-facing copy and every inline error site renders ApiError.message.
    default: return new ApiError(body.code ?? "internal_error", message);
  }
}

interface RequestOpts {
  method?: "GET" | "POST";
  body?: unknown;
  /** undefined = device token from the getter; null = unauthenticated; string = pairing JWT. */
  token?: string | null;
  operator?: boolean;
  operatorToken?: string;
}

export class HttpPosApi implements PosApi {
  constructor(private readonly opts: HttpPosApiOptions) {}

  private async request<T>(path: string, init: RequestOpts = {}): Promise<T> {
    // `=== false` deliberately: Node exposes a `navigator` global with no `onLine` property,
    // so a truthiness check would fail every request in the node-env integration suite.
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new NetworkError();
    const token = init.token === undefined ? this.opts.getDeviceToken() : init.token;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.operator || init.operatorToken) {
      const operatorToken = init.operatorToken ?? this.opts.getOperatorToken?.();
      if (operatorToken) headers["X-Operator-Token"] = operatorToken;
    }
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    let res: Response;
    try {
      res = await fetch(`${this.opts.baseUrl}${path}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch {
      throw new NetworkError();
    }
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as T;
  }

  ownerSignIn(email: string, password: string): Promise<OwnerSession> {
    return this.request("/pos/pairing/sign-in", { method: "POST", body: { email, password }, token: null });
  }
  listBusinesses(session: OwnerSession): Promise<BusinessSummary[]> {
    return this.request("/pos/pairing/businesses", { token: session.token });
  }
  listBranches(session: OwnerSession, businessId: string): Promise<BranchInfo[]> {
    return this.request(`/pos/pairing/businesses/${businessId}/branches`, { token: session.token });
  }
  pairTerminal(session: OwnerSession, businessId: string, branchId: string, terminalName: string): Promise<PairingResult> {
    return this.request("/pos/pairing/pair", { method: "POST", body: { businessId, branchId, terminalName }, token: session.token });
  }
  async unpair(email: string, password: string): Promise<void> {
    await this.request<{ ok: true }>("/pos/unpair", { method: "POST", body: { email, password } });
  }
  health(): Promise<{ ok: true }> {
    return this.request("/health", { token: null });
  }
  pullCatalog(): Promise<CatalogPayload> {
    return this.request("/pos/catalog");
  }
  listOperators(): Promise<OperatorRosterEntry[]> {
    return this.request("/pos/operators");
  }
  unlockOperator(userId: string, pin: string): Promise<OperatorUnlock> {
    return this.request("/pos/operators/unlock", { method: "POST", body: { userId, pin } });
  }
  setupOperatorPin(userId: string, temporaryPin: string, newPin: string): Promise<OperatorUnlock> {
    return this.request("/pos/operators/setup-pin", {
      method: "POST", body: { userId, temporaryPin, newPin },
    });
  }
  currentOperator(): Promise<OperatorIdentity> {
    return this.request("/pos/operators/current", { operator: true });
  }
  async lockOperator(): Promise<void> {
    await this.request<{ ok: true }>("/pos/operators/lock", { method: "POST", operator: true });
  }
  getOperatorActivity(): Promise<OperatorActivity> {
    return this.request("/pos/operators/activity", { operator: true });
  }
  getCurrentShift(operatorToken?: string): Promise<Shift | null> {
    return this.request("/pos/shifts/current", { operator: !!this.opts.getOperatorToken?.(), operatorToken });
  }
  openShift(openingCashC: number): Promise<Shift> {
    return this.request("/pos/shifts", { method: "POST", body: { openingCashC }, operator: true });
  }
  addCashMovement(input: { type: "in" | "out"; amountC: number; reason: string }): Promise<CashMovement> {
    return this.request("/pos/shifts/current/cash-movements", { method: "POST", body: input, operator: true });
  }
  getShiftTotals(): Promise<LiveShiftTotals> {
    return this.request("/pos/shifts/current/totals", { operator: true });
  }
  closeShift(countedCashC: number): Promise<ZReport> {
    return this.request("/pos/shifts/current/close", { method: "POST", body: { countedCashC }, operator: true });
  }
  emergencyCloseShift(input: EmergencyCloseInput): Promise<ZReport> {
    return this.request("/pos/shifts/current/emergency-close", { method: "POST", body: input });
  }
  completeSale(draft: SaleDraft): Promise<CompletedSale> {
    return this.request("/pos/sales", { method: "POST", body: draft, operator: true });
  }
  listSales(filter: { date: string | null }): Promise<SaleSummary[]> {
    return this.request(`/pos/sales${filter.date ? `?date=${filter.date}` : ""}`);
  }
  getSale(id: string): Promise<CompletedSale> {
    return this.request(`/pos/sales/${id}`);
  }
  voidSale(id: string, reason: string, approval?: ActionApproval): Promise<CompletedSale> {
    return this.request(`/pos/sales/${id}/void`, { method: "POST", body: { reason, approval }, operator: true });
  }
  refundSale(id: string, reason: string, pin?: string, approval?: ActionApproval): Promise<CompletedSale> {
    return this.request(`/pos/sales/${id}/refund`, { method: "POST", body: { reason, pin, approval }, operator: true });
  }
  getStockLevels(): Promise<StockLevel[]> {
    return this.request("/pos/stock");
  }
  adjustStock(input: StockAdjustInput): Promise<StockLevel> {
    return this.request("/pos/stock/adjustments", { method: "POST", body: input, operator: true });
  }
}
