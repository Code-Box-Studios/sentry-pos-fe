# FE ↔ BE Integration — Design

**Date:** 2026-08-27
**Goal:** The POS terminal (`pos/`) talks to the live NestJS API (`sentry-pos-be`) instead of the in-memory mock. Product code outside `src/api` changes in exactly two places: the payment page's idempotency ids (a real-network hazard the mock hid) and one line on the Settings connection card; everything else is adapter, config, tests, and docs.

## Context

- The FE was built against a 19-method `PosApi` interface (`pos/src/api/client.ts`) with `MockPosApi` behind a module singleton `getApi()` (`pos/src/api/index.ts`). `NEXT_PUBLIC_API_MODE=mock` is the only mode implemented; any other value throws.
- The BE was built to mirror that interface field-for-field: all 19 operations exist under `http://localhost:4000/v1` with operationIds named after the `PosApi` methods, the same error codes the FE's error classes carry, and a dev seed that is byte-for-byte the FE mock seed (Maria / Kape Diaria / PIN 123456). The BE contract e2e suite (`test/contract.e2e-spec.ts`) pins all of this.
- Documented divergences (BE plan §"known divergences", BE README): sign-in returns **401 `login_invalid`** / **423 `login_locked`** where the mock threw `validation`; POSTs return Nest-default **201**; `GET /pos/shifts/current` returns literal `null` (200) when no shift is open; error bodies are `{ code, message, ...extra, requestId }` with **no `statusCode`** field.

## Decision: hand-written HTTP adapter (not the openapi-typescript client)

The old plans promised "openapi-typescript client when the BE ships." That promise no longer pays: the emitted `openapi.json` carries **request DTO schemas only — every response schema is empty** (BE response types are plain TS interfaces, which Nest Swagger cannot introspect). A generated client would type every response `unknown`, forcing casts to the very hand-written types the FE already owns.

Rejected alternatives:

- **B — openapi-typescript + openapi-fetch as promised:** requires first decorating ~15 BE response classes so schemas exist, creating a third copy of the contract for compile-time drift-checking the BE contract suite already provides at test time. Heavy, deferred value.
- **C — hybrid (hand-written adapter + generated request-side types):** the request DTOs *are* the FE's own `SaleDraft` etc.; checking them against a generated copy of themselves adds a codegen pipeline for near-zero signal.

**Chosen: A — `HttpPosApi`, a hand-written fetch adapter (~250 lines) implementing the existing `PosApi` interface with the existing types in `pos/src/api/types.ts` / `pos/src/domain/types.ts`.** Drift is guarded by the BE contract suite (operationIds + shapes + status codes) plus a new FE-side live integration suite (below) that exercises the one contract surface types cannot check: totals-recompute parity.

## Design

### 1. Adapter and selection

- New `pos/src/api/http/adapter.ts`: `class HttpPosApi implements PosApi`, constructor `{ baseUrl: string; getDeviceToken: () => string | null }`.
- `pos/src/api/index.ts` gains the `http` branch: `NEXT_PUBLIC_API_MODE=http` + `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4000/v1`) construct `new HttpPosApi({ baseUrl, getDeviceToken: () => usePairingStore.getState().deviceToken })`. Missing URL in http mode → explicit construction-time error. Default mode stays `mock` (tests and demo builds keep working untouched).
- Token plumbing stays out of the adapter's method signatures: 13 of 19 methods take no session argument, so the adapter pulls the device token through the injected getter per request. The four pairing-phase calls (`listBusinesses`, `listBranches`, `pairTerminal`) send `session.token` (the 10-minute pairing JWT) instead; `unpair` sends the device token plus owner re-auth in the body; `ownerSignIn` and `health` are unauthenticated. The zustand pairing store is readable outside React (`getState()`), and `index.ts` — not the adapter — owns the store import, so the adapter stays dependency-free and unit-testable.

### 2. Request helper and error mapping

One private `request(path, { method, body, token })` helper: JSON in/out, `Authorization: Bearer <token>` when a token is supplied, any thrown fetch error → `NetworkError`. Non-2xx parses `{ code, message, ...extra }` and maps:

| BE `code` | FE error class | extra carried |
|---|---|---|
| `unauthorized` | `UnauthorizedError` | — |
| `validation` | `ValidationError` | — |
| `stock_conflict` | `StockConflictError` | `conflicts[]` |
| `pin_invalid` | `PinInvalidError` | `attemptsRemaining` |
| `pin_locked` | `PinLockedError` | `retryAfterSeconds` |
| anything else (`login_invalid`, `login_locked`, `owner_suspended`, `forbidden`, `not_found`, …) | base `ApiError(code, message)` | — |

The default branch is sufficient UI-wise: every inline error site renders `ApiError.message`, and BE messages are user-facing (the pairing screen shows "Invalid email or password" / lockout copy without new FE error classes). Unparseable error body → `ApiError("internal_error", generic message)`. Success-path quirks handled in the adapter: `getCurrentShift` returns the literal-`null` body as `null`; `listSales` appends `?date=` only when non-null; 200-vs-201 is ignored (any 2xx is success, which also makes sale replay transparent).

### 3. Stable idempotency ids

`payment/page.tsx` currently mints `draft.id = newId()` and `payment.id = newId()` inside `complete()` — a fresh UUID per Charge press. Against a real network, a timeout-after-commit followed by a retry sends a *different* sale id, so the BE's sale-id idempotency never triggers; the retry instead collides on `(terminalId, receiptNo)` → 422 "receipt number already in use", a stuck till with a committed-but-unacknowledged sale.

Fix: the cart store owns `pendingSaleId` / `pendingPaymentId`, minted lazily on first use and **cleared only by `clearCart()`** (i.e. after a confirmed success). A retry of the same cart re-sends the same ids → BE replays with the byte-identical stored sale (200) → the till completes normally. This also matches project-spec §5's offline design, where the queued sale carries one stable client UUID. The ids persist with the cart (zustand `persist`), so even an app reload mid-uncertainty retries correctly.

### 4. Live integration suite (totals parity guard)

New `pos/src/test/integration/live-api.test.ts`, skipped unless `POS_E2E_API_URL` is set (script: `test:integration`); runs vitest in node environment with real fetch against a locally seeded BE. Golden path: sign in → pair a fresh terminal → pull catalog → open shift → complete a worst-case cart (variant + both modifier groups, weight line 0.750, SC/PWD marked line, named order discount) with totals computed by the FE's `domain/totals.ts` → expect success (proves FE/BE recompute parity, the one drift the type system can't see) → replay the same draft (expect identical sale back) → wrong-PIN refund (`PinInvalidError.attemptsRemaining`) → oversell ube loaf (`StockConflictError.conflicts`) → void → close shift and check `ZReport` math. Each run pairs a new terminal (T-codes are never reused by design); `npm run db:seed` on the BE resets.

### 5. Config, docs, small UI touch

- `pos/.env.example` documents both modes plus `NEXT_PUBLIC_API_URL`; `.env.local` flips to `http` for daily dev. Both are build-time inlined (`output: "export"`), so production builds set them at build time; CORS is the BE's job and its dev allow-list already includes `http://localhost:3000`.
- Settings → Connection card additionally shows the active mode and base URL (one-line change; today it only proves reachability via `health()`).
- `pos/README.md` "API seam" section rewritten (mock **and** http); root `README` gains the full-stack dev workflow (BE: `db:up` → `migrate deploy` → `db:seed` → `start:dev`; FE: `dev:pos` with http mode).

## Out of scope

- **Offline layer** (queue, retry, sync chips) — separate milestone per pos-spec §10; this phase stays online-first and synchronous.
- **BE changes** — none required. Known BE oddity left as-is and documented: `JWT_PAIRING_SECRET` is validated-required but unused (pairing JWTs are signed with `JWT_ACCESS_SECRET`).
- **Portal ↔ BE integration**, `GET /v1/pos/session` adoption as an authed heartbeat, and response-schema Swagger decoration — all deferred until wanted.
- Retry/backoff logic — a failed call surfaces the existing offline toast; the stable-id fix makes manual retry safe, which is enough until the offline milestone.

## Testing

- **Unit (always-on):** `HttpPosApi` against a stubbed `fetch` — header selection (device vs pairing vs none), every error-code mapping incl. extras, literal-`null` shift, `?date=` handling, network failure → `NetworkError`, missing-URL construction error. Cart-store test: pending ids survive a failed attempt, die on `clearCart()`.
- **Existing suites:** untouched — mock remains the default test adapter (`setApiForTests`), including the mock-only `debugRevokeDevice()` test.
- **Live integration (opt-in):** the §4 suite, run manually or in CI-with-services.

## Risks

- **Totals rounding divergence** FE `domain/totals.ts` vs BE `common/totals` shows up as a 422 at the till — exactly what §4 exists to catch before a human does.
- **Static-export env inlining** means switching API URL requires a rebuild; acceptable for this phase, noted in README.
- **`whitelist: true` without `forbidNonWhitelisted`** on the BE silently strips unknown request fields, which can disguise an FE payload mistake as a totals mismatch; the integration suite's exact-shape assertions mitigate.
