# Sentry POS — terminal app

The owner-operated point-of-sale terminal: pair a device to one branch, open a shift, sell, take
payment, print a receipt, and close the drawer with a Z reading. Built as a **fully static Next.js
export** — no server rendering, no route handlers — so the offline milestone can bolt on cleanly.

Screens and behaviour are specified in [`../pos-spec.md`](../pos-spec.md); money, tenancy and sync
rules live in [`../project-spec.md`](../project-spec.md); the visual language is
[`../design-spec.md`](../design-spec.md), with a pixel reference for all 11 screens in
[`../design/pos-terminal.dc.html`](../design/pos-terminal.dc.html) (tablet landscape, 1194×834).

## Getting started

This project uses **pnpm**. On a machine where the standalone `pnpm` binary is blocked (Windows
Device Guard, for instance), run it through corepack: `corepack pnpm <command>`.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest, single run
pnpm test:watch
pnpm lint
pnpm build      # static export into out/
```

Serve the export with any static file server: `npx serve out`.

## Mock mode

There is no backend yet. `NEXT_PUBLIC_API_MODE=mock` (see `.env.example`) selects `MockPosApi`, a
complete in-browser implementation of the `PosApi` contract that persists to localStorage, so every
flow — pairing, shifts, sales, voids, refunds, stock — works end to end today.

| What | Value |
| --- | --- |
| Owner email | `maria@kapediaria.ph` |
| Owner password | `sentry-demo` |
| Refund PIN | `123456` |
| Sample tenant | Kape Diaria (mixed café + retail), branches Marikit `MKT` and Bayanihan `BYN` |

Mock data lives under the localStorage key `sentry-pos:mock:v1`; clear site data to reset to seed.
Four wrong refund PINs lock the terminal for five minutes, exactly as the real API will.

### The API seam

`src/api/client.ts` defines `PosApi` — the single interface every screen talks to, obtained through
`getApi()`. When `sentry-pos-be` ships, an HTTP adapter (over an openapi-typescript client) joins
`src/api/` alongside the mock and `NEXT_PUBLIC_API_MODE` picks between them. **Nothing outside
`src/api/` changes.**

## Architecture

```
src/
  lib/         pure helpers — money (integer centavos), qty, uuid, time (UTC ⇄ Asia/Manila),
               barcode wedge buffer, day boundary, media queries, API error handling
  domain/      types, cart model, and the totals engine (VAT, SC/PWD, service charge)
  api/         PosApi contract, error taxonomy, and the localStorage-backed mock adapter
  state/       zustand stores — pairing, settings, catalog, cart, shift, last sale
  components/  chrome · numpad · sale · payment · receipt · history · shift · stock · settings
  app/         one route per screen, every one a client component
```

### Rules worth knowing before you change anything

- **All money is integer centavos**, and variables carrying it end in `C` (`unitPriceC`). Round
  half-up at every money-producing step, per line, then sum — never round a precise grand total.
- **Prices are VAT-inclusive.** SC/PWD takes VAT off first, then 20%; a line takes SC/PWD *or* a
  promo discount, whichever is higher, never both.
- **Price locks at add-to-cart.** A catalog change never touches a cart in progress.
- **Receipt numbers are terminal-owned** (`MKT-T1-000318`). The payment screen *peeks* the number and
  only commits it after the sale succeeds, so a failed attempt never burns one.
- **Receipts carry the business's branding only — never Sentry's.**
- Timestamps are stored UTC and displayed Asia/Manila.

The design mock's screen 03/05/06 arithmetic is off by ₱11 (a double-counted discount). The specs
win: for that basket the subtotal is 423.25 and the total 432.86, which is what the tests assert.

## Tests

Vitest with jsdom and Testing Library. The domain layer (money, totals, cart, mock adapter) is
TDD'd; the screens are covered through user-visible behaviour rather than implementation details.

```bash
pnpm test
```

## Not here yet

The offline layer (Dexie mirror, service worker, sync queue), the owner portal, split payments,
partial refunds, and staff accounts. See `pos-spec.md` §12 for the full non-goals list.
