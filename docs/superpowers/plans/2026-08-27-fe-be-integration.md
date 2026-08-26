# FE ↔ BE Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The POS terminal talks to the live `sentry-pos-be` NestJS API through a new `HttpPosApi` adapter selected by `NEXT_PUBLIC_API_MODE=http`, with sale retries made replay-safe and a live integration suite proving the FE and BE totals engines agree.

**Architecture:** `pos/src/api/client.ts` already defines the 19-method `PosApi` seam and the BE mirrors it field-for-field at `http://localhost:4000/v1` (operationIds named after the FE methods, same error codes, mock-parity seed). This plan adds a hand-written fetch adapter (`src/api/http/adapter.ts`) that maps the BE's `{ code, message, ...extra }` error envelope onto the existing `src/api/errors.ts` classes and pulls the device token from the pairing store via an injected getter; wires mode selection in `getApi()`; makes the payment page's idempotency UUIDs stable across retries (cart-store-owned, invalidated by any cart mutation); and adds an opt-in vitest suite that runs the golden path against a seeded BE. Design rationale: `docs/superpowers/specs/2026-08-27-fe-be-integration-design.md`.

**Tech Stack:** Next.js 15 (static export) + TypeScript + zustand + vitest 3 (FE, **pnpm**); NestJS 11 + Prisma + Postgres via Docker (BE, **npm**, sibling repo `../sentry-pos-be`).

## Global Constraints

- FE commands run in `sentry-pos-fe/pos/` with pnpm; if the standalone binary is blocked (Windows Device Guard), use `corepack pnpm <command>`. BE commands run in `../sentry-pos-be/` with npm.
- All money is integer centavos; variables carrying it end in `C`. Never touch `src/domain/totals.ts` or `src/lib/money.ts` — parity with the BE recompute is the contract.
- Commit each task directly on `main` (per-project workflow preference). **NEVER run `git push`** — the user pushes manually. **No Claude/AI co-author trailers.**
- The app is a static export (`output: "export"`): no route handlers, no proxy. `NEXT_PUBLIC_*` values are inlined at build time. CORS is the BE's job — its dev `.env` already allows `http://localhost:3000`.
- Do not modify `src/api/mock/**` or existing tests except where a task explicitly says so. The mock stays the default (`NEXT_PUBLIC_API_MODE` unset ⇒ `mock`), so the existing 11 mock-based test files keep passing untouched.
- BE contract facts this plan encodes (verified 2026-08-27): base `http://localhost:4000/v1`; `Authorization: Bearer <deviceToken>` on terminal routes, `Bearer <pairing JWT>` on the three pairing-browse routes; error body `{ code, message, ...extra, requestId }` with **no `statusCode` field**; POSTs return Nest-default 201 except close/void/refund (200) and sale replay (200); `GET /pos/shifts/current` returns literal `null` when no shift is open; sale idempotency is keyed on the client `SaleDraft.id` alone.

---

### Task 1: `HttpPosApi` adapter

**Files:**
- Create: `pos/src/api/http/adapter.ts`
- Test: `pos/src/api/http/adapter.test.ts`

**Interfaces:**
- Consumes: `PosApi` (`pos/src/api/client.ts:8`), error classes (`pos/src/api/errors.ts`), DTO types (`pos/src/api/types.ts`, `pos/src/domain/types.ts`).
- Produces: `class HttpPosApi implements PosApi` with `constructor(opts: HttpPosApiOptions)` where `HttpPosApiOptions = { baseUrl: string; getDeviceToken: () => string | null }`. `baseUrl` has no trailing slash (e.g. `http://localhost:4000/v1`). Task 2 constructs it; Task 4 constructs it directly in the integration suite.

- [ ] **Step 1: Write the failing test**

Create `pos/src/api/http/adapter.test.ts`:

```ts
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
    const spy = stubFetch(jsonResponse(200, { ok: true }));
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `sentry-pos-fe/pos/`): `pnpm vitest run src/api/http/adapter.test.ts`
Expected: FAIL — cannot resolve `./adapter`.

- [ ] **Step 3: Write the implementation**

Create `pos/src/api/http/adapter.ts`:

```ts
import type { BranchInfo, CatalogPayload, StockLevel } from "@/domain/types";
import type {
  BusinessSummary, CashMovement, CompletedSale, OwnerSession, PairingResult,
  SaleDraft, SaleSummary, Shift, ShiftTotals, StockAdjustInput, ZReport,
} from "../types";
import type { PosApi } from "../client";
import {
  ApiError, NetworkError, PinInvalidError, PinLockedError,
  StockConflictError, UnauthorizedError, ValidationError,
  type StockConflict,
} from "../errors";

export interface HttpPosApiOptions {
  /** e.g. "http://localhost:4000/v1" — no trailing slash */
  baseUrl: string;
  /** Read per request so pairing/unpairing needs no adapter rebuild. */
  getDeviceToken: () => string | null;
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
  getCurrentShift(): Promise<Shift | null> {
    return this.request("/pos/shifts/current");
  }
  openShift(openingCashC: number): Promise<Shift> {
    return this.request("/pos/shifts", { method: "POST", body: { openingCashC } });
  }
  addCashMovement(input: { type: "in" | "out"; amountC: number; reason: string }): Promise<CashMovement> {
    return this.request("/pos/shifts/current/cash-movements", { method: "POST", body: input });
  }
  getShiftTotals(): Promise<ShiftTotals> {
    return this.request("/pos/shifts/current/totals");
  }
  closeShift(countedCashC: number): Promise<ZReport> {
    return this.request("/pos/shifts/current/close", { method: "POST", body: { countedCashC } });
  }
  completeSale(draft: SaleDraft): Promise<CompletedSale> {
    return this.request("/pos/sales", { method: "POST", body: draft });
  }
  listSales(filter: { date: string | null }): Promise<SaleSummary[]> {
    return this.request(`/pos/sales${filter.date ? `?date=${filter.date}` : ""}`);
  }
  getSale(id: string): Promise<CompletedSale> {
    return this.request(`/pos/sales/${id}`);
  }
  voidSale(id: string, reason: string): Promise<CompletedSale> {
    return this.request(`/pos/sales/${id}/void`, { method: "POST", body: { reason } });
  }
  refundSale(id: string, reason: string, pin: string): Promise<CompletedSale> {
    return this.request(`/pos/sales/${id}/refund`, { method: "POST", body: { reason, pin } });
  }
  getStockLevels(): Promise<StockLevel[]> {
    return this.request("/pos/stock");
  }
  adjustStock(input: StockAdjustInput): Promise<StockLevel> {
    return this.request("/pos/stock/adjustments", { method: "POST", body: input });
  }
}
```

Note: `errors.ts` exports `StockConflict` as an interface — the `type` keyword in the import block above matters because the file is imported for its classes too.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/api/http/adapter.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Full suite + lint, then commit**

Run: `pnpm test` then `pnpm lint` — both clean (nothing existing imports the new file yet).

```bash
cd sentry-pos-fe
git add pos/src/api/http/
git commit -m "feat(pos): HTTP PosApi adapter mapping the /v1 error contract"
```

---

### Task 2: `http` mode selection, env, Settings surface, README seam

**Files:**
- Modify: `pos/src/api/index.ts` (whole file, 19 lines)
- Modify: `pos/.env.example`, `pos/.env.local` (each currently one line)
- Modify: `pos/src/app/settings/page.tsx:97-106` (Connection card)
- Modify: `pos/src/app/settings/settings.test.tsx` (one new test)
- Modify: `pos/README.md:28-49` (Mock mode + API seam sections)
- Test: `pos/src/api/index.test.ts` (create)

**Interfaces:**
- Consumes: `HttpPosApi`, `HttpPosApiOptions` from Task 1; `usePairingStore` (`pos/src/state/pairing.ts:40` — `getState().deviceToken: string | null`).
- Produces: `getApi(): PosApi` now honoring `NEXT_PUBLIC_API_MODE=http` + `NEXT_PUBLIC_API_URL`; new export `apiTarget(): string` (returns `"mock"` or the live base URL) used by the Settings card. No runtime import cycle: `state/pairing.ts` imports only *types* from `@/api/types`.

- [ ] **Step 1: Write the failing test**

Create `pos/src/api/index.test.ts`:

```ts
import { apiTarget, getApi, setApiForTests } from "./index";
import { HttpPosApi } from "./http/adapter";
import { MockPosApi } from "./mock/adapter";

afterEach(() => {
  setApiForTests(null); // getApi caches a singleton — reset between tests
  vi.unstubAllEnvs();
});

describe("getApi mode selection", () => {
  test("defaults to the mock adapter", () => {
    expect(getApi()).toBeInstanceOf(MockPosApi);
  });

  test("builds the HTTP adapter in http mode (trailing slash trimmed)", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/v1/");
    expect(getApi()).toBeInstanceOf(HttpPosApi);
  });

  test("refuses http mode without a URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(() => getApi()).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  test("refuses unknown modes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "grpc");
    expect(() => getApi()).toThrow(/Unknown NEXT_PUBLIC_API_MODE/);
  });
});

describe("apiTarget", () => {
  test("reports mock by default", () => {
    expect(apiTarget()).toBe("mock");
  });

  test("reports the live URL in http mode", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/v1");
    expect(apiTarget()).toBe("http://localhost:4000/v1");
  });
});
```

(Verified empirically 2026-08-27: vitest does NOT load Next's `.env.local` into `process.env` — a probe test read `undefined` for both vars while `.env.local` set `NEXT_PUBLIC_API_MODE=mock`. So the "default" tests see them unset regardless of what Step 4 writes, and flipping `.env.local` to http mode cannot disturb the existing suite.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/api/index.test.ts`
Expected: FAIL — `apiTarget` is not exported, and the http-mode test hits the current `not implemented yet` throw.

- [ ] **Step 3: Replace `pos/src/api/index.ts`**

```ts
import type { PosApi } from "./client";
import { MockPosApi } from "./mock/adapter";
import { HttpPosApi } from "./http/adapter";
import { usePairingStore } from "@/state/pairing";

let instance: PosApi | null = null;

/** "mock" or the live base URL — surfaced on the Settings connection card. */
export function apiTarget(): string {
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  return mode === "http" ? (process.env.NEXT_PUBLIC_API_URL || "http (no URL set)") : mode;
}

export function getApi(): PosApi {
  if (instance) return instance;
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  if (mode === "http") {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_MODE=http requires NEXT_PUBLIC_API_URL (e.g. "http://localhost:4000/v1")');
    }
    instance = new HttpPosApi({
      baseUrl,
      getDeviceToken: () => usePairingStore.getState().deviceToken,
    });
    return instance;
  }
  if (mode !== "mock") {
    throw new Error(`Unknown NEXT_PUBLIC_API_MODE "${mode}" — use "mock" or "http"`);
  }
  instance = new MockPosApi();
  return instance;
}

export function setApiForTests(api: PosApi | null): void { instance = api; }
```

- [ ] **Step 4: Update the env files**

`pos/.env.example` becomes:

```
# "mock" = in-browser MockPosApi (no backend needed) · "http" = live sentry-pos-be
NEXT_PUBLIC_API_MODE=mock
# Required when NEXT_PUBLIC_API_MODE=http. sentry-pos-be dev default:
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
```

`pos/.env.local` (gitignored — edit, don't stage) becomes:

```
NEXT_PUBLIC_API_MODE=http
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run src/api/index.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Surface the target on the Settings connection card**

In `pos/src/app/settings/page.tsx`, the file already imports `getApi` from `@/api` — extend that import to include `apiTarget`, then change the Connection card description (currently lines 97-106) to:

```tsx
        <SettingCard
          title="Connection"
          description={`${healthy === false ? "Offline" : "Online"} · ${
            healthy === false ? "API unreachable" : "API reachable"
          } · API ${apiTarget()} · last catalog load ${loadedAt}`}
        >
```

Add to `pos/src/app/settings/settings.test.tsx` (after the existing `"the header names the pairing and the version"` test, reusing its `beforeEach`):

```tsx
test("the connection card names the API target", async () => {
  render(<SettingsPage />);
  expect(await screen.findByText(/API mock ·/)).toBeInTheDocument();
});
```

Run: `pnpm vitest run src/app/settings/settings.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 7: Rewrite the README seam sections**

In `pos/README.md`, retitle `## Mock mode` to `## API modes` and replace its intro paragraph (currently "There is no backend yet. …works end to end today.") with:

```markdown
`NEXT_PUBLIC_API_MODE` (see `.env.example`) picks the adapter behind `getApi()`. `mock` (the
default) selects `MockPosApi`, a complete in-browser implementation of the `PosApi` contract that
persists to localStorage. `http` selects `HttpPosApi`, which talks to a running
[`sentry-pos-be`](https://github.com/Code-Box-Studios/sentry-pos-be) at `NEXT_PUBLIC_API_URL`
(dev default `http://localhost:4000/v1`). The identities below work in both modes — the backend's
dev seed is mock-parity by design.
```

Replace the `### The API seam` section body (currently "…When `sentry-pos-be` ships, an HTTP adapter (over an openapi-typescript client)…") with:

```markdown
`src/api/client.ts` defines `PosApi` — the single interface every screen talks to, obtained through
`getApi()`. Two adapters implement it: `src/api/mock/` (localStorage-backed) and `src/api/http/`
(fetch against `sentry-pos-be`'s `/v1` surface — device token read from the pairing store, the
`{ code, message }` error envelope mapped onto `src/api/errors.ts`). Both recompute and reject
tampered totals. `src/test/integration/live-api.test.ts` proves the two totals engines agree:
`pnpm test:integration` with `POS_E2E_API_URL` set (see the workspace README). **Nothing outside
`src/api/` changes when switching modes.**
```

Also on line 42, change "exactly as the real API will" to "exactly as the real API does".

- [ ] **Step 8: Full suite, lint, commit**

Run: `pnpm test` then `pnpm lint`
Expected: all green (settings tests still run against the mock; `apiTarget()` reads unset env ⇒ "mock").

```bash
cd sentry-pos-fe
git add pos/src/api/index.ts pos/src/api/index.test.ts pos/.env.example pos/src/app/settings/ pos/README.md
git commit -m "feat(pos): http API mode with env-selected adapter and settings surface"
```

---

### Task 3: Stable sale idempotency ids across payment retries

The BE deduplicates `POST /pos/sales` on the client-generated `SaleDraft.id` alone. The payment page currently mints a fresh UUID inside every Charge press, so a timeout-after-commit followed by a retry sends a *new* id — the replay never triggers and the retry dies on the `(terminalId, receiptNo)` unique check instead ("This receipt number is already in use", with the sale actually committed). The ids must live with the cart: stable across retries of the same cart, invalidated by ANY cart mutation (a changed cart replayed under the old id would silently return the *previous* sale as success).

**Files:**
- Modify: `pos/src/state/cart.ts` (interface :20-42, `mutate` :62-63, actions :164-186, initial state :69-71, partialize :193)
- Modify: `pos/src/app/payment/page.tsx:58-77` (draft construction)
- Test: `pos/src/state/cart.pending.test.ts` (create)

**Interfaces:**
- Consumes: `newId()` (`pos/src/lib/uuid.ts`), existing `CartState`.
- Produces: `CartState` gains `pendingSaleId: string | null`, `pendingPaymentId: string | null`, and `ensurePendingIds(): { saleId: string; paymentId: string }`. Task 4's replay test relies on this retry semantic end-to-end.

- [ ] **Step 1: Write the failing test**

Create `pos/src/state/cart.pending.test.ts`:

```ts
import { useCartStore } from "./cart";

beforeEach(() => {
  useCartStore.getState().resetAll();
});

test("ids are stable across retries of the same cart", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  const first = useCartStore.getState().ensurePendingIds();
  expect(useCartStore.getState().ensurePendingIds()).toEqual(first);
  expect(first.saleId).not.toBe(first.paymentId);
});

test("any cart mutation invalidates the pending ids", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  const first = useCartStore.getState().ensurePendingIds();
  useCartStore.getState().addMisc("Sticker", 2000);
  const second = useCartStore.getState().ensurePendingIds();
  expect(second.saleId).not.toBe(first.saleId);
  expect(second.paymentId).not.toBe(first.paymentId);
});

test("clear() drops the ids with the cart", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().ensurePendingIds();
  useCartStore.getState().clear();
  expect(useCartStore.getState().pendingSaleId).toBeNull();
  expect(useCartStore.getState().pendingPaymentId).toBeNull();
});

test("hold() starts the new cart without inherited ids", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().ensurePendingIds();
  useCartStore.getState().hold("Table 4", "shift-1");
  expect(useCartStore.getState().pendingSaleId).toBeNull();
});
```

(`addMisc` is used deliberately — it needs no catalog store setup.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/state/cart.pending.test.ts`
Expected: FAIL — `ensurePendingIds` is not a function.

- [ ] **Step 3: Implement in `pos/src/state/cart.ts`**

Add to `CartState` (after `conflictLineIds` at :24):

```ts
  /** Idempotency ids for the in-flight payment — stable across retries of the SAME cart. */
  pendingSaleId: string | null;
  pendingPaymentId: string | null;
  /** Mint-once; any cart mutation invalidates (a changed cart is a NEW sale, never a replay). */
  ensurePendingIds(): { saleId: string; paymentId: string };
```

Change `mutate` (:62-63) so every cart mutation invalidates the ids:

```ts
      const mutate = (fn: (cart: Cart) => Cart) =>
        set((s) => ({ cart: fn(s.cart), conflictLineIds: [], pendingSaleId: null, pendingPaymentId: null }));
```

Add to the returned object's initial state (:69-71): `pendingSaleId: null, pendingPaymentId: null,` and the action:

```ts
        ensurePendingIds: () => {
          const { pendingSaleId, pendingPaymentId } = get();
          if (pendingSaleId && pendingPaymentId) return { saleId: pendingSaleId, paymentId: pendingPaymentId };
          const ids = { saleId: newId(), paymentId: newId() };
          set({ pendingSaleId: ids.saleId, pendingPaymentId: ids.paymentId });
          return ids;
        },
```

The four actions that swap carts via raw `set` (they bypass `mutate`) each get `pendingSaleId: null, pendingPaymentId: null` added to their `set` object: `hold` (:164-169), `resume` (:171-180), `clear` (:184), `resetAll` (:186).

Extend `partialize` (:193) so the ids survive a reload mid-uncertainty:

```ts
      partialize: (s) => ({ cart: s.cart, heldCarts: s.heldCarts, pendingSaleId: s.pendingSaleId, pendingPaymentId: s.pendingPaymentId }),
```

- [ ] **Step 4: Use the stable ids in `pos/src/app/payment/page.tsx`**

In `complete()` (:52), replace the two `id: newId()` fields (:59 and :69):

```ts
    // Stable across retries: a timeout-after-commit replays server-side (same sale id → the
    // stored sale comes back) instead of colliding on the receipt number.
    const { saleId, paymentId } = useCartStore.getState().ensurePendingIds();

    const draft: SaleDraft = {
      id: saleId,
      // Peek, never consume: a failed attempt must not burn a receipt number.
      receiptNo: pairing.peekReceiptNo(),
      ...
      payment: {
        id: paymentId,
        ...
```

(everything else in the draft literal is unchanged). If `newId` is now unused in the file, remove its import (:18) — `pnpm lint` will confirm.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/state/cart.pending.test.ts src/app/payment/payment.test.tsx`
Expected: PASS — including the existing payment suite (the success path calls `clearCart()`, which now also clears the ids, so consecutive sales still get distinct ids).

- [ ] **Step 6: Full suite, lint, commit**

Run: `pnpm test` then `pnpm lint`
Expected: all green.

```bash
cd sentry-pos-fe
git add pos/src/state/cart.ts pos/src/state/cart.pending.test.ts pos/src/app/payment/page.tsx
git commit -m "fix(pos): stable sale idempotency ids across payment retries"
```

---

### Task 4: Live integration suite + full-stack docs + end-to-end verification

**Files:**
- Create: `pos/vitest.integration.config.ts`, `pos/src/test/integration/live-api.test.ts`
- Modify: `pos/vitest.config.ts:10-17` (exclude the integration dir), `pos/package.json:5-12` (script)
- Modify: `README.md` (workspace root `sentry-pos-fe/README.md` — append a section)

**Interfaces:**
- Consumes: `HttpPosApi` (Task 1), `computeTotals` (`pos/src/domain/totals.ts:34`), seed identities (owner `maria@kapediaria.ph` / `sentry-demo`, refund PIN `123456`, business "Kape Diaria", branch `MKT`, ube loaf seeded at qty 0).
- Produces: `pnpm test:integration`, gated on `POS_E2E_API_URL`; skipped (green) when unset.

- [ ] **Step 1: Keep the integration dir out of the default run**

In `pos/vitest.config.ts`, add to the `test` block (the integration file matches vitest's default include, and the jsdom setup file would clash with it):

```ts
import { configDefaults, defineConfig } from "vitest/config";
...
  test: {
    ...
    exclude: [...configDefaults.exclude, "src/test/integration/**"],
  },
```

Create `pos/vitest.integration.config.ts` (node environment, no jsdom setup file, longer timeout for a real server):

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/integration/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
    // one worker — the suite is a sequential golden path against one live server
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

Add to `pos/package.json` scripts: `"test:integration": "vitest run -c vitest.integration.config.ts"`.

- [ ] **Step 2: Write the integration suite**

Create `pos/src/test/integration/live-api.test.ts`:

```ts
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

function line(partial: Partial<CartLine> & Pick<CartLine, "productId" | "name" | "qty" | "unitPriceC">): CartLine {
  return {
    id: newId(), variantId: null, soldBy: "unit", modifiers: [],
    discount: null, scPwdMarked: false, trackStock: true, ...partial,
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
    lines: [line({ productId: pandesal.id, name: pandesal.name, qty: 1, unitPriceC: pandesal.priceC })],
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
        line({ productId: iced.id, variantId: variant.id, name: `${iced.name} — ${variant.name}`, qty: 2, unitPriceC: variant.priceC, modifiers: mods }),
        line({ productId: rice.id, name: rice.name, soldBy: "weight", qty: 0.75, unitPriceC: rice.priceC, scPwdMarked: true }),
        line({ productId: pandesal.id, name: pandesal.name, qty: 3, unitPriceC: pandesal.priceC }),
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
      lines: [line({ productId: ube.id, name: ube.name, qty: 1, unitPriceC: ube.priceC })],
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
```

- [ ] **Step 3: Verify the suite is green when skipped and excluded from the default run**

Run: `pnpm test:integration` (without `POS_E2E_API_URL`)
Expected: 1 skipped file, exit 0.
Run: `pnpm test`
Expected: unchanged pass count — the integration file must NOT appear.

- [ ] **Step 4: Boot the backend and run the suite live**

In `../sentry-pos-be/` (first run also needs `cp .env.example .env` — check whether `.env` exists first):

```bash
npm install
npm run db:up                  # Postgres 16 in Docker on localhost:54400
npx prisma migrate deploy
npm run db:seed                # Kape Diaria seed — FE-mock parity
npm run start:dev              # http://localhost:4000, Swagger at /docs
```

Then in `sentry-pos-fe/pos/` — PowerShell:

```powershell
$env:POS_E2E_API_URL = "http://localhost:4000/v1"; corepack pnpm test:integration
```

(bash: `POS_E2E_API_URL=http://localhost:4000/v1 pnpm test:integration`)

Expected: PASS — 9 tests. **The parity test is the moment of truth**: if `completeSale` rejects with `ValidationError` here, the FE and BE totals engines disagree; STOP, diff `pos/src/domain/totals.ts` against `../sentry-pos-be/src/common/totals/` for the failing draft, and report the divergence — do not "fix" it by adjusting either engine without the user.

- [ ] **Step 5: Manual smoke of the real UI against the live BE**

With the BE still running and `pos/.env.local` in http mode (Task 2 Step 4): `pnpm dev`, open `http://localhost:3000`, pair with `maria@kapediaria.ph` / `sentry-demo` → Kape Diaria → Marikit, open a shift, ring up an Iced Latte, take cash payment, confirm the receipt screen. Then Settings: the Connection card must read `API http://localhost:4000/v1` and HEALTHY.

- [ ] **Step 6: Document the full-stack workflow**

Append to the workspace root `README.md` (`sentry-pos-fe/README.md`):

````markdown
## Running the terminal against the live API

The backend lives in the sibling repo [`sentry-pos-be`](https://github.com/Code-Box-Studios/sentry-pos-be),
expected at `../sentry-pos-be`. Its dev seed is FE-mock parity: same owner
(`maria@kapediaria.ph` / `sentry-demo`), same catalog, same refund PIN (`123456`).

```bash
# backend — in ../sentry-pos-be (npm, not pnpm)
npm run db:up && npx prisma migrate deploy && npm run db:seed
npm run start:dev                    # :4000, Swagger at /docs

# terminal — in pos/, with .env.local set to
#   NEXT_PUBLIC_API_MODE=http
#   NEXT_PUBLIC_API_URL=http://localhost:4000/v1
pnpm dev:pos
```

`pnpm test:integration` inside `pos/` (with `POS_E2E_API_URL=http://localhost:4000/v1`) drives the
whole golden path — pairing, a worst-case sale, replay, void, refund, Z report — against the live
server and fails if the FE and BE totals engines ever disagree. Note: the backend's Postgres
(Docker, port 54400) is separate from this repo's `db:up` Postgres (port 5433, Payload CMS only).
````

- [ ] **Step 7: Full verification sweep, commit**

Run in `pos/`: `pnpm test`, `pnpm lint`, `pnpm build`
Expected: all green; the build proves the static export still compiles with the new adapter in the graph.

```bash
cd sentry-pos-fe
git add pos/vitest.config.ts pos/vitest.integration.config.ts pos/package.json pos/src/test/integration/ README.md
git commit -m "test(pos): live FE-BE integration suite proving totals parity, full-stack docs"
```

---

## After the last task

Tell the user the work is committed on `main` and ready for **them** to push (pushing is manual in this workspace). Flag two follow-ups that were noticed and deliberately left alone: the BE's `JWT_PAIRING_SECRET` env var is required-but-unused (pairing JWTs are signed with `JWT_ACCESS_SECRET`), and `GET /v1/pos/session` exists as a possible authed heartbeat for the Settings card if wanted later.
