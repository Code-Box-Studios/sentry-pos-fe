# sentry-pos-fe

Front-end workspace for **Sentry**, a point-of-sale system for Philippine small businesses.

## Layout

| Path | What it is | Dev port |
| --- | --- | --- |
| [`pos/`](pos/) | The POS terminal app — static Next.js export, running today against a mock API. See [`pos/README.md`](pos/README.md). | 3000 |
| [`portal/`](portal/) | The landing page and, later, the owner portal. Hosts the Payload CMS. See [`portal/README.md`](portal/README.md). | 3100 |
| [`design/`](design/) | Rendered pixel references: `pos-terminal.dc.html` (all 11 POS screens at tablet landscape) and `landing.dc.html` (the marketing page). | — |
| [`brand/`](brand/) | Sentry logo marks and lockups. | — |
| [`docs/`](docs/) | Implementation plans. | — |

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
| [`landing-spec.md`](landing-spec.md) | Marketing site |

The two apps deploy to separate subdomains (`pos.` and the apex / `app.`, per [`project-spec.md`](project-spec.md) §12), so each gets its own fixed dev port — they are different servers, not one site.

## Running everything

```bash
pnpm install:all      # once — root, then pos/ and portal/
pnpm db:up            # Postgres, needed by portal/ only
pnpm dev              # both apps, prefixed output, Ctrl-C stops both
```

`pnpm dev` runs the two apps side by side on their fixed ports. They stay separate installs with
separate lockfiles — the root package.json exists only to hold this script, which is why both Next
configs pin `outputFileTracingRoot` to their own directory.

To run one on its own, use `pnpm dev:pos` / `pnpm dev:portal`, or `cd` into either and `pnpm dev`.

## Test accounts

Development only. All of it is seed or local-database data; production credentials come from the
host's secret store.

| Where | Sign in with | Notes |
| --- | --- | --- |
| POS terminal — http://localhost:3000 | `maria@kapediaria.ph` / `sentry-demo` | Refund PIN `123456`. Four wrong PINs lock the terminal for five minutes. |
| CMS — http://localhost:3100/cms | `admin@sentry.local` / `sentry-demo` | Edits the landing page copy. Change it in **Settings → CMS users**. |

The POS is backed by `MockPosApi` in localStorage under `sentry-pos:mock:v1` — clear site data to
reset to seed. Its tenant is Kape Diaria, branches Marikit `MKT` and Bayanihan `BYN`; pairing asks
for a business, a branch and a terminal name rather than a code.

The landing page's **Sign in** button points at the POS in development. In production it belongs to
the owner portal (`app.`, per [`project-spec.md`](project-spec.md) §12), which is not built yet —
see `NEXT_PUBLIC_APP_SIGNIN_URL` in [`portal/.env.example`](portal/.env.example).

## Working on the POS app

Sign in with `maria@kapediaria.ph` / `sentry-demo`; the refund PIN is `123456`. Everything is backed
by an in-browser mock until `sentry-pos-be` exists — the POS app needs no database and no Docker.

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
> Docker Postgres. An absent or stale `.env` can leave it on **5433**, which is *this* repo's
> Payload CMS database (see [Local database](#local-database)); `prisma migrate deploy` will then
> cheerfully write 6 POS migrations into the CMS. `npm install` matters for the same reason:
> a `node_modules` older than `package.json` fails the seed on a missing `argon2`, and a stale
> generated Prisma client fails it on a schema mismatch (`npx prisma generate` fixes that one).

`pnpm test:integration` inside `pos/` (with `POS_E2E_API_URL=http://localhost:4000/v1`) drives the
whole golden path — pairing, a worst-case sale, replay, void, refund, Z report — against the live
server and fails if the FE and BE totals engines ever disagree. Note: the backend's Postgres
(Docker, port 54400) is separate from this repo's `db:up` Postgres (port 5433, Payload CMS only).

## Local database

Where the database is *hosted* is deliberately undecided. Everything that talks to it — Payload, and
later Prisma and the Nest API — takes a plain connection string, so moving to Supabase, Neon or RDS
at deploy time is an environment change and a dump/restore.

```bash
docker compose up -d      # Postgres 17 on localhost:5433
docker compose down       # stop; add -v to wipe the volume and start clean
```

The host port is **5433**, not 5432, to stay out of the way of other projects' containers.

| Role | Connection string | Reaches |
| --- | --- | --- |
| `sentry` | `postgresql://sentry:sentry_dev_password@localhost:5433/sentry` | everything |
| `cms_user` | `postgresql://cms_user:cms_dev_password@localhost:5433/sentry` | the `cms` schema only |

These credentials are development-only and intentionally committed; production values come from the
host's secret store.

The split mirrors the production topology in [`landing-spec.md`](landing-spec.md) §5: the marketing
CMS gets its own schema and its own login, so a compromised CMS credential reaches page copy and
nothing else. `cms_user` is denied `CREATE` in `public`, where tenant data will live — see
[`docker/postgres-init/01-cms-schema.sql`](docker/postgres-init/01-cms-schema.sql).
