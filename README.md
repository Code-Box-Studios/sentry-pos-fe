# sentry-pos-fe — Sentry POS terminal

The owner-operated point-of-sale terminal for **Sentry**, a POS system for Philippine small
businesses: pair a device to one branch, open a shift, sell, take payment, print a receipt, and
close the drawer with a Z reading. Built as a **fully static Next.js export** — no server
rendering, no route handlers — so the offline milestone can bolt on cleanly.

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

Serve the export with any static file server: `npx serve out`. The terminal needs no database and
no Docker — in its default mode it runs entirely in the browser.

## Specs

Read these before changing behaviour — they are the source of truth, ahead of any mock or design
file.

| Document | Owns |
| --- | --- |
| [`project-spec.md`](project-spec.md) | Architecture, stack, tenancy, data model, money and time rules, sync design, milestones — system-wide, across all three repos |
| [`pos-spec.md`](pos-spec.md) | What the terminal does: screens, flows, non-goals |
| [`design-spec.md`](design-spec.md) | Visual language: tokens, type, components |
| [`staff-spec.md`](staff-spec.md) | Staff accounts and roles (a later phase) |
| [`analytics-spec.md`](analytics-spec.md) | Portal analytics and reporting |

A pixel reference for all 11 screens is in
[`design/pos-terminal.dc.html`](design/pos-terminal.dc.html) (tablet landscape, 1194×834).

`design-spec.md` is mirrored into `sentry-pos-landing` so that repo stands on its own — change it
in both places or they drift.

## API modes

`NEXT_PUBLIC_API_MODE` (see [`.env.example`](.env.example)) picks the adapter behind `getApi()`.
`mock` (the default) selects `MockPosApi`, a complete in-browser implementation of the `PosApi`
contract that persists to localStorage. `http` selects `HttpPosApi`, which talks to a running
[`sentry-pos-be`](https://github.com/Code-Box-Studios/sentry-pos-be) at `NEXT_PUBLIC_API_URL`
(dev default `http://localhost:4000/v1`). The identities below work in both modes — the backend's
dev seed is mock-parity by design.

| What | Value |
| --- | --- |
| Owner email | `maria@kapediaria.ph` |
| Owner password | `sentry-demo` |
| Refund PIN | `123456` |
| Sample tenant | Kape Diaria (mixed café + retail), branches Marikit `MKT` and Bayanihan `BYN` |

Mock data lives under the localStorage key `sentry-pos:mock:v1`; clear site data to reset to seed.
Four wrong refund PINs lock the terminal for five minutes, exactly as the real API does.

### The API seam

`src/api/client.ts` defines `PosApi` — the single interface every screen talks to, obtained through
`getApi()`. Two adapters implement it: `src/api/mock/` (localStorage-backed) and `src/api/http/`
(fetch against `sentry-pos-be`'s `/v1` surface — device token read from the pairing store, the
`{ code, message }` error envelope mapped onto `src/api/errors.ts`). Both recompute and reject
tampered totals. **Nothing outside `src/api/` changes when switching modes.**

## Running against the live API

The backend lives in the sibling repo [`sentry-pos-be`](https://github.com/Code-Box-Studios/sentry-pos-be),
expected at `../sentry-pos-be`. Its dev seed is mock parity: same owner, same catalog, same
refund PIN.

```bash
# backend — in ../sentry-pos-be (npm, not pnpm)
npm install
cp .env.example .env                 # then CHECK IT — see the warning below
npm run db:up && npx prisma migrate deploy && npm run db:seed
npm run start:dev                    # :4000, Swagger at /docs

# terminal — here, with .env.local set to
#   NEXT_PUBLIC_API_MODE=http
#   NEXT_PUBLIC_API_URL=http://localhost:4000/v1
pnpm dev
```

> **Check `DATABASE_URL` before migrating.** It must point at port **54400** — the backend's own
> Docker Postgres. An absent or stale `.env` can leave it on **5433**, which is the
> `sentry-pos-landing` repo's Payload CMS database; `prisma migrate deploy` will then cheerfully
> write POS migrations into the CMS. `npm install` matters for the same reason: a `node_modules`
> older than `package.json` fails the seed on a missing `argon2`, and a stale generated Prisma
> client fails it on a schema mismatch (`npx prisma generate` fixes that one).

`pnpm test:integration` (with `POS_E2E_API_URL=http://localhost:4000/v1`) drives the whole golden
path — pairing, a worst-case sale, replay, void, refund, Z report — against the live server and
fails if the two totals engines ever disagree.

## Architecture

```
src/
  lib/         pure helpers — money (integer centavos), qty, uuid, time (UTC ⇄ Asia/Manila),
               barcode wedge buffer, day boundary, media queries, API error handling
  domain/      types, cart model, and the totals engine (VAT, SC/PWD, service charge)
  api/         PosApi contract, error taxonomy, and the mock (localStorage) and HTTP adapters
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

## Where this fits

Sentry is split across repos by deployment surface, since each has different runtime needs:

| Repo | Surface | Shape |
| --- | --- | --- |
| **sentry-pos-fe** (this one) | the POS terminal, `pos.` | static Next export, no server |
| [`sentry-pos-landing`](https://github.com/Code-Box-Studios/sentry-pos-landing) | the marketing site, apex domain | Next SSR + Payload + Postgres |
| [`sentry-pos-be`](https://github.com/Code-Box-Studios/sentry-pos-be) | the API, `api.` | NestJS + Prisma + Postgres |

## Not here yet

The offline layer (Dexie mirror, service worker, sync queue), the owner portal (`app.`), split
payments, partial refunds, and staff accounts. See [`pos-spec.md`](pos-spec.md) §12 for the full
non-goals list.
