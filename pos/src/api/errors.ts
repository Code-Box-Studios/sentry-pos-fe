export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class UnauthorizedError extends ApiError { constructor(msg = "Device token revoked") { super("unauthorized", msg); } }
export class NetworkError extends ApiError { constructor() { super("network", "API unreachable"); } }
export class ValidationError extends ApiError { constructor(msg: string) { super("validation", msg); } }
export interface StockConflict { lineId: string | null; productId: string; variantId: string | null; availableQty: number }
export class StockConflictError extends ApiError {
  constructor(public conflicts: StockConflict[]) { super("stock_conflict", "Insufficient stock"); }
}
export class PinInvalidError extends ApiError {
  constructor(public attemptsRemaining: number) { super("pin_invalid", "Wrong PIN"); }
}
export class PinLockedError extends ApiError {
  constructor(public retryAfterSeconds: number) { super("pin_locked", "PIN locked"); }
}
