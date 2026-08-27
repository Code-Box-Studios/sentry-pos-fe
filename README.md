# sentry-pos-fe

The **POS terminal** for Sentry, a point-of-sale system for Philippine small businesses.

## Layout

| Path | What it is | Dev port |
| --- | --- | --- |
| [`pos/`](pos/) | The terminal app — static Next.js export. See [`pos/README.md`](pos/README.md). | 3000 |
| [`design/`](design/) | Rendered pixel reference: `pos-terminal.dc.html` (all 11 screens at tablet landscape). | — |
| [`brand/`](brand/) | Sentry logo marks and lockups. | — |
| [`docs/`](docs/) | Implementation plans and design specs. | — |

The marketing site used to live here as `portal/`. It now has its own repo,
[`sentry-pos-landing`](https://github.com/Code-Box-Studios/sentry-pos-landing) — it is server-rendered
and needs Postgres, where the terminal is a static export that needs neither, so they deploy on
different infrastructure and split cleanly.

## Specs

Read these before changing behaviour — they are the source of truth, ahead of any mock or design
file.

| Document | Owns |
| --- | --- |
| [`project-spec.md`](project-spec.md) | Architecture, stack, tenancy, data model, money and time rules, sync design, milestones |
| [`pos-spec.md`](pos-spec.md) | What the terminal does: screens, flows, non-goals |
| [`design-spec.md`](design-spec.md) | Visual language: tokens, type, components |
| [`staff-spec.md`](staff-spec.md) | Staff accounts and roles (a later phase) |
| [`analytics-spec.md`](analytics-spec.md) | Portal analytics and reporting |

`project-spec.md` stays here as the system-wide source of truth for every repo. `design-spec.md` is
mirrored into `sentry-pos-landing` so that repo stands on its own — change it in both places.
The landing page's own spec moved with the app.

## Running the terminal

```bash
pnpm install:all      # once — root, then pos/
pnpm dev:pos          # http://localhost:3000
```

Or `cd pos && pnpm dev`. The terminal needs no database and no Docker: it runs against an in-browser
mock unless you point it at the API below.

The apps deploy to separate subdomains (`pos.`, the apex, and `app.`, per
[`project-spec.md`](project-spec.md) §12), so each keeps a fixed dev port — they are different
servers, not one site. The root `package.json` exists only to hold the convenience scripts above,
which is why `pos/next.config.ts` pins `outputFileTracingRoot` to its own directory.

## Test accounts

Development only. All of it is seed or local-database data; production credentials come from the
host's secret store.

| Where | Sign in with | Notes |
| --- | --- | --- |
| POS terminal — http://localhost:3000 | `maria@kapediaria.ph` / `sentry-demo` | Refund PIN `123456`. Four wrong PINs lock the terminal for five minutes. |

In mock mode the terminal is backed by `MockPosApi` in localStorage under `sentry-pos:mock:v1` —
clear site data to reset to seed. Its tenant is Kape Diaria, branches Marikit `MKT` and Bayanihan
`BYN`; pairing asks for a business, a branch and a terminal name rather than a code.

## Running the terminal against the live API

The backend lives in the sibling repo [`sentry-pos-be`](https://github.com/Code-Box-Studios/sentry-pos-be),
expected at `../sentry-pos-be`. Its dev seed is FE-mock parity: same owner
(`maria@kapediaria.ph` / `sentry-demo`), same catalog, same refund PIN (`123456`).

```bash
# backend — in ../sentry-pos-be (npm, not pnpm)
npm install
cp .env.example .env                 # then CHECK IT — see the warning below
npm run db:up && npx prisma migrate deploy && npm run db:seed
npm run start:dev                    # :4000, Swagger at /docs

# terminal — from THIS repo's root (dev:pos is a root script, not a pos/ one),
# with pos/.env.local set to
#   NEXT_PUBLIC_API_MODE=http
#   NEXT_PUBLIC_API_URL=http://localhost:4000/v1
pnpm dev:pos
```

> **Check `DATABASE_URL` before migrating.** It must point at port **54400** — the backend's own
> Docker Postgres. An absent or stale `.env` can leave it on **5433**, which is the
> `sentry-pos-landing` repo's Payload CMS database; `prisma migrate deploy` will then cheerfully
> write POS migrations into the CMS. `npm install` matters for the same reason: a `node_modules`
> older than `package.json` fails the seed on a missing `argon2`, and a stale generated Prisma
> client fails it on a schema mismatch (`npx prisma generate` fixes that one).

`pnpm test:integration` inside `pos/` (with `POS_E2E_API_URL=http://localhost:4000/v1`) drives the
whole golden path — pairing, a worst-case sale, replay, void, refund, Z report — against the live
server and fails if the FE and BE totals engines ever disagree.

## Where this fits

| Repo | Surface | Shape |
| --- | --- | --- |
| **sentry-pos-fe** (this one) | the POS terminal, `pos.` | static Next export, no server |
| [`sentry-pos-landing`](https://github.com/Code-Box-Studios/sentry-pos-landing) | the marketing site, apex domain | Next SSR + Payload + Postgres |
| [`sentry-pos-be`](https://github.com/Code-Box-Studios/sentry-pos-be) | the API, `api.` | NestJS + Prisma + Postgres |

The owner portal (`app.`) is not built yet.
