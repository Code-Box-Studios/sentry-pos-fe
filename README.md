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

## Working on the POS app

```bash
cd pos
pnpm install
pnpm dev
```

Sign in with `maria@kapediaria.ph` / `sentry-demo`; the refund PIN is `123456`. Everything is backed
by an in-browser mock until `sentry-pos-be` exists — the POS app needs no database and no Docker.

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
