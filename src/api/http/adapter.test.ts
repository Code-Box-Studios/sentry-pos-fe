import { HttpPosApi } from "./adapter";
import {
  ApiError, NetworkError, PinInvalidError, PinLockedError,
  StockConflictError, UnauthorizedError, ValidationError,
} from "../errors";
import type { OwnerSession, SaleDraft } from "../types";

const BASE = "http://api.test/v1";
const SESSION: OwnerSession = { token: "pairing-jwt", email: "maria@kapediaria.ph", ownerName: "Maria" };

function makeApi(deviceToken: string | null = "device-secret") {
  return new HttpPosApi({ baseUrl: BASE, getDeviceToken: () => deviceToken });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubFetch(response: Response) {
  const spy = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("auth headers", () => {
  test("unlock can hydrate the drawer with the new token before publishing the operator", async () => {
    const spy = stubFetch(jsonResponse(200, { id: "shift", openingCashC: 1000 }));
    const api = new HttpPosApi({ baseUrl: BASE, getDeviceToken: () => "device-secret", getOperatorToken: () => null });
    await api.getCurrentShift("new-human-token");
    expect(spy.mock.calls[0][1].headers["X-Operator-Token"]).toBe("new-human-token");
  });
  test("one-action approval travels separately and emergency close does not need an operator token", async () => {
    const spy = vi.fn().mockImplementation(async () => jsonResponse(200, {}));
    vi.stubGlobal("fetch", spy);
    const api = new HttpPosApi({ baseUrl: BASE, getDeviceToken: () => "device-secret", getOperatorToken: () => "cashier-secret" });
    const approval = { approverUserId: "manager-1", pin: "654321" };
    await api.voidSale("sale-1", "duplicate", approval);
    await api.refundSale("sale-2", "returned", undefined, approval);
    await api.emergencyCloseShift({ countedCashC: 5000, reason: "Operator unavailable", approval });
    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({ reason: "duplicate", approval });
    expect(JSON.parse(spy.mock.calls[1][1].body)).toEqual({ reason: "returned", approval });
    expect(spy.mock.calls[0][1].headers["X-Operator-Token"]).toBe("cashier-secret");
    expect(spy.mock.calls[2][0]).toBe(`${BASE}/pos/shifts/current/emergency-close`);
    expect(spy.mock.calls[2][1].headers).not.toHaveProperty("X-Operator-Token");
  });

  test("personal activity always sends the operator token", async () => {
    const spy = stubFetch(jsonResponse(200, { sales: [], shifts: [] }));
    const api = new HttpPosApi({ baseUrl: BASE, getDeviceToken: () => "device-secret", getOperatorToken: () => "human-secret" });
    await api.getOperatorActivity();
    expect(spy.mock.calls[0][0]).toBe(`${BASE}/pos/operators/activity`);
    expect(spy.mock.calls[0][1].headers["X-Operator-Token"]).toBe("human-secret");
  });
  test("operator requests send a separate human token alongside the device token", async () => {
    const spy = stubFetch(jsonResponse(200, { userId: "owner-1", name: "Maria", role: "owner" }));
    const api = new HttpPosApi({
      baseUrl: BASE,
      getDeviceToken: () => "device-secret",
      getOperatorToken: () => "human-secret",
    });
    await api.currentOperator();
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${BASE}/pos/operators/current`);
    expect(init.headers).toEqual({
      Authorization: "Bearer device-secret",
      "X-Operator-Token": "human-secret",
    });
  });

  test("roster and unlock use only the device token", async () => {
    const spy = vi.fn().mockImplementation(async () => jsonResponse(200, []));
    vi.stubGlobal("fetch", spy);
    const api = new HttpPosApi({
      baseUrl: BASE,
      getDeviceToken: () => "device-secret",
      getOperatorToken: () => "human-secret",
    });
    await api.listOperators();
    await api.unlockOperator("owner-1", "123456");
    for (const [, init] of spy.mock.calls) {
      expect(init.headers.Authorization).toBe("Bearer device-secret");
      expect(init.headers).not.toHaveProperty("X-Operator-Token");
    }
    expect(spy.mock.calls[1][0]).toBe(`${BASE}/pos/operators/unlock`);
    expect(JSON.parse(spy.mock.calls[1][1].body)).toEqual({ userId: "owner-1", pin: "123456" });
  });

  test("terminal calls carry the device token from the getter", async () => {
    const spy = stubFetch(jsonResponse(200, []));
    await makeApi().getStockLevels();
    expect(spy).toHaveBeenCalledWith(`${BASE}/pos/stock`, {
      method: "GET",
      headers: { Authorization: "Bearer device-secret" },
      body: undefined,
    });
  });

  test("pairing-phase calls carry the session token, not the device token", async () => {
    const spy = stubFetch(jsonResponse(200, []));
    await makeApi().listBranches(SESSION, "biz-1");
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${BASE}/pos/pairing/businesses/biz-1/branches`);
    expect(init.headers.Authorization).toBe("Bearer pairing-jwt");
  });

  test("ownerSignIn and health send no Authorization", async () => {
    // Two live calls share this spy, and each reads its response body — a single shared
    // Response (stubFetch's usual one-shot form) would throw "body already read" on the
    // second call, so this mock hands back a fresh Response per invocation instead.
    const spy = vi.fn().mockImplementation(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", spy);
    await makeApi().health();
    await makeApi().ownerSignIn("maria@kapediaria.ph", "sentry-demo");
    for (const [, init] of spy.mock.calls) {
      expect(init.headers).not.toHaveProperty("Authorization");
    }
  });

  test("unpair sends the device token AND the owner re-auth body", async () => {
    const spy = stubFetch(jsonResponse(201, { ok: true }));
    await makeApi().unpair("maria@kapediaria.ph", "sentry-demo");
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${BASE}/pos/unpair`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer device-secret");
    expect(JSON.parse(init.body)).toEqual({ email: "maria@kapediaria.ph", password: "sentry-demo" });
  });
});

describe("success responses", () => {
  test("getCurrentShift returns null for the literal-null body", async () => {
    stubFetch(new Response("null", { status: 200, headers: { "Content-Type": "application/json" } }));
    await expect(makeApi().getCurrentShift()).resolves.toBeNull();
  });

  test("201 is success (Nest default on POST)", async () => {
    const shift = { id: "s1", openedAt: "2026-08-27T00:00:00Z", closedAt: null, openingCashC: 50000, cashMovements: [] };
    stubFetch(jsonResponse(201, shift));
    await expect(makeApi().openShift(50000)).resolves.toEqual(shift);
  });

  test("listSales omits the date query for null and includes it otherwise", async () => {
    let spy = stubFetch(jsonResponse(200, []));
    await makeApi().listSales({ date: null });
    expect(spy.mock.calls[0][0]).toBe(`${BASE}/pos/sales`);
    spy = stubFetch(jsonResponse(200, []));
    await makeApi().listSales({ date: "2026-08-27" });
    expect(spy.mock.calls[0][0]).toBe(`${BASE}/pos/sales?date=2026-08-27`);
  });
});

describe("error mapping", () => {
  test("unauthorized → UnauthorizedError", async () => {
    stubFetch(jsonResponse(401, { code: "unauthorized", message: "Invalid device token." }));
    await expect(makeApi().pullCatalog()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test("validation → ValidationError carrying the server message", async () => {
    stubFetch(jsonResponse(422, { code: "validation", message: "Totals mismatch." }));
    const err = await makeApi().openShift(0).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toBe("Totals mismatch.");
  });

  test("stock_conflict → StockConflictError with the conflicts payload", async () => {
    const conflicts = [{ lineId: "l1", productId: "p1", variantId: null, availableQty: 2 }];
    stubFetch(jsonResponse(409, { code: "stock_conflict", message: "Insufficient stock", conflicts }));
    const err = await makeApi().completeSale({} as SaleDraft).catch((e) => e);
    expect(err).toBeInstanceOf(StockConflictError);
    expect(err.conflicts).toEqual(conflicts);
  });

  test("pin_invalid → PinInvalidError with attemptsRemaining", async () => {
    stubFetch(jsonResponse(403, { code: "pin_invalid", message: "Wrong PIN", attemptsRemaining: 2 }));
    const err = await makeApi().refundSale("s1", "why", "000000").catch((e) => e);
    expect(err).toBeInstanceOf(PinInvalidError);
    expect(err.attemptsRemaining).toBe(2);
  });

  test("pin_locked → PinLockedError with retryAfterSeconds", async () => {
    stubFetch(jsonResponse(423, { code: "pin_locked", message: "PIN locked", retryAfterSeconds: 287 }));
    const err = await makeApi().refundSale("s1", "why", "000000").catch((e) => e);
    expect(err).toBeInstanceOf(PinLockedError);
    expect(err.retryAfterSeconds).toBe(287);
  });

  test("unknown codes stay base ApiError so screens show the server copy", async () => {
    stubFetch(jsonResponse(401, { code: "login_invalid", message: "Invalid email or password. 3 attempts remaining." }));
    const err = await makeApi().ownerSignIn("a@b.ph", "nope").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(UnauthorizedError);
    expect(err.code).toBe("login_invalid");
    expect(err.message).toBe("Invalid email or password. 3 attempts remaining.");
  });

  test("a non-JSON error body becomes internal_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502 })));
    const err = await makeApi().pullCatalog().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("internal_error");
  });

  test("a fetch rejection becomes NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(makeApi().pullCatalog()).rejects.toBeInstanceOf(NetworkError);
  });

  test("a navigator without an onLine property still makes the request (node env)", async () => {
    // Node's `navigator` global has no `onLine`; a truthiness guard would break the
    // integration suite in Task 4. Missing property must NOT read as offline.
    vi.stubGlobal("navigator", {});
    const spy = stubFetch(jsonResponse(200, []));
    await expect(makeApi().getStockLevels()).resolves.toEqual([]);
    expect(spy).toHaveBeenCalled();
  });

  test("an explicitly offline navigator short-circuits before fetch", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const spy = stubFetch(jsonResponse(200, []));
    await expect(makeApi().getStockLevels()).rejects.toBeInstanceOf(NetworkError);
    expect(spy).not.toHaveBeenCalled();
  });
});
