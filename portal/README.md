# Sentry portal — landing page and CMS

Two things live here today: the public marketing page at `/`, and the Payload CMS that edits its
copy at `/cms`. The owner portal — dashboard, analytics, catalogue — is the next thing to land in
this app, at the `app.` subdomain.

Unlike [`../pos/`](../pos/), this app is **server-rendered**. It talks to Postgres, so it needs
Docker running; the terminal needs neither.

Behaviour is specified in [`../landing-spec.md`](../landing-spec.md); the visual language is
[`../design-spec.md`](../design-spec.md), with the rendered reference in
[`../design/landing.dc.html`](../design/landing.dc.html).

## Getting started

```bash
docker compose up -d      # from the repo root — Postgres on :5433
pnpm install
pnpm dev                  # http://localhost:3100
```

Or run both apps at once with `pnpm dev` from the repo root.

| Script | Does |
| --- | --- |
| `pnpm dev` | Next dev server on port 3100 |
| `pnpm build` | Production build — runs migrations' worth of schema expectations, so the database must be up |
| `pnpm lint` | ESLint |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` after a collection or global changes |
| `pnpm payload migrate:create <name>` | New migration — **needs a real terminal**, see below |
| `pnpm payload migrate` | Apply pending migrations |

## Signing in to the CMS

Development account: `admin@sentry.local` / `sentry-demo`. Manage accounts under
**Settings → CMS users**. If the database is fresh, the first visit to `/cms` prompts you to create
the first user instead.

The CMS connects as `cms_user`, which holds rights in the `cms` schema and nowhere else — a
compromised marketing login reaches page copy, not sales data (landing-spec §5).

## The landing page

Every string on the page comes from the **Landing page** global — nothing is hardcoded in
components. Saving it calls `revalidateTag`, so an edit is live within seconds while visitors keep
being served a static page.

What is deliberately *not* editable: the product mockups in
[`src/components/landing/mockups/`](src/components/landing/mockups/). The dashboard, the POS grid,
the tax summary and the device trio are illustrations of the software rather than copy — there is
no portal to screenshot yet, and a hand-built mockup can stay honest about what the product does.
`features[].icon` and `branches[].mockup` are the seams: an editor chooses *which* illustration,
never what is inside it.

Their figures are not decorative either. Every cart on the page rings up the basket asserted in
[`../pos/src/domain/totals.test.ts`](../pos/src/domain/totals.test.ts), shared through
[`src/components/landing/mockups/demo-cart.ts`](src/components/landing/mockups/demo-cart.ts), so
the columns survive being added up.

## Migrations

`payload migrate:create` needs an interactive terminal: when the schema drops one table and adds
others, drizzle-kit asks "created, or renamed from X?" once per table, and there is no flag to
answer in advance. Run it in your own shell, not through a script or a CI step.

## Environment

Copy `.env.example` to `.env`. The committed values are development-only.

| Variable | For |
| --- | --- |
| `DATABASE_URI` | Postgres, as `cms_user` |
| `PAYLOAD_SECRET` | Signs Payload's JWTs — must be replaced in production |
| `NEXT_PUBLIC_APP_SIGNIN_URL` | Where the landing page's **Sign in** goes; the owner portal in production, the POS locally |
