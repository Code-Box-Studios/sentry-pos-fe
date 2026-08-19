# sentry-pos-fe

Front-end workspace for **Sentry**, a point-of-sale system for Philippine small businesses.

## Layout

| Path | What it is |
| --- | --- |
| [`pos/`](pos/) | The POS terminal app — static Next.js export, running today against a mock API. See [`pos/README.md`](pos/README.md). |
| `portal/` | The business-owner portal. Not started. |
| [`design/`](design/) | `pos-terminal.dc.html` — pixel reference for all 11 POS screens at tablet landscape. |
| [`brand/`](brand/) | Sentry logo marks and lockups. |
| [`docs/`](docs/) | Implementation plans. |

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

## Working on the POS app

```bash
cd pos
pnpm install
pnpm dev
```

Sign in with `maria@kapediaria.ph` / `sentry-demo`; the refund PIN is `123456`. Everything is backed
by an in-browser mock until `sentry-pos-be` exists.
