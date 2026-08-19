# POS Terminal MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Sentry POS terminal app (`pos/` in `sentry-pos-fe`) — all 11 designed screens with the complete owner-operated sale → payment → receipt → shift-close flow — running standalone against a mock API adapter until `sentry-pos-be` exists.

**Architecture:** Next.js 15 static export (`output: 'export'`, client-only) single-page-per-screen app. All domain logic (centavo money math, cart totals, SC/PWD, receipt numbering) lives in pure TypeScript modules under `src/lib` + `src/domain`, TDD'd with Vitest. A typed `PosApi` interface is the seam to the future NestJS backend; a `MockPosApi` adapter (localStorage-persisted, seeded with the Kape Diaria sample tenant) implements it fully so every flow works today; swapping to HTTP + the OpenAPI-generated client later touches only `src/api`. UI is shadcn/ui primitives restyled to the Sentry design language (design-spec.md tokens: brand-green pills, 12px cards, ink/teal palette, Figtree), with Zustand stores for cart/pairing/settings state.

**Tech Stack:** Next.js 15 (App Router, static export) · React 19 · TypeScript 5 strict · Tailwind CSS v4 · shadcn/ui · Zustand 5 (with `persist`) · Vitest 3 + @testing-library/react · Figtree + Source Code Pro via `next/font`.

## Global Constraints

Copied from the specs — every task implicitly includes these:

- **TypeScript everywhere, `strict: true`. No `.js` source files.** (project-spec §3)
- **POS app fully static:** `output: 'export'`; **no server rendering, server actions, or route handlers** in `pos/`. All screens are client components. (project-spec §3)
- **All money is integer centavos.** Suffix money variables/fields with `C` (e.g. `unitPriceC`). Quantities are decimals with 3 dp max. (project-spec §6–7)
- **Rounding: half-up at every money-producing step; round per line, then sum. Never round a precise grand total.** (project-spec §7)
- **VAT-inclusive prices**; included VAT = `total × rate ÷ (1 + rate)`. **SC/PWD:** VAT off first (`÷ (1 + rate)`), then 20% off; a line takes SC/PWD **or** promo, whichever is higher, never both. **Service charge** = `round(rate × discounted subtotal)`, dine-in only. (project-spec §7)
- **Client-generated UUIDs for every sale/movement/shift event; append-only events; price locks at add-to-cart; no price overrides.** (project-spec §5, pos-spec §4)
- **Receipt numbers `{branchCode}-{terminalCode}-{seq}`, sequence owned by the terminal**; `DEMO-` prefix when the business `is_demo`. (project-spec §5.4, §8)
- **Receipts carry business branding only — never Sentry's.** (pos-spec §6)
- **Timestamps stored as UTC ISO strings; displayed as Asia/Manila.** (project-spec §7)
- **Design language:** shadcn/ui components restyled with design-spec tokens — pill buttons (`rounded-full`) always, 12px card radius, no hero bands on operational screens, Figtree self-hosted via `next/font` (no font CDN at runtime). Pixel reference: `design/pos-terminal.dc.html` (11 screens, 1194×834 tablet landscape). (design-spec, user directive)
- **Git workflow (user directive):** work directly on `main`; after each task commit **and push**: `git add -A && git commit -m "..." && git push origin main`. **Never add a Claude co-author trailer to any commit.** First commit runs `git branch -M main` and `git push -u origin main`.
- **Known design-mock arithmetic slip:** screen 03/05/06 of the design shows subtotal 434.25 / total 444.41, but the pictured lines sum to **423.25** (the +11.00 Merienda discount was double-counted). The spec math wins: subtotal 423.25, discount −11.00, service charge 20.61 (5% of 412.25), **total 432.86**, VAT included 46.38. Tests use the spec-correct numbers.
- All commands below run from `sentry-pos-fe/pos/` unless the path is shown explicitly. The repo root is `sentry-pos-fe/`.

## Repo File Map (end state)

```
sentry-pos-fe/
  project-spec.md, pos-spec.md, design-spec.md, staff-spec.md,
  analytics-spec.md, landing-spec.md          # already staged, Task 1 commits
  brand/                                       # 5 logo SVGs (staged)
  design/pos-terminal.dc.html (+ support.js, brand/)  # pixel reference (staged)
  docs/superpowers/plans/                      # this plan
  pos/
    next.config.ts, tsconfig.json, vitest.config.ts, components.json
    .env.local, .env.example
    public/brand/*.svg
    src/
      app/            # one route per screen: /, /pair, /shift-open, /sale,
                      # /payment, /receipt, /history, /shift, /stock, /settings
      lib/            # money.ts qty.ts uuid.ts time.ts barcode.ts day-boundary.ts
                      # use-media.ts version.ts handle-api-error.ts utils.ts(shadcn cn)
      domain/         # types.ts cart.ts totals.ts
      api/            # types.ts errors.ts client.ts index.ts mock/{seed,store,adapter}.ts
      state/          # pairing.ts settings.ts catalog.ts cart.ts shift.ts lastSale.ts
      components/
        ui/           # shadcn (restyled)
        chrome/       # TopBar.tsx StatusChips.tsx TerminalGate.tsx PairingFlow.tsx
        numpad/       # Numpad.tsx MoneyPad.tsx PinEntry.tsx
        sale/         # ProductGrid, ProductTile, CategoryTabs, SearchBar, CartPane,
                      # CartLineRow, TotalsFooter, VariantModifierSheet, MiscItemModal,
                      # WeightModal, DiscountPicker, ScPwdModal, HeldCartsSheet,
                      # HoldDialog, useBarcodeWedge.ts
        payment/      # MethodPills.tsx CashPanel.tsx NonCashPanel.tsx OrderSummaryRail.tsx
        receipt/      # ReceiptView.tsx PrintRoot.tsx printReceipt.ts sampleSale.ts
        history/      # SaleRow.tsx SaleDetail.tsx VoidDialog.tsx RefundDialog.tsx
        shift/        # ShiftTotalsCards.tsx CashMovementList.tsx CashMoveDialog.tsx
                      # ClosePanel.tsx ZReportView.tsx DayBoundaryBanner.tsx
        stock/        # StockList.tsx AdjustDialog.tsx
        settings/     # UnpairDialog.tsx TestPrint.tsx
      test/           # setup.ts utils.ts
```

---

### Task 1: Repo scaffold — Next app, Tailwind v4 tokens, shadcn/ui restyle, fonts, Vitest

**Files:**
- Commit staged root files: `project-spec.md`, `pos-spec.md`, `design-spec.md`, `staff-spec.md`, `analytics-spec.md`, `landing-spec.md`, `brand/*.svg`, `design/*`
- Create: `pos/` via create-next-app; `pos/next.config.ts`; `pos/src/app/globals.css` (token theme); `pos/src/app/layout.tsx`; `pos/src/app/page.tsx` (placeholder); `pos/vitest.config.ts`; `pos/src/test/setup.ts`; `pos/components.json` + `pos/src/components/ui/*` via shadcn CLI; `pos/public/brand/*.svg` (copies); root `.gitignore`
- Test: `pos/src/test/smoke.test.tsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the running app shell; Tailwind token classes used by every later task (`bg-surface`, `bg-page`, `text-ink`, `text-slate`, `text-steel`, `text-stone`, `text-mist`, `bg-brand-green`, `text-green-dark`, `bg-green-soft`, `border-hairline`, `border-hairline-strong`, `border-hairline-soft`, `bg-warn-bg`, `text-warn-text`, `bg-danger`, `text-danger`, `bg-danger-bg`, `font-mono`); restyled shadcn `Button` (variants `default` green pill / `secondary` outline pill / `dark` ink pill / `destructive` / `ghost`), `Card`, `Dialog`, `Input`, `Label`, `Badge`, `Tabs`, `Separator`, `ScrollArea`, `Sheet`, `Sonner`; `cn()` from `@/lib/utils`; npm scripts `dev`, `build`, `test`, `lint`.

- [ ] **Step 1: Commit the staged reference material (first commit on main)**

```bash
cd sentry-pos-fe
printf 'node_modules/\n.next/\nout/\n.DS_Store\n' > .gitignore
git add -A
git commit -m "docs: add spec documents, brand assets, and POS design reference"
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Scaffold the Next app**

```bash
cd sentry-pos-fe
npx create-next-app@15 pos --typescript --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Replace `pos/next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
```

Copy brand assets into the app: `mkdir -p pos/public/brand && cp brand/*.svg pos/public/brand/`

- [ ] **Step 3: shadcn init + components, restyled to the design language**

```bash
cd pos
npx shadcn@2 init -d
npx shadcn@2 add button card dialog input label badge tabs separator scroll-area sheet sonner
```

Pin the CLI major: `shadcn@2` is the Radix-era generator whose button/card/input/badge files match the restyle edits in this step — `shadcn@latest` now emits Base UI components with a different file structure. This step MUST run before Step 4: `shadcn init` rewrites `globals.css`, so the token theme is applied after it.

Then edit `src/components/ui/button.tsx` — replace the `buttonVariants` definition so the pill is the brand signature:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:bg-hairline disabled:text-stone outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-brand-green text-ink active:bg-green-pressed active:text-white",
        secondary: "border border-hairline-strong bg-transparent text-slate active:bg-hairline-soft",
        dark: "bg-ink text-white active:bg-slate",
        destructive: "bg-danger text-white active:bg-danger/80",
        "outline-destructive": "border border-danger bg-transparent text-danger active:bg-danger-bg",
        ghost: "rounded-lg text-ink active:bg-hairline-soft",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-4 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

Edit `src/components/ui/card.tsx`: base classes become `rounded-lg border border-hairline bg-card text-card-foreground shadow-none` (12px cards, flat — no default shadow per design-spec elevation 0). Edit `src/components/ui/input.tsx`: base height/border become `h-11 rounded-[8px] border border-hairline-strong bg-white px-3.5 text-base focus-visible:border-green-dark focus-visible:ring-0 focus-visible:border-2`. Edit `src/components/ui/badge.tsx`: default `rounded-full` and add variants `warn` (`bg-warn-bg text-warn-text`), `soft-green` (`bg-green-soft text-green-dark`), `danger-soft` (`bg-danger-bg text-danger`), `neutral` (`bg-hairline text-steel`) alongside `default`.

- [ ] **Step 4: Fonts + token theme (after the shadcn CLI)**

`pos/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Figtree, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", weight: ["400", "500", "600", "700"] });
const sourceCodePro = Source_Code_Pro({ subsets: ["latin"], variable: "--font-scp", weight: ["400", "600"] });

export const metadata: Metadata = { title: "Sentry POS" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} ${sourceCodePro.variable} font-sans bg-surface text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

Replace the generated `pos/src/app/globals.css` with the block below — **keep any `@import` lines the shadcn CLI added at the top** (e.g. `@import "tw-animate-css";`) and any `@custom-variant dark` line; the `--font-sans`/`--font-mono` lines below must be the FINAL definitions in the file (`shadcn init` writes a circular `--font-sans: var(--font-sans)` that this replacement removes):

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-figtree), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: var(--font-scp), "SF Mono", Menlo, Consolas, monospace;

  /* Sentry design-spec tokens */
  --color-ink: #001e2b;
  --color-slate: #3d4f58;
  --color-steel: #5c6c75;
  --color-stone: #889397;
  --color-mist: #b8c4c2;
  --color-brand-green: #00ed64;
  --color-green-dark: #00684a;
  --color-green-pressed: #004d37;
  --color-green-soft: #e3fcf7;
  --color-hairline: #e8edeb;
  --color-hairline-strong: #c1c7c6;
  --color-hairline-soft: #f1f4f3;
  --color-surface: #f9fbfa;
  --color-page: #edf1f0;
  --color-warn-bg: #ffec9e;
  --color-warn-text: #944f01;
  --color-danger: #b1371f;
  --color-danger-bg: #fbe9e9;

  /* shadcn semantic slots mapped to Sentry values */
  --color-background: #f9fbfa;
  --color-foreground: #001e2b;
  --color-card: #ffffff;
  --color-card-foreground: #001e2b;
  --color-popover: #ffffff;
  --color-popover-foreground: #001e2b;
  --color-primary: #00ed64;
  --color-primary-foreground: #001e2b;
  --color-secondary: #e3fcf7;
  --color-secondary-foreground: #00684a;
  --color-muted: #f1f4f3;
  --color-muted-foreground: #5c6c75;
  --color-accent: #e8edeb;
  --color-accent-foreground: #001e2b;
  --color-destructive: #b1371f;
  --color-destructive-foreground: #ffffff;
  --color-border: #e8edeb;
  --color-input: #c1c7c6;
  --color-ring: #00684a;

  --radius-lg: 12px;
  --radius-xl: 16px;
}

@media print {
  body > * { display: none !important; }
  #print-root { display: block !important; }
}

#print-root { display: none; }
```

(The print rules are consumed in Task 17.) After replacing, verify the font wiring survived the CLI: `grep -- "--font-figtree" src/app/globals.css` must match.

- [ ] **Step 5: Vitest setup + smoke test**

```bash
npm i zustand
npm i -D vitest@3 @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

(`zustand` is a runtime dep used from Task 7 on; `vitest@3` is pinned — `vitest@latest` is v4 with a different config surface.) Then edit `pos/tsconfig.json` `compilerOptions`: add `"types": ["node", "vitest/globals"]` — the test files use bare `test`/`expect` globals, and `next build` type-checks them; keep `"node"` in the array since an explicit `types` list disables auto-inclusion of `@types/node`.

`pos/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`pos/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

Add to `pos/package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`.

`pos/src/test/smoke.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

test("restyled button renders as a pill with label", () => {
  render(<Button>Pair terminal</Button>);
  const btn = screen.getByRole("button", { name: "Pair terminal" });
  expect(btn).toBeInTheDocument();
  expect(btn.className).toContain("rounded-full");
});
```

- [ ] **Step 6: Verify: `npm test` passes, `npm run lint` clean, `npm run build` produces `out/`**

Run all three; all must succeed. `pos/src/app/page.tsx` can stay as the CNA placeholder for now (replaced in Task 7).

- [ ] **Step 7: Commit & push**

```bash
cd sentry-pos-fe
git add -A && git commit -m "feat(pos): scaffold static Next app with Sentry-tokened Tailwind v4 + restyled shadcn/ui + Vitest" && git push origin main
```

---

### Task 2: Core utilities — money, quantity, uuid, time (TDD)

**Files:**
- Create: `pos/src/lib/money.ts`, `pos/src/lib/qty.ts`, `pos/src/lib/uuid.ts`, `pos/src/lib/time.ts`
- Test: `pos/src/lib/money.test.ts`, `pos/src/lib/qty.test.ts`, `pos/src/lib/time.test.ts`

**Interfaces:**
- Produces:
  - `money.ts`: `halfUp(x: number): number` (half-up for non-negative inputs, half-away-from-zero for negatives); `pesos(p: number): number` (pesos → centavos, e.g. `pesos(85) === 8500`); `formatC(c: number): string` (`8500 → "85.00"`, thousands separators, sign preserved); `formatPeso(c: number): string` (`"₱85.00"`); `parsePesoInput(s: string): number | null` (user-keyed "2000" or "2,000.50" → centavos; null on invalid); `mulRate(c: number, rate: number): number` (= `halfUp(c * rate)`); `pct(c: number, percent: number): number` (= `halfUp(c * percent / 100)`); `vatIncluded(totalC: number, rate: number): number` (= `halfUp(totalC * rate / (1 + rate))`).
  - `qty.ts`: `qtyToMilli(q: number): number` (0.750 → 750, guards ≤3dp); `milliToQty(m: number): number`; `formatQty(q: number, soldBy: "unit" | "weight"): string` (`6 → "6"`, `0.75 → "0.750"`); `mulQtyPriceC(qty: number, unitPriceC: number): number` (= `halfUp(qtyToMilli(qty) * unitPriceC / 1000)`).
  - `uuid.ts`: `newId(): string` (crypto.randomUUID with getRandomValues fallback).
  - `time.ts`: `nowIso(): string`; `formatManilaTime(iso: string): string` (`"10:42"` 24h); `formatManilaTime12(iso: string): string` (`"7:02 AM"` 12h — for the shift status chip); `formatManilaDateTime(iso: string): string` (`"19 Aug 2026 10:42"`); `manilaDateKey(iso: string): string` (`"2026-08-19"`).

- [ ] **Step 1: Write failing tests**

`pos/src/lib/money.test.ts` (representative — write all of these):

```ts
import { halfUp, pesos, formatC, formatPeso, parsePesoInput, pct, mulRate, vatIncluded } from "./money";

test("halfUp rounds .5 up, away from zero for negatives", () => {
  expect(halfUp(2061.25)).toBe(2061);
  expect(halfUp(2061.5)).toBe(2062);
  expect(halfUp(-10.5)).toBe(-11);
});
test("pesos converts to integer centavos", () => {
  expect(pesos(85)).toBe(8500);
  expect(pesos(0.5)).toBe(50);
});
test("formatC groups thousands", () => {
  expect(formatC(8500)).toBe("85.00");
  expect(formatC(1824050)).toBe("18,240.50");
  expect(formatC(-31000)).toBe("-310.00");
});
test("formatPeso prefixes ₱", () => {
  expect(formatPeso(44441)).toBe("₱444.41");
});
test("parsePesoInput handles keyed amounts", () => {
  expect(parsePesoInput("2000")).toBe(200000);
  expect(parsePesoInput("2,000.50")).toBe(200050);
  expect(parsePesoInput("0.5")).toBe(50);
  expect(parsePesoInput("abc")).toBeNull();
  expect(parsePesoInput("1.234")).toBeNull(); // >2dp of pesos is invalid input
});
test("pct: half-up per spec", () => {
  expect(pct(11000, 10)).toBe(1100);
  expect(pct(41225, 5)).toBe(2061); // 2061.25 rounds down
});
test("vatIncluded extracts 12% from inclusive total", () => {
  expect(vatIncluded(43286, 0.12)).toBe(4638);
  expect(vatIncluded(6071, 0)).toBe(0);
});
test("mulRate", () => {
  expect(mulRate(41225, 0.05)).toBe(2061);
});
```

`pos/src/lib/qty.test.ts`:

```ts
import { qtyToMilli, milliToQty, formatQty, mulQtyPriceC } from "./qty";

test("qtyToMilli/milliToQty round-trip at 3dp", () => {
  expect(qtyToMilli(0.75)).toBe(750);
  expect(qtyToMilli(23.45)).toBe(23450);
  expect(milliToQty(750)).toBe(0.75);
});
test("qtyToMilli rejects >3dp", () => {
  expect(() => qtyToMilli(0.7501)).toThrow();
});
test("formatQty", () => {
  expect(formatQty(6, "unit")).toBe("6");
  expect(formatQty(0.75, "weight")).toBe("0.750");
});
test("weight line total rounds half-up per line", () => {
  expect(mulQtyPriceC(0.75, 9500)).toBe(7125); // 0.750 kg × ₱95.00
  expect(mulQtyPriceC(6, 1200)).toBe(7200);
});
```

`pos/src/lib/time.test.ts`:

```ts
import { formatManilaTime, formatManilaTime12, formatManilaDateTime, manilaDateKey } from "./time";

test("UTC renders as Asia/Manila (+08:00)", () => {
  expect(formatManilaTime("2026-08-19T02:42:00.000Z")).toBe("10:42");
  expect(formatManilaTime12("2026-08-18T23:02:00.000Z")).toBe("7:02 AM");
  expect(formatManilaDateTime("2026-08-19T02:42:00.000Z")).toBe("19 Aug 2026 10:42");
  expect(manilaDateKey("2026-08-18T17:30:00.000Z")).toBe("2026-08-19"); // 01:30 Manila next day
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → modules not found.

- [ ] **Step 3: Implement**

`pos/src/lib/money.ts`:

```ts
export function halfUp(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x));
}

export function pesos(p: number): number {
  return halfUp(p * 100);
}

export function formatC(c: number): string {
  const sign = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  const whole = Math.floor(abs / 100).toLocaleString("en-PH");
  const cents = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${cents}`;
}

export function formatPeso(c: number): string {
  return c < 0 ? `-₱${formatC(-c)}` : `₱${formatC(c)}`;
}

export function parsePesoInput(s: string): number | null {
  const cleaned = s.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return halfUp(parseFloat(cleaned) * 100);
}

export function mulRate(c: number, rate: number): number {
  return halfUp(c * rate);
}

export function pct(c: number, percent: number): number {
  return halfUp((c * percent) / 100);
}

export function vatIncluded(totalC: number, rate: number): number {
  if (rate === 0) return 0;
  return halfUp((totalC * rate) / (1 + rate));
}
```

`pos/src/lib/qty.ts`:

```ts
import { halfUp } from "./money";

export function qtyToMilli(q: number): number {
  const m = q * 1000;
  const rounded = Math.round(m);
  if (Math.abs(m - rounded) > 1e-6) throw new Error(`quantity ${q} exceeds 3 decimal places`);
  return rounded;
}

export function milliToQty(m: number): number {
  return m / 1000;
}

export function formatQty(q: number, soldBy: "unit" | "weight"): string {
  return soldBy === "weight" ? (qtyToMilli(q) / 1000).toFixed(3) : String(q);
}

export function mulQtyPriceC(qty: number, unitPriceC: number): number {
  return halfUp((qtyToMilli(qty) * unitPriceC) / 1000);
}
```

`pos/src/lib/uuid.ts`:

```ts
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

`pos/src/lib/time.ts`:

```ts
const TZ = "Asia/Manila";

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatManilaTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function formatManilaTime12(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(/ /g, " "); // normalize the narrow no-break space some ICU builds emit
}

export function formatManilaDateTime(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(d);
  return `${date} ${formatManilaTime(iso)}`;
}

export function manilaDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return parts; // en-CA yields YYYY-MM-DD
}
```

- [ ] **Step 4: Run tests — all pass.** Fix any `en-GB` short-month casing mismatch by asserting the actual stable output (e.g. `"19 Aug 2026 10:42"`); do not loosen assertions to regexes.

- [ ] **Step 5: Commit & push** — `git add -A && git commit -m "feat(pos): money/qty/uuid/time core utilities" && git push origin main`

---

### Task 3: Domain types + Kape Diaria seed catalog

**Files:**
- Create: `pos/src/domain/types.ts`, `pos/src/api/mock/seed.ts`
- Test: `pos/src/api/mock/seed.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact shapes every later task uses):

```ts
// pos/src/domain/types.ts
export type BusinessType = "retail" | "fnb" | "mixed";
export type OrderType = "dine_in" | "takeout" | "none";
export type PaymentMethod = "cash" | "card" | "gcash" | "maya" | "other";
export type SoldBy = "unit" | "weight";
export type AdjustReason = "damage" | "expiry" | "theft_loss" | "count_correction" | "other";

export interface BusinessSettings {
  id: string;
  name: string;
  type: BusinessType;
  currency: "PHP";
  taxRate: number;            // 0.12
  serviceChargeRate: number;  // 0.05; 0 disables
  allowMiscItems: boolean;
  isDemo: boolean;
  dayStartTime: string;       // "HH:mm", e.g. "04:00"
  receiptHeader: string;      // freeform, holds TIN + address lines
  receiptFooter: string;
}

export interface BranchInfo { id: string; name: string; code: string; address: string }

export interface Category { id: string; name: string; sortOrder: number }

export interface ProductVariant { id: string; name: string; sku: string | null; barcode: string | null; priceC: number }

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceC: number;             // base price; variant price wins when variant chosen
  soldBy: SoldBy;
  lowStockThreshold: number | null;
  trackStock: boolean;
  active: boolean;
  variants: ProductVariant[];         // empty = no variants
  modifierGroupIds: string[];         // empty = no modifier sheet
}

export interface Modifier { id: string; name: string; priceDeltaC: number }

export interface ModifierGroup { id: string; name: string; minSelect: number; maxSelect: number; modifiers: Modifier[] }

export interface NamedDiscount {
  id: string;
  name: string;
  kind: "percent" | "fixed";
  value: number;              // percent 0–100, or centavos when fixed
  appliesTo: "line" | "order" | "both";
  active: boolean;
}

export interface StockLevel { productId: string; variantId: string | null; qty: number }

export interface CatalogPayload {
  business: BusinessSettings;
  branch: BranchInfo;
  terminal: { name: string; code: string };
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  discounts: NamedDiscount[];
  stock: StockLevel[];
  loadedAt: string;
}
```

- `seed.ts`: `makeSeedCatalog(): Omit<CatalogPayload, "terminal" | "loadedAt">` + `export const SEED_OWNER = { email: "maria@kapediaria.ph", password: "sentry-demo", refundPin: "123456", name: "Maria Reyes" }` + `export const SEED_BRANCHES: BranchInfo[]` (Marikit `MKT`, Bayanihan `BYN`) + `export const SEED_BUSINESSES` (Kape Diaria `mixed`, non-demo, taxRate 0.12, serviceChargeRate 0.05, dayStartTime `"04:00"`, allowMiscItems true; plus "Kape Diaria (Demo)" with `isDemo: true`, same catalog).

Seed products mirror the design screen 03 exactly: Espresso ₱85 sku `CF-101` (Coffee) · Iced Latte sku `CF-102` (matches the design-04 sheet header) with variants Small ₱120 / Medium ₱130 / Large ₱145 + groups "Size" (in variants), "Milk" (min 0 max 1: **Oat milk** +₱25, **Fresh milk** +₱0 — full labels; the design and later test fixtures render "Oat milk"), "Add-ons" (min 0 max 3: Extra shot +₱30, Vanilla +₱15, Less ice +₱0) · Cappuccino ₱120 · Spanish Latte ₱140 · Pan de sal ₱12 (track, threshold 10, stock 8 → LOW) · Ensaymada ₱55 · Cheese roll ₱40 · Ube loaf ₱120 (track, stock 0 → OUT) · Coke 1.5L ₱98 barcode `4800888000015` (track, stock 46) · Jasmine rice ₱95/kg weight (track, stock 23.45) · Lucky Me pancit ₱15 barcode `4807770270019` (track, stock 62) · Kopiko 3-in-1 ₱9 barcode `4800361413480` (track, stock 120). Categories: Coffee, Bakery, Grocery, Meals. Discounts: "Merienda 10%" percent 10 both · "₱20 off" fixed 2000 order · "Barkada 5%" percent 5 order. Untracked products (coffee drinks) have `trackStock: false`, `lowStockThreshold: null`. Give every product a short SKU (`CF-1xx` coffee, `BK-1xx` bakery, `GR-2xx` grocery/meals) so Task 10's SKU search is exercisable against the seed.

- [ ] **Step 1: Write failing test** — `pos/src/api/mock/seed.test.ts`:

```ts
import { makeSeedCatalog } from "./seed";

test("seed satisfies catalog invariants", () => {
  const c = makeSeedCatalog();
  expect(c.products.length).toBeGreaterThanOrEqual(12);
  const skus = c.products.flatMap((p) => [p.sku, ...p.variants.map((v) => v.sku)]).filter(Boolean);
  expect(new Set(skus).size).toBe(skus.length); // unique per business
  const barcodes = c.products.flatMap((p) => [p.barcode, ...p.variants.map((v) => v.barcode)]).filter(Boolean);
  expect(new Set(barcodes).size).toBe(barcodes.length);
  const latte = c.products.find((p) => p.name === "Iced Latte")!;
  expect(latte.sku).toBe("CF-102"); // design 04 sheet header depends on it
  expect(latte.variants.map((v) => v.priceC)).toEqual([12000, 13000, 14500]);
  expect(latte.modifierGroupIds.length).toBe(2); // Milk, Add-ons (size is variants)
  const oat = c.modifierGroups.find((g) => g.id === "mg-milk")!.modifiers.find((m) => m.id === "mod-oat")!;
  expect(oat.name).toBe("Oat milk"); // full label — design + later fixtures render "Oat milk"
  const rice = c.products.find((p) => p.name === "Jasmine rice")!;
  expect(rice.soldBy).toBe("weight");
  const stockFor = (name: string) => c.stock.find((s) => s.productId === c.products.find((p) => p.name === name)!.id)!.qty;
  expect(stockFor("Pan de sal")).toBe(8);
  expect(stockFor("Ube loaf")).toBe(0);
  expect(stockFor("Jasmine rice")).toBe(23.45);
  expect(c.business.taxRate).toBe(0.12);
  expect(c.business.serviceChargeRate).toBe(0.05);
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `types.ts` (verbatim from Interfaces above) and `seed.ts`** with these EXACT literal ids (later tasks' tests hardcode them): products `prod-espresso`, `prod-latte`, `prod-cappuccino`, `prod-spanish`, `prod-pandesal`, `prod-ensaymada`, `prod-cheeseroll`, `prod-ubeloaf`, `prod-coke`, `prod-rice`, `prod-luckyme`, `prod-kopiko`; categories `cat-coffee`, `cat-bakery`, `cat-grocery`, `cat-meals`; variants `var-latte-s`, `var-latte-m`, `var-latte-l`; modifier groups `mg-milk` (min 0, max 1), `mg-addons` (min 0, max 3); modifiers `mod-oat`, `mod-fresh`, `mod-shot`, `mod-vanilla`, `mod-lessice`; discounts `disc-merienda`, `disc-20off`, `disc-barkada`. Tasks 6 and 16 depend specifically on `prod-espresso`, `prod-pandesal`, `prod-ubeloaf`, `prod-rice`.
- [ ] **Step 4: Run tests — pass.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): domain types + Kape Diaria seed catalog"`

---

### Task 4: Cart model + totals engine (TDD — the money core)

**Files:**
- Create: `pos/src/domain/cart.ts`, `pos/src/domain/totals.ts`
- Test: `pos/src/domain/totals.test.ts`

**Interfaces:**
- Consumes: `halfUp`, `pct`, `mulRate`, `vatIncluded` (Task 2 money.ts); `mulQtyPriceC` (qty.ts); Task 3 types.
- Produces:

```ts
// pos/src/domain/cart.ts
import type { OrderType, SoldBy } from "./types";

export type DiscountSpec =
  | { source: "named"; discountId: string; name: string; kind: "percent" | "fixed"; value: number }
  | { source: "free"; kind: "percent" | "fixed"; value: number };

export interface CartModifier { groupId: string; modifierId: string; name: string; priceDeltaC: number }

export interface CartLine {
  id: string;
  productId: string | null;   // null = misc line
  variantId: string | null;
  name: string;               // snapshot, e.g. "Iced Latte — Large"
  soldBy: SoldBy;
  qty: number;
  unitPriceC: number;         // locked at add-to-cart (variant price when variant)
  modifiers: CartModifier[];
  discount: DiscountSpec | null;
  scPwdMarked: boolean;       // participates in SC/PWD when cart.scPwd is set
  trackStock: boolean;
}

export interface ScPwdInfo { idNo: string; name: string }

export interface Cart {
  id: string;
  orderType: OrderType;
  lines: CartLine[];
  orderDiscount: DiscountSpec | null;
  scPwd: ScPwdInfo | null;
}

export function lineUnitWithModsC(line: CartLine): number; // unitPriceC + Σ modifier deltas
export function emptyCart(): Cart;                          // newId(), orderType "none", no lines
```

```ts
// pos/src/domain/totals.ts
export interface LineTotals {
  lineId: string;
  grossC: number;             // mulQtyPriceC(qty, unitWithMods) — rounded per line
  promoDiscountC: number;     // candidate promo amount (capped ≤ grossC)
  scPwdDiscountC: number;     // candidate SC/PWD amount (0 unless marked & cart.scPwd)
  applied: "promo" | "scpwd" | null;  // higher-of; tie → scpwd; null when both 0
  netC: number;               // grossC − applied amount
}

export interface CartTotals {
  lines: LineTotals[];
  subtotalC: number;           // Σ grossC
  promoDiscountC: number;      // Σ applied promo + order discount
  scPwdDiscountC: number;      // Σ applied scpwd
  discountedSubtotalC: number; // subtotal − promoDiscount − scPwdDiscount
  serviceChargeC: number;      // dine-in only: mulRate(discountedSubtotal, scRate)
  totalC: number;              // discountedSubtotal + serviceCharge
  vatExemptSalesC: number;     // Σ netC of scpwd-applied lines
  vatC: number;                // vatIncluded(totalC − vatExemptSales, taxRate)
  vatableSalesC: number;       // (totalC − vatExemptSales) − vatC
}

export function computeTotals(cart: Cart, s: { taxRate: number; serviceChargeRate: number }): CartTotals;
```

Algorithm (implement exactly):
1. Per line: `grossC = mulQtyPriceC(qty, lineUnitWithModsC(line))`.
2. `promoDiscountC`: named/free percent → `pct(grossC, value)`; fixed → `min(value, grossC)`. 0 when no line discount.
3. `scPwdDiscountC` (only when `cart.scPwd && line.scPwdMarked`): `base = halfUp(grossC / (1 + taxRate)); pay = pct(base, 80); scPwdDiscountC = grossC − pay`.
4. `applied`: whichever candidate is larger; **tie goes to scpwd**; null if both zero. `netC = grossC − appliedAmount`.
5. `subtotalC = Σ grossC`. Line promo total = Σ promo where applied === "promo".
6. Order discount base = Σ `netC` of lines where `applied !== "scpwd"` (no double discount). Percent → `pct(base, value)`; fixed → `min(value, base)`. `promoDiscountC = linePromoTotal + orderDiscountC`.
7. `discountedSubtotalC = subtotalC − promoDiscountC − scPwdDiscountC` (≥ 0 by the caps).
8. `serviceChargeC = orderType === "dine_in" ? mulRate(discountedSubtotalC, serviceChargeRate) : 0`.
9. `totalC = discountedSubtotalC + serviceChargeC`.
10. `vatExemptSalesC = Σ netC` of scpwd-applied lines; `vatC = vatIncluded(totalC − vatExemptSalesC, taxRate)`; `vatableSalesC = totalC − vatExemptSalesC − vatC`.

- [ ] **Step 1: Write failing tests** — `pos/src/domain/totals.test.ts`. Include ALL of the following (helper `line(...)` builds a `CartLine` with defaults):

```ts
import { computeTotals } from "./totals";
import type { Cart, CartLine } from "./cart";
import { newId } from "@/lib/uuid";

const S = { taxRate: 0.12, serviceChargeRate: 0.05 };

function line(partial: Partial<CartLine> & { name: string; unitPriceC: number; qty: number }): CartLine {
  return {
    id: newId(), productId: "p", variantId: null, soldBy: "unit",
    modifiers: [], discount: null, scPwdMarked: true, trackStock: false, ...partial,
  };
}
function cart(lines: CartLine[], partial: Partial<Cart> = {}): Cart {
  return { id: newId(), orderType: "none", lines, orderDiscount: null, scPwd: null, ...partial };
}

test("design cart, spec-correct: subtotal 423.25 → total 432.86", () => {
  const c = cart(
    [
      line({ name: "Iced Latte — Large", unitPriceC: 14500, qty: 1,
        modifiers: [{ groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 }] }),
      line({ name: "Pan de sal", unitPriceC: 1200, qty: 6 }),
      line({ name: "Ensaymada", unitPriceC: 5500, qty: 2,
        discount: { source: "named", discountId: "disc-merienda", name: "Merienda 10%", kind: "percent", value: 10 } }),
      line({ name: "Jasmine rice", unitPriceC: 9500, qty: 0.75, soldBy: "weight" }),
    ],
    { orderType: "dine_in" }
  );
  const t = computeTotals(c, S);
  expect(t.lines.map((l) => l.grossC)).toEqual([17000, 7200, 11000, 7125]);
  expect(t.subtotalC).toBe(42325);
  expect(t.promoDiscountC).toBe(1100);
  expect(t.scPwdDiscountC).toBe(0);
  expect(t.discountedSubtotalC).toBe(41225);
  expect(t.serviceChargeC).toBe(2061);   // 5% of 412.25 = 2061.25 → 2061
  expect(t.totalC).toBe(43286);
  expect(t.vatC).toBe(4638);
  expect(t.vatableSalesC).toBe(38648);
  expect(t.vatExemptSalesC).toBe(0);
});

test("service charge only on dine-in", () => {
  const c = cart([line({ name: "Espresso", unitPriceC: 8500, qty: 1 })], { orderType: "takeout" });
  expect(computeTotals(c, S).serviceChargeC).toBe(0);
});

test("SC/PWD: VAT off then 20% off; sale becomes VAT-exempt", () => {
  const c = cart([line({ name: "Espresso", unitPriceC: 8500, qty: 1 })],
    { scPwd: { idNo: "SC-1234-5678", name: "Jose Cruz" } });
  const t = computeTotals(c, S);
  // base = 8500/1.12 = 7589.29 → 7589; pay = 80% = 6071.2 → 6071; discount 2429
  expect(t.scPwdDiscountC).toBe(2429);
  expect(t.totalC).toBe(6071);
  expect(t.vatExemptSalesC).toBe(6071);
  expect(t.vatC).toBe(0);
  expect(t.vatableSalesC).toBe(0);
});

test("higher-of rule: scpwd 28.57% beats promo 25%, loses to promo 30%", () => {
  const base = { name: "Item", unitPriceC: 10000, qty: 1 };
  const scpwdCart = (promoPct: number) =>
    cart([line({ ...base, discount: { source: "free", kind: "percent", value: promoPct } })],
      { scPwd: { idNo: "X", name: "Y" } });
  const t25 = computeTotals(scpwdCart(25), S);
  expect(t25.lines[0]!.applied).toBe("scpwd");     // 2857 > 2500
  expect(t25.scPwdDiscountC).toBe(2857);
  expect(t25.promoDiscountC).toBe(0);              // promo not applied → not counted
  const t30 = computeTotals(scpwdCart(30), S);
  expect(t30.lines[0]!.applied).toBe("promo");     // 3000 > 2857
  expect(t30.promoDiscountC).toBe(3000);
  expect(t30.vatExemptSalesC).toBe(0);             // line stays VATable
});

test("discount caps: fixed line discount cannot exceed line; order discount cannot exceed base", () => {
  const c = cart([line({ name: "Kopiko", unitPriceC: 900, qty: 1,
    discount: { source: "free", kind: "fixed", value: 5000 } })]);
  const t = computeTotals(c, S);
  expect(t.promoDiscountC).toBe(900);
  expect(t.totalC).toBe(0);
  const c2 = cart([line({ name: "Kopiko", unitPriceC: 900, qty: 1 })],
    { orderDiscount: { source: "named", discountId: "disc-20", name: "₱20 off", kind: "fixed", value: 2000 } });
  expect(computeTotals(c2, S).totalC).toBe(0);
});

test("order percent discount excludes scpwd lines from its base", () => {
  const c = cart(
    [
      line({ name: "A", unitPriceC: 10000, qty: 1 }),                         // scpwd applies
      line({ name: "B", unitPriceC: 10000, qty: 1, scPwdMarked: false }),     // promo-eligible
    ],
    { scPwd: { idNo: "X", name: "Y" }, orderDiscount: { source: "free", kind: "percent", value: 10 } }
  );
  const t = computeTotals(c, S);
  // A: scpwd → net 7143; B: no line discount → net 10000; order base = 10000 → order disc 1000
  expect(t.scPwdDiscountC).toBe(2857);
  expect(t.promoDiscountC).toBe(1000);
  expect(t.totalC).toBe(10000 + 7143 - 1000);
});

test("misc line participates in totals like any line", () => {
  const c = cart([line({ name: "Tinapa (misc)", unitPriceC: 15000, qty: 1, productId: null })]);
  expect(computeTotals(c, S).totalC).toBe(15000);
});

test("empty cart totals are all zero", () => {
  const t = computeTotals(cart([]), S);
  expect(t.subtotalC).toBe(0);
  expect(t.totalC).toBe(0);
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `cart.ts` and `totals.ts`** per the Interfaces block and the 10-step algorithm. No floating-point money anywhere except inside the `halfUp` call sites already defined in Task 2 helpers.
- [ ] **Step 4: Run tests — all pass.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): cart model and centavo-exact totals engine (VAT, SC/PWD, service charge)"`

---

### Task 5: API contract — DTOs, errors, PosApi interface, mock pairing/catalog (TDD)

**Files:**
- Create: `pos/src/api/types.ts`, `pos/src/api/errors.ts`, `pos/src/api/client.ts`, `pos/src/api/index.ts`, `pos/src/api/mock/store.ts`, `pos/src/api/mock/adapter.ts` (pairing + catalog methods; shift/sale/stock methods added Task 6 throw `new Error("not implemented")` for now), `pos/.env.local` + `pos/.env.example` (`NEXT_PUBLIC_API_MODE=mock`)
- Test: `pos/src/api/mock/adapter.pairing.test.ts`

**Interfaces:**
- Consumes: Task 3 domain types, Task 4 `CartLine`/`DiscountSpec`/`ScPwdInfo`/`CartTotals`, Task 2 utils.
- Produces:

```ts
// pos/src/api/types.ts
import type { BranchInfo, BusinessSettings, BusinessType, CatalogPayload, OrderType, PaymentMethod, StockLevel, AdjustReason } from "@/domain/types";
import type { CartLine, DiscountSpec, ScPwdInfo } from "@/domain/cart";
import type { CartTotals } from "@/domain/totals";

export interface OwnerSession { token: string; email: string; ownerName: string }
export interface BusinessSummary { id: string; name: string; type: BusinessType; isDemo: boolean }
export interface PairingResult {
  deviceToken: string;
  business: BusinessSettings;
  branch: BranchInfo;
  terminalName: string;
  terminalCode: string;       // "T1", "T2", … assigned per branch, never reused
  receiptSeq: number;         // starting sequence for this terminal code (mock: 1; mirrors terminals.receipt_seq)
}

export interface SalePayment { id: string; method: PaymentMethod; referenceNo: string | null; amountC: number; tenderedC: number; changeC: number }
// id = client uuid — sale_payments is an append-only up-sync row (project-spec §5.2), so its id is client-generated from day one

export interface SaleDraft {
  id: string;                 // client uuid
  receiptNo: string;          // terminal-assigned
  shiftId: string;
  orderType: OrderType;
  lines: CartLine[];
  orderDiscount: DiscountSpec | null;
  scPwd: ScPwdInfo | null;
  totals: CartTotals;
  payment: SalePayment;
  createdAtDevice: string;
}

export type SaleStatus = "completed" | "voided" | "refunded";

export interface CompletedSale extends SaleDraft {
  status: SaleStatus;
  statusReason: string | null;
  createdAt: string;          // server-side (mock) clock
  voidedAt: string | null;
  refundedAt: string | null;
  refundShiftId: string | null; // open shift whose cash the refund hit; null = outside shift
}

export interface SaleSummary {
  id: string; receiptNo: string; createdAt: string; lineCount: number;
  orderType: OrderType; method: PaymentMethod; referenceNo: string | null;
  status: SaleStatus; statusReason: string | null; totalC: number; scPwd: boolean;
}

export interface CashMovement { id: string; type: "in" | "out"; amountC: number; reason: string; at: string }
export interface Shift { id: string; openedAt: string; closedAt: string | null; openingCashC: number; cashMovements: CashMovement[] }

export interface ShiftTotals {
  grossC: number; saleCount: number;
  byMethod: Record<PaymentMethod, number>;
  voidCount: number; voidAmountC: number;
  refundCount: number; refundAmountC: number;
  scPwdDiscountC: number; serviceChargeC: number;
  cashSalesC: number; cashRefundsC: number; cashInC: number; cashOutC: number;
  expectedCashC: number;      // opening + cashSales − cashRefunds + cashIn − cashOut
}

export interface ZReport extends ShiftTotals {
  shiftId: string; openedAt: string; closedAt: string;
  openingCashC: number; countedCashC: number; overShortC: number;
  branchCode: string; terminalCode: string;
}

export interface StockAdjustInput { productId: string; variantId: string | null; newQty: number; reasonCategory: AdjustReason; note: string | null }
```

```ts
// pos/src/api/errors.ts
export class ApiError extends Error { constructor(public code: string, message: string) { super(message); } }
export class UnauthorizedError extends ApiError { constructor(msg = "Device token revoked") { super("unauthorized", msg); } }
export class NetworkError extends ApiError { constructor() { super("network", "API unreachable"); } }
export class ValidationError extends ApiError { constructor(msg: string) { super("validation", msg); } }
export interface StockConflict { lineId: string | null; productId: string; variantId: string | null; availableQty: number }
export class StockConflictError extends ApiError { constructor(public conflicts: StockConflict[]) { super("stock_conflict", "Insufficient stock"); } }
export class PinInvalidError extends ApiError { constructor(public attemptsRemaining: number) { super("pin_invalid", "Wrong PIN"); } }
export class PinLockedError extends ApiError { constructor(public retryAfterSeconds: number) { super("pin_locked", "PIN locked"); } }
```

```ts
// pos/src/api/client.ts  — THE seam to the future NestJS /pos/* API
import type { CatalogPayload, StockLevel } from "@/domain/types";
import type {
  BusinessSummary, CashMovement, CompletedSale, OwnerSession, PairingResult,
  SaleDraft, SaleSummary, Shift, ShiftTotals, StockAdjustInput, ZReport,
} from "./types";
import type { BranchInfo } from "@/domain/types";

export interface PosApi {
  ownerSignIn(email: string, password: string): Promise<OwnerSession>;
  listBusinesses(session: OwnerSession): Promise<BusinessSummary[]>;
  listBranches(session: OwnerSession, businessId: string): Promise<BranchInfo[]>;
  pairTerminal(session: OwnerSession, businessId: string, branchId: string, terminalName: string): Promise<PairingResult>;
  unpair(email: string, password: string): Promise<void>;
  health(): Promise<{ ok: true }>;
  pullCatalog(): Promise<CatalogPayload>;
  getCurrentShift(): Promise<Shift | null>;
  openShift(openingCashC: number): Promise<Shift>;
  addCashMovement(input: { type: "in" | "out"; amountC: number; reason: string }): Promise<CashMovement>;
  getShiftTotals(): Promise<ShiftTotals>;
  closeShift(countedCashC: number): Promise<ZReport>;
  completeSale(draft: SaleDraft): Promise<CompletedSale>;
  listSales(filter: { date: string | null }): Promise<SaleSummary[]>;   // date = Manila YYYY-MM-DD; null = all
  getSale(id: string): Promise<CompletedSale>;
  voidSale(id: string, reason: string): Promise<CompletedSale>;
  refundSale(id: string, reason: string, pin: string): Promise<CompletedSale>;
  getStockLevels(): Promise<StockLevel[]>;
  adjustStock(input: StockAdjustInput): Promise<StockLevel>;
}
```

```ts
// pos/src/api/index.ts
import type { PosApi } from "./client";
import { MockPosApi } from "./mock/adapter";

let instance: PosApi | null = null;
export function getApi(): PosApi {
  if (instance) return instance;
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  if (mode !== "mock") throw new Error(`API mode "${mode}" not implemented yet — the HTTP adapter arrives with sentry-pos-be (openapi-typescript client)`);
  instance = new MockPosApi();
  return instance;
}
export function setApiForTests(api: PosApi | null): void { instance = api; }
```

- `mock/store.ts`: `interface MockState { pairedBusinessId: string | null; pairedBranchId: string | null; terminalName: string; terminalCode: string; terminalPairCount: number; deviceRevoked: boolean; stock: StockLevel[]; sales: CompletedSale[]; shifts: Shift[]; adjustments: Array<{ id: string; productId: string; variantId: string | null; qtyDelta: number; reasonCategory: AdjustReason; note: string | null; at: string }>; pinFailCount: number; pinLockedUntil: string | null }`, `loadMockState(): MockState` / `saveMockState(s: MockState): void` under localStorage key `"sentry-pos:mock:v1"` (fresh default from seed when absent), `resetMockState(): void`.
- `mock/adapter.ts`: `class MockPosApi implements PosApi` — this task implements `ownerSignIn` (checks `SEED_OWNER`, wrong creds → `ValidationError`), `listBusinesses`, `listBranches`, `pairTerminal` (increments the persisted `terminalPairCount` and assigns `terminalCode` `"T" + terminalPairCount`; the counter is **never** reset by unpair, so a re-paired device gets T2, T3, … and a fresh receipt series that cannot collide with retained sales; returns `receiptSeq: 1`; persists pairing, resets stock from seed), `unpair` (re-auth check then clears pairing state — but not `terminalPairCount`, `sales`, or `shifts`), `health`, `pullCatalog` (returns seed catalog + current mock stock + terminal identity + `loadedAt`). Every **post-pairing** method (`pullCatalog`, `getCurrentShift`, `openShift`, `addCashMovement`, `getShiftTotals`, `closeShift`, `completeSale`, `listSales`, `getSale`, `voidSale`, `refundSale`, `getStockLevels`, `adjustStock`) starts with a shared `assertNotRevoked()` that throws `UnauthorizedError` when `deviceRevoked` — matching project-spec §8's "the next request gets a 401", so Task 22's `handleApiError` wrapping is exercisable from any call site. Every method starts with `await this.delay()` (~120 ms; 0 in tests via `new MockPosApi({ latencyMs: 0 })`) and `if (typeof navigator !== "undefined" && !navigator.onLine) throw new NetworkError()`.

- [ ] **Step 1: Write failing tests** — `adapter.pairing.test.ts`:

```ts
import { MockPosApi } from "./adapter";
import { resetMockState } from "./store";
import { ValidationError } from "../errors";

const api = () => new MockPosApi({ latencyMs: 0 });

beforeEach(() => resetMockState());

test("sign in with seed owner works; wrong password rejected", async () => {
  const s = await api().ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  expect(s.ownerName).toBe("Maria Reyes");
  await expect(api().ownerSignIn("maria@kapediaria.ph", "nope")).rejects.toBeInstanceOf(ValidationError);
});

test("pair flow: businesses → branches → pair → catalog", async () => {
  const a = api();
  const s = await a.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  const businesses = await a.listBusinesses(s);
  expect(businesses.some((b) => b.isDemo)).toBe(true);
  const real = businesses.find((b) => !b.isDemo)!;
  const branches = await a.listBranches(s, real.id);
  expect(branches.map((b) => b.code)).toEqual(["MKT", "BYN"]);
  const pairing = await a.pairTerminal(s, real.id, branches[0]!.id, "Counter 1");
  expect(pairing.terminalCode).toBe("T1");
  const catalog = await a.pullCatalog();
  expect(catalog.branch.code).toBe("MKT");
  expect(catalog.terminal).toEqual({ name: "Counter 1", code: "T1" });
  expect(catalog.products.length).toBeGreaterThan(0);
  expect(catalog.stock.length).toBeGreaterThan(0);
});

test("re-pairing after unpair assigns a fresh terminal code — no receipt collisions", async () => {
  const a = api();
  const s = await a.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  const real = (await a.listBusinesses(s)).find((b) => !b.isDemo)!;
  const [branch] = await a.listBranches(s, real.id);
  const first = await a.pairTerminal(s, real.id, branch!.id, "Counter 1");
  expect(first.terminalCode).toBe("T1");
  await a.unpair("maria@kapediaria.ph", "sentry-demo");
  const second = await a.pairTerminal(s, real.id, branch!.id, "Counter 1 again");
  expect(second.terminalCode).toBe("T2");   // terminalPairCount survives unpair
  expect(second.receiptSeq).toBe(1);        // fresh series under the new code
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** all files per the Interfaces block. `.env.local` + `.env.example` each contain `NEXT_PUBLIC_API_MODE=mock`. The generated `pos/.gitignore` ignores `.env*` — append a negation so the example is tracked while `.env.local` stays ignored: `printf '\n!.env.example\n' >> pos/.gitignore` (run from the repo root).
- [ ] **Step 4: Run tests — pass. `npm run build` still green** (env file must not break export).
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): PosApi contract, error taxonomy, mock adapter with pairing + catalog"`

---

### Task 6: Mock adapter — shifts, sales, refund PIN, stock (TDD)

**Files:**
- Modify: `pos/src/api/mock/adapter.ts` (implement the remaining PosApi methods), `pos/src/api/mock/store.ts` (if fields missing)
- Test: `pos/src/api/mock/adapter.sales.test.ts`

**Interfaces:**
- Consumes: Task 5 contract; Task 4 `computeTotals` (the mock **recomputes** every draft's totals and rejects mismatches with `ValidationError` — same behavior the real API will have).
- Produces: fully working `MockPosApi`; test helper `pairForTest(api: MockPosApi): Promise<void>` exported from `pos/src/test/utils.ts` (signs in + pairs Marikit "Counter 1"), and `draftFor(lines, opts): SaleDraft` fixture builder in the test file.

Business rules to implement exactly:
- `openShift`: rejects (`ValidationError`) when a shift is already open. Creates `Shift` with `newId()`, `openedAt: nowIso()`.
- `completeSale`: requires an open shift matching `draft.shiftId`; recomputes totals via `computeTotals` (reconstructing a `Cart` from the draft) and rejects mismatch; **stock check first, atomically**: for every line with `productId !== null && trackStock`, available = stock qty (variant-level when `variantId`); insufficient → `StockConflictError` listing every conflicting line, **no state change**. On success decrements stock (milli-exact via `qtyToMilli`), stores `CompletedSale` with `status: "completed"`, `createdAt: nowIso()`.
- `voidSale`: sale must exist, `status === "completed"`, its `shiftId` must equal the currently open shift's id (else `ValidationError` — "voids only while the sale's shift is open"); requires non-empty reason; sets `status: "voided"`, `voidedAt`, `statusReason`, returns stock (adds back quantities).
- `refundSale`: PIN gate first — locked (`pinLockedUntil` in future) → `PinLockedError(secondsRemaining)`; wrong PIN → increments `pinFailCount` and throws `PinInvalidError(attemptsRemaining = 4 − pinFailCount)`; the **4th** failure additionally sets `pinLockedUntil = now + 300s`, so the 5th and later attempts hit the lock check first and throw `PinLockedError` without evaluating the PIN (matches the test below: 4 × `PinInvalidError`, then `PinLockedError`; Task 19's copy counts 3 → 2 → 1 → 0 attempts left, then the lock message); a correct PIN resets the counter. Then: sale must be `completed`; non-empty reason; sets `status: "refunded"`, `refundedAt`, `statusReason`; returns stock; `refundShiftId` = current open shift id **if** the open shift is the sale's own shift, else `null` (out-of-shift refund, spec pos-spec §7).
- `getShiftTotals` / `closeShift`: aggregate over the open shift — `byMethod` sums `completed` sales only (voided excluded; refunded sales whose `refundShiftId` equals this shift still count as sales but are offset by `refundAmountC`); `cashSalesC` = completed+refunded-in-shift cash sales of this shift; `cashRefundsC` = cash refunds with `refundShiftId === shift.id`; `expectedCashC = openingCashC + cashSalesC − cashRefundsC + cashInC − cashOutC`. Wait — simplest correct model matching the design's Z (`Expected: 2,000 + 12,485.25 − 310.00 + 1,000 − 750`): `cashSalesC` counts sales sold during this shift that were **not voided** (refunded-later ones still counted as sold), and refunds subtract separately. Implement exactly that. `closeShift` rejects when no open shift; stamps `closedAt`, stores `countedCashC`, computes `overShortC = countedCashC − expectedCashC`, returns `ZReport` with branch/terminal codes.
- `listSales`: this terminal's sales, newest first; `date` filter compares `manilaDateKey(createdAt)`.
- `adjustStock`: computes `qtyDelta = newQty − currentQty` (milli-exact), rejects `newQty < 0`; updates the level; conceptually appends a `stock_movements(adjustment)` event — store the movement in `MockState` as `adjustments: Array<{ id, productId, variantId, qtyDelta, reasonCategory, note, at }>` so the audit convention holds.

- [ ] **Step 1: Write failing tests** — `adapter.sales.test.ts` (all of these):

```ts
import { MockPosApi } from "./adapter";
import { resetMockState } from "./store";
import { StockConflictError, PinInvalidError, PinLockedError, ValidationError } from "../errors";
import { computeTotals } from "@/domain/totals";
import { emptyCart } from "@/domain/cart";
import type { SaleDraft } from "../types";
import { newId } from "@/lib/uuid";
import { nowIso } from "@/lib/time";

let api: MockPosApi;
beforeEach(async () => {
  resetMockState();
  api = new MockPosApi({ latencyMs: 0 });
  const s = await api.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  const [biz] = (await api.listBusinesses(s)).filter((b) => !b.isDemo);
  const [branch] = await api.listBranches(s, biz!.id);
  await api.pairTerminal(s, biz!.id, branch!.id, "Counter 1");
});

function draft(lines: SaleDraft["lines"], shiftId: string, over: Partial<SaleDraft> = {}): SaleDraft {
  const cart = { ...emptyCart(), lines, orderDiscount: over.orderDiscount ?? null, scPwd: over.scPwd ?? null, orderType: over.orderType ?? ("none" as const) };
  const totals = computeTotals(cart, { taxRate: 0.12, serviceChargeRate: 0.05 });
  return {
    id: newId(), receiptNo: "MKT-T1-000001", shiftId, orderType: cart.orderType,
    lines, orderDiscount: cart.orderDiscount, scPwd: cart.scPwd, totals,
    payment: { id: newId(), method: "cash", referenceNo: null, amountC: totals.totalC, tenderedC: totals.totalC, changeC: 0 },
    createdAtDevice: nowIso(), ...over,
  };
}
const espressoLine = () => ({
  id: newId(), productId: "prod-espresso", variantId: null, name: "Espresso", soldBy: "unit" as const,
  qty: 1, unitPriceC: 8500, modifiers: [], discount: null, scPwdMarked: false, trackStock: false,
});
const pandesalLine = (qty: number) => ({
  id: newId(), productId: "prod-pandesal", variantId: null, name: "Pan de sal", soldBy: "unit" as const,
  qty, unitPriceC: 1200, modifiers: [], discount: null, scPwdMarked: false, trackStock: true,
});

test("full happy path: open shift → sale decrements stock → totals → close computes over/short", async () => {
  const shift = await api.openShift(200000);
  await api.completeSale(draft([pandesalLine(6)], shift.id));
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(2);
  const totals = await api.getShiftTotals();
  expect(totals.cashSalesC).toBe(7200);
  expect(totals.expectedCashC).toBe(207200);
  const z = await api.closeShift(207000);
  expect(z.overShortC).toBe(-200);
  expect(await api.getCurrentShift()).toBeNull();
});

test("stock conflict: selling more than available fails atomically", async () => {
  const shift = await api.openShift(0);
  await expect(api.completeSale(draft([pandesalLine(9)], shift.id))).rejects.toBeInstanceOf(StockConflictError);
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(8); // unchanged
});

test("tampered totals rejected", async () => {
  const shift = await api.openShift(0);
  const d = draft([espressoLine()], shift.id);
  d.totals = { ...d.totals, totalC: d.totals.totalC - 100 };
  await expect(api.completeSale(d)).rejects.toBeInstanceOf(ValidationError);
});

test("void: only while its shift is open; returns stock; excluded from totals but counted", async () => {
  const shift = await api.openShift(0);
  const sale = await api.completeSale(draft([pandesalLine(2)], shift.id));
  await api.voidSale(sale.id, "double tap");
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(8);
  const t = await api.getShiftTotals();
  expect(t.cashSalesC).toBe(0);
  expect(t.voidCount).toBe(1);
  expect(t.voidAmountC).toBe(2400);
  await api.closeShift(0);
  const shift2 = await api.openShift(0);
  const sale2 = await api.completeSale(draft([espressoLine()], shift2.id));
  await api.closeShift(0);
  await expect(api.voidSale(sale2.id, "too late")).rejects.toBeInstanceOf(ValidationError);
});

test("refund PIN gate: wrong PIN counts down, 5th locks; correct PIN refunds", async () => {
  const shift = await api.openShift(0);
  const sale = await api.completeSale(draft([espressoLine()], shift.id));
  for (let i = 0; i < 4; i++) {
    await expect(api.refundSale(sale.id, "reason", "000000")).rejects.toBeInstanceOf(PinInvalidError);
  }
  await expect(api.refundSale(sale.id, "reason", "000000")).rejects.toBeInstanceOf(PinLockedError);
  resetPinLockForTest(); // helper: clear pinLockedUntil + count via store save
  const refunded = await api.refundSale(sale.id, "wrong size served", "123456");
  expect(refunded.status).toBe("refunded");
  expect(refunded.refundShiftId).toBe(shift.id);   // in-shift refund
  const t = await api.getShiftTotals();
  expect(t.refundCount).toBe(1);
  expect(t.expectedCashC).toBe(0 + 8500 - 8500);
});

test("out-of-shift refund: after close, refundShiftId is null and next shift math unaffected", async () => {
  const shift = await api.openShift(0);
  const sale = await api.completeSale(draft([espressoLine()], shift.id));
  await api.closeShift(8500);
  const shift2 = await api.openShift(0);
  const refunded = await api.refundSale(sale.id, "returned", "123456");
  expect(refunded.refundShiftId).toBeNull();
  expect((await api.getShiftTotals()).expectedCashC).toBe(0);
  expect(shift2.id).not.toBe(shift.id);
});

test("statuses are terminal: voided sale cannot be refunded and vice versa", async () => {
  const shift = await api.openShift(0);
  const a = await api.completeSale(draft([espressoLine()], shift.id));
  await api.voidSale(a.id, "mistake");
  await expect(api.refundSale(a.id, "x", "123456")).rejects.toBeInstanceOf(ValidationError);
});

test("adjustStock sets new qty and records reason; rejects negative", async () => {
  const level = await api.adjustStock({ productId: "prod-ubeloaf", variantId: null, newQty: 2, reasonCategory: "count_correction", note: "found 2 in the back chiller" });
  expect(level.qty).toBe(2);
  await expect(api.adjustStock({ productId: "prod-ubeloaf", variantId: null, newQty: -1, reasonCategory: "other", note: null })).rejects.toBeInstanceOf(ValidationError);
});

test("weight stock decrements exactly (milli-units)", async () => {
  const shift = await api.openShift(0);
  const riceLine = { id: newId(), productId: "prod-rice", variantId: null, name: "Jasmine rice", soldBy: "weight" as const, qty: 0.75, unitPriceC: 9500, modifiers: [], discount: null, scPwdMarked: false, trackStock: true };
  await api.completeSale(draft([riceLine], shift.id));
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-rice")!.qty).toBe(22.7);
});

test("listSales: newest first with today filter", async () => {
  const shift = await api.openShift(0);
  await api.completeSale(draft([espressoLine()], shift.id));
  const today = await api.listSales({ date: new Date().toISOString().slice(0, 10) });
  expect(today.length + (await api.listSales({ date: null })).length).toBeGreaterThanOrEqual(2);
});
```

(`resetPinLockForTest()` is a small helper in the test file that loads mock state, clears `pinFailCount`/`pinLockedUntil`, saves. The `listSales` today-filter assertion uses `manilaDateKey(nowIso())` rather than the naive slice if the run crosses midnight — write it with `manilaDateKey`.)

Note the seed product ids used here (`prod-espresso`, `prod-pandesal`, `prod-ubeloaf`, `prod-rice`) — Task 3 must use these exact literals.

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement the remaining adapter methods** per the business rules above.
- [ ] **Step 4: Run the full suite — everything passes.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): mock adapter — shifts, sales, void/refund with PIN lockout, stock events"`

---

### Task 7: App state stores, routing gate, chrome (TopBar / nav / status strip)

**Files:**
- Create: `pos/src/state/pairing.ts`, `pos/src/state/settings.ts`, `pos/src/state/catalog.ts`, `pos/src/components/chrome/TerminalGate.tsx`, `pos/src/components/chrome/TopBar.tsx`, `pos/src/components/chrome/StatusChips.tsx`, `pos/src/app/page.tsx` (boot redirect), placeholder pages: `pos/src/app/{pair,shift-open,sale,payment,receipt,history,shift,stock,settings}/page.tsx` (each `"use client"`; only the five operational pages — sale, history, shift, stock, settings — render TopBar + a `<div>…</div>` placeholder; pair, shift-open, payment, and receipt render a bare `<main>` placeholder with no TopBar — their real chrome differs, and the pairing store is null on `/pair`)
- Modify: `pos/src/app/layout.tsx` (wrap children in `<TerminalGate>`, add `<Toaster />` from sonner, add `<div id="print-root" />`)
- Test: `pos/src/state/pairing.test.ts`, `pos/src/components/chrome/TopBar.test.tsx`

**Interfaces:**
- Consumes: `getApi()`, Task 5 types.
- Produces:

```ts
// state/pairing.ts — zustand + persist("sentry-pos:pairing")
interface PairingState {
  status: "unpaired" | "paired";
  deviceToken: string | null;
  business: BusinessSettings | null;
  branch: BranchInfo | null;
  terminalName: string | null;
  terminalCode: string | null;
  receiptSeq: number;                    // terminal-owned sequence; seeded from PairingResult.receiptSeq
  pair(r: PairingResult): void;          // sets receiptSeq = r.receiptSeq
  unpair(): void;                        // clears everything incl. receiptSeq
  peekReceiptNo(): string;               // formats the CURRENT seq WITHOUT mutating — used to build a SaleDraft
  commitReceiptSeq(): void;              // increments — called ONLY after completeSale succeeds; a failed
                                         // attempt must not burn a number (BIR per-machine sequential numbering)
}
export const usePairingStore: UseBoundStore<...>;
export function formatReceiptNo(branchCode: string, terminalCode: string, seq: number, isDemo: boolean): string;
// → "MKT-T1-000318"; demo → "DEMO-MKT-T1-000318" (seq padded to 6)
```

```ts
// state/settings.ts — persist("sentry-pos:settings")
interface SettingsState { paperWidth: "58" | "80"; setPaperWidth(w: "58" | "80"): void }
```

```ts
// state/catalog.ts — NOT persisted (refetched per launch; Dexie mirror is milestone 4)
interface CatalogState {
  catalog: CatalogPayload | null;
  stock: Map<string, number>;            // key: `${productId}:${variantId ?? ""}` — local cache
  refresh(): Promise<void>;              // pullCatalog(); populates BOTH `catalog` and the `stock` Map from
                                         // payload.stock; UnauthorizedError → terminal reset (resetTerminalState
                                         // once Task 22 lands; until then usePairingStore.unpair()) — state only,
                                         // TerminalGate's unpaired→/pair redirect handles navigation
  refreshStock(): Promise<void>;         // getStockLevels() only; rewrites the stock Map
  availableQty(productId: string, variantId: string | null): number | null; // null = untracked
}
```

- `TerminalGate` (client component): on mount + on pathname change, redirects — unpaired & path ≠ `/pair` → `/pair`; paired & path = `/pair` or `/` → `/sale`; also triggers `catalog.refresh()` once when paired. Renders children immediately otherwise (no flash guard needed beyond a `null` first frame while the persisted store hydrates — use zustand `persist`'s `onRehydrateStorage`/`hasHydrated` flag).
- `TopBar` props: `{ active: "sale" | "history" | "shift" | "stock" | "settings" }`. Renders per design (every operational screen): sentry-mark 24px, five nav pills (active = `dark` Button variant, inactive ghost text-steel) linking to the five routes, spacer, DEMO badge (`Badge variant="warn"` with tracking-wide text) when `business.isDemo`, `MKT · T1` chip (`font-mono text-[13px] font-semibold text-slate`), `StatusChips`.
- `StatusChips`: shift chip — green dot + `Shift open · {formatManilaTime12(shift.openedAt)}` (design copy is 12-hour: `Shift open · 7:02 AM`). Accepts an optional `shift?: Shift | null` prop defaulting to null — in this task render the amber `No shift open` state unconditionally; Task 9 wires the shift store. Amber dot + `No shift open` otherwise; online chip — green dot `Online` / amber `Offline` from `navigator.onLine` + `online`/`offline` listeners. Dot = `size-2 rounded-full bg-brand-green` / `bg-warn-text`.

- [ ] **Step 1: Write failing tests**

```ts
// state/pairing.test.ts
import { usePairingStore, formatReceiptNo } from "./pairing";

test("formatReceiptNo pads and prefixes demo", () => {
  expect(formatReceiptNo("MKT", "T1", 318, false)).toBe("MKT-T1-000318");
  expect(formatReceiptNo("MKT", "T1", 1, true)).toBe("DEMO-MKT-T1-000001");
});

test("peek does not consume the sequence; commit advances it", () => {
  usePairingStore.setState({
    status: "paired", terminalCode: "T1", receiptSeq: 1,
    branch: { id: "b", name: "Marikit", code: "MKT", address: "" },
    business: { id: "x", name: "Kape Diaria", type: "mixed", currency: "PHP", taxRate: 0.12, serviceChargeRate: 0.05, allowMiscItems: true, isDemo: false, dayStartTime: "04:00", receiptHeader: "", receiptFooter: "" },
    deviceToken: "t", terminalName: "Counter 1",
  });
  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000001");
  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000001"); // peek is idempotent
  usePairingStore.getState().commitReceiptSeq();
  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000002");
});
```

```tsx
// components/chrome/TopBar.test.tsx — render with a paired store, assert the five nav pills,
// the MKT · T1 chip, and that the DEMO badge appears only when business.isDemo is true.
```

(Write the TopBar test fully: two renders, `screen.getByText("MKT · T1")`, `queryByText("DEMO")`.)

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** stores, gate, chrome, boot page (`/` renders `null`; the gate redirects), and the nine placeholder pages — the five operational ones composed as `<main className="flex h-dvh flex-col bg-surface"><TopBar active="…" />…</main>`, the other four (`pair`, `shift-open`, `payment`, `receipt`) as a bare `<main>` placeholder without TopBar.
- [ ] **Step 4: Tests pass; `npm run build` green; manual check `npm run dev` → localhost redirects to `/pair`.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): stores, terminal gate routing, top bar chrome with status strip"`

---

### Task 8: Pairing screen (design 01)

**Files:**
- Create: `pos/src/app/pair/page.tsx` (replace placeholder), `pos/src/components/chrome/PairingFlow.tsx`
- Test: `pos/src/components/chrome/PairingFlow.test.tsx`

**Interfaces:**
- Consumes: `getApi()`, `usePairingStore.pair()`, `useCatalogStore.refresh()`, Button/Input/Label/Card.
- Produces: the working first-launch flow; after pairing router pushes `/sale` (gate then bounces to `/shift-open` logic in Task 9 — for now `/sale`).

Design (design/pos-terminal.dc.html screen `01 Pairing`): full-screen `bg-ink`, centered 520px column — `sentry-mark-reverse.svg` 64px, title "Pair this terminal" (28px/500 white), sub "Sign in as the business owner to bind this device to one branch." (15px, white/64%), white 12px-radius card with the stepper, footnote "One terminal, one branch. Moving the device is unpair + re-pair." (13px white/48%).

Flow states in one component (`step: "signin" | "select" | "naming"` collapses into a single progressive card): email+password + green pill "Sign in" → on success shows ✓ rows ("Signed in — {email}", "Business — picker of business names as pill buttons incl. demo") → branch pills (active = `dark` variant, e.g. "Marikit — MKT") → "Terminal name" input (default "Counter 1") → full-width green pill **Pair terminal** → `api.pairTerminal`, `pairingStore.pair(result)`, `catalog.refresh()`, `router.replace("/sale")`. Errors surface inline under the relevant control (`text-danger text-sm`), wrong password message from `ValidationError`.

- [ ] **Step 1: Write failing test** — RTL: `resetMockState()`; render `<PairingFlow />` with a `next/navigation` router mock (`vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))` — export the spy); type seed credentials, click through business "Kape Diaria" → branch "Marikit — MKT" → keep "Counter 1" → click "Pair terminal"; assert `usePairingStore.getState().status === "paired"` and `terminalCode === "T1"`; also assert wrong password shows an inline error.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass. Manual: dev server → pair with `maria@kapediaria.ph` / `sentry-demo`.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): pairing screen — owner sign-in, branch pick, terminal naming"`

---

### Task 9: Numpad + shift store + Shift Open screen (design 02)

**Files:**
- Create: `pos/src/components/numpad/Numpad.tsx`, `pos/src/components/numpad/MoneyPad.tsx`, `pos/src/state/shift.ts`, `pos/src/app/shift-open/page.tsx` (replace placeholder)
- Modify: `pos/src/components/chrome/TerminalGate.tsx` (paired + no open shift + path is `/sale` or `/payment` → redirect `/shift-open`; paired + open shift + path `/shift-open` → `/sale`), `StatusChips.tsx` (read shift store)
- Test: `pos/src/components/numpad/MoneyPad.test.tsx`, `pos/src/state/shift.test.ts`

**Interfaces:**
- Consumes: `getApi()`, `parsePesoInput`/`formatC`.
- Produces:
  - `Numpad` props: `{ onKey(k: string): void }` — 3×4 grid `1–9 . 0 ⌫`, 56px cells, `border-hairline rounded-[8px] text-xl font-medium`, `⌫` in text-steel. Keys emit `"1"…"9"`, `"."`, `"0"`, `"back"`.
  - `MoneyPad` props: `{ valueC: number | null; onChange(c: number | null): void; autoFocusDisplay?: boolean }` — composes an amount display (`font-mono text-2xl font-semibold h-14 border-2 border-green-dark rounded-[8px]`, shows `₱` + `formatC`) + Numpad; internally keeps the raw keyed string, converts via `parsePesoInput`.
  - `state/shift.ts`:

```ts
interface ShiftState {
  shift: Shift | null;
  hydrated: boolean;
  load(): Promise<void>;                  // getCurrentShift()
  open(openingCashC: number): Promise<void>;
  addCashMovement(type: "in" | "out", amountC: number, reason: string): Promise<void>;
  close(countedCashC: number): Promise<ZReport>;   // clears shift on success
  reset(): void;                          // local clear only, NO closeShift call — for unpair / 401 paths (Task 22)
}
export const useShiftStore: ...;
```

- Shift Open page per design 02: TopBar-less centered 460px Card ("Open a shift" 24px/500, "Count the drawer and enter the opening float." steel 14px), `MoneyPad` prefilled empty, full-width green pill **Open shift** (disabled until a valid amount ≥ 0; ₱0 float is legal) → `shiftStore.open` → `router.replace("/sale")`. Status header strip on top like design (52px white bar with mark, `MKT · T1`, "No shift open" amber chip, Online chip).

- [ ] **Step 1: Write failing tests**

```tsx
// MoneyPad.test.tsx — keying "2","0","0","0" shows ₱2,000.00 and onChange fires 200000;
// "." enables centavos ("5",".","5","0" → 550); "back" deletes; invalid stays null.
```

```ts
// shift.test.ts — with MockPosApi(latency 0) via setApiForTests + pairForTest:
// open(200000) sets shift; StatusChips-visible state: getCurrentShift persists across store reloads (load()).
```

(Write both in full following the established patterns.)

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** Gate update: `/sale` and `/payment` require an open shift once hydrated.
- [ ] **Step 4: Tests pass. Manual: after pairing, app lands on Shift Open; opening sends you to Sale.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): numpad, shift store, shift-open screen with gate"`

---

### Task 10: Sale screen — product area (design 03 left pane)

**Files:**
- Create: `pos/src/state/cart.ts`, `pos/src/components/sale/ProductGrid.tsx`, `ProductTile.tsx`, `CategoryTabs.tsx`, `SearchBar.tsx`
- Modify: `pos/src/app/sale/page.tsx` — two-pane layout: product area (flex-1) + cart pane placeholder (`w-[392px] border-l border-hairline bg-white`)
- Test: `pos/src/state/cart.test.ts`, `pos/src/components/sale/ProductGrid.test.tsx`

**Interfaces:**
- Consumes: catalog store, totals engine, `newId`.
- Produces:

```ts
// state/cart.ts — persist("sentry-pos:carts") for { cart, heldCarts }
export interface HeldCart { id: string; label: string; heldAt: string; shiftId: string; cart: Cart }
interface CartState {
  cart: Cart;
  heldCarts: HeldCart[];
  addProduct(p: Product, opts?: { variantId?: string; modifiers?: CartModifier[]; qty?: number }): void;
      // snapshots price (variant price when variantId), name "Product — Variant";
      // merges into an existing line when same product+variant+no modifiers+no discount (qty+1);
      // respects available stock via catalog.availableQty minus qty already in cart (throws CartStockError when exceeded);
      // new lines get scPwdMarked = cart.scPwd !== null (marked by default while SC/PWD is active — pos-spec
      // "defaults to all"); the merge path leaves an existing line's scPwdMarked untouched
  addMisc(name: string, amountC: number): void;      // same scPwdMarked default as addProduct
  setQty(lineId: string, qty: number): void;          // same stock cap; weight decimals allowed
  removeLine(lineId: string): void;
  setLineDiscount(lineId: string, d: DiscountSpec | null): void;
  setOrderDiscount(d: DiscountSpec | null): void;
  setOrderType(t: OrderType): void;
  setScPwd(info: ScPwdInfo | null): void;             // setting marks all lines scPwdMarked=true
  toggleScPwdLine(lineId: string): void;
  hold(label: string, shiftId: string): void;         // pushes a HeldCart and resets the current cart
  resume(heldId: string): void;                       // swaps held ↔ current (current must be empty or confirm handled by UI)
  discardHeld(heldId: string): void;                  // removes one held cart (HeldCartsSheet per-row Discard, Task 14)
  clear(): void;                                      // resets the CURRENT cart only — held carts untouched
  resetAll(): void;                                   // clears current cart AND heldCarts — unpair / 401 paths (Task 22)
  conflictLineIds: string[];                          // set by the payment stock-race path (Task 16); cleared on any cart mutation
  totals(settings: { taxRate: number; serviceChargeRate: number }): CartTotals; // computeTotals passthrough
}
export class CartStockError extends Error { constructor(public availableQty: number) { super("insufficient stock"); } }
```

- `CategoryTabs`: "All" + seed categories as pills (active `dark`), controlled `{ value, onChange }`.
- `SearchBar`: 44px input, placeholder `⌕  Search name or SKU — scanner adds instantly`, plus the dashed "+ Misc item" pill button (`border border-dashed border-hairline-strong rounded-full`) — `onMisc()` prop (modal in Task 12); hidden/disabled with tooltip-less omission when `!business.allowMiscItems`.
- `ProductTile` props `{ product, availableQty: number | null, onSelect }`: white 12px card, name 15px/600, price steel 14px (`from ₱120.00` when variants; `₱95.00 / kg` when weight); badges per design: `3 SIZES` (green-dark micro-caps when variants), `BY WEIGHT` (steel micro-caps), `LOW · n LEFT` (`Badge variant="warn"`) when tracked and `qty ≤ lowStockThreshold`, OUT OF STOCK state (muted card `bg-surface opacity-75`, `Badge variant="neutral"`, not clickable) when tracked and `availableQty ≤ 0`.
- `ProductGrid`: filters by category + search (name or SKU, case-insensitive substring), `grid-cols-4 auto-rows-[118px] gap-3`; `business_type` emphasis: when `business.type === "retail"`, autofocus the search input on mount; `fnb`/`mixed` do not (grid-forward).
- Tap behavior: no variants & no modifier groups → `cart.addProduct(p)` immediately (unit) or open WeightModal (Task 11) for weight items; variants or modifier groups → open VariantModifierSheet (Task 12) — wire stub callbacks `onNeedsSheet(p)` / `onNeedsWeight(p)` up to the page.

- [ ] **Step 1: Write failing tests**

```ts
// cart.test.ts — seed via a shared helper (add it to pos/src/test/utils.ts, next to pairForTest):
//   seedCatalogForTest(): CatalogPayload — builds { ...makeSeedCatalog(), terminal: { name: "Counter 1",
//   code: "T1" }, loadedAt: new Date().toISOString() } and calls useCatalogStore.setState({ catalog,
//   stock: new Map(catalog.stock.map((s) => [`${s.productId}:${s.variantId ?? ""}`, s.qty])) })
//   — populating BOTH the payload and the derived stock Map so availableQty works. Cases:
// addProduct espresso twice merges to qty 2 (price locked from catalog at first add);
// addProduct pandesal ×8 ok, 9th throws CartStockError(0 remaining);
// setQty respects cap; addMisc creates productId null line, no stock effect;
// price lock: mutate catalog price after add — line unitPriceC unchanged;
// setScPwd then addProduct — the new line is scPwdMarked and SC/PWD applies to it in totals.
```

```tsx
// ProductGrid.test.tsx — render with seed: Ube loaf tile shows OUT OF STOCK and clicking it does not add;
// Pan de sal shows "LOW · 8 LEFT"; search "kopiko" filters; category "Coffee" hides bakery.
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual dev check against design 03 left pane.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): sale product area — grid, tiles, badges, search, category tabs, zero-stock block"`

---

### Task 11: Cart pane — lines, totals footer, order type, weight entry (design 03 right pane)

**Files:**
- Create: `pos/src/components/sale/CartPane.tsx`, `CartLineRow.tsx`, `TotalsFooter.tsx`, `WeightModal.tsx`
- Modify: `pos/src/app/sale/page.tsx` (mount CartPane; wire `onNeedsWeight` → WeightModal)
- Test: `pos/src/components/sale/CartPane.test.tsx`

**Interfaces:**
- Consumes: cart store, totals engine, business settings from catalog store.
- Produces: `CartPane` props `{ onCharge(): void; onDiscount(): void; onScPwd(): void; onHold(): void; onHeldList(): void }` (page wires; Discount/SC-PWD/Hold handlers land Tasks 12–14 — until then buttons render disabled with the final labels). `WeightModal` props `{ product: Product | null; initialQty?: number; onConfirm(qty: number): void; onClose(): void }` — Dialog with product name, `₱x.xx / kg`, decimal Numpad entry (max 3dp, must be > 0), running line total via `mulQtyPriceC`, green **Add** pill.

Per design 03 right pane: header "Current sale" 16px/600 + `Hold` and `Held · n` secondary pills; order-type pill row (Dine-in / Takeout / None — active `dark`); scrollable lines — each row: name 15px/600 + line total `font-mono` right; modifiers indented steel 13px (`+ Oat milk (+₱25.00)`); qty stepper pill (− n +, 30px touch targets) for units, keyed weight chip (`0.750 kg` mono bordered, tap reopens WeightModal) for weight; `@ ₱145.00 + mods` hint steel 13px; discount badge (`Badge variant="soft-green"`, `10% OFF · MERIENDA`) when line discount; swipe-free remove — an `×` ghost icon button at row end. Footer: Subtotal row, one row per active discount (green-dark, `−11.00`), SC/PWD row when applied, `Service charge 5%` row when dine-in and rate > 0, Total row (18px/600 label, 26px/700 mono value), `VAT included ₱{formatC(totals.vatC)} · prices VAT-inclusive` stone 12px — computed from the totals engine, never a literal (the design's 47.62 is slip-derived; the spec-correct value for the sample cart is 46.38), button row: `Discount` + `SC / PWD` secondary pills, green **Charge ₱{total}** (disabled when cart empty) → `onCharge` → `router.push("/payment")`. Clear-cart control (ghost "Clear" in header) wraps `confirm` Dialog ("Clear this sale?" destructive confirm).

- [ ] **Step 1: Write failing tests** — CartPane: seed catalog + add espresso; assert stepper increments qty and totals footer updates (`₱85.00` → `₱170.00`); Charge disabled on empty cart; clear requires confirm (dialog appears, cancel keeps lines); weight line renders `0.750 kg` chip. Use `userEvent`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual side-by-side with design 03.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): cart pane — lines, steppers, weight entry, totals footer, order type, clear confirm"`

---

### Task 12: Variant + modifier sheet, misc item modal (design 04)

**Files:**
- Create: `pos/src/components/sale/VariantModifierSheet.tsx`, `pos/src/components/sale/MiscItemModal.tsx`
- Modify: `pos/src/app/sale/page.tsx` (wire `onNeedsSheet`, SearchBar `onMisc`)
- Test: `pos/src/components/sale/VariantModifierSheet.test.tsx`

**Interfaces:**
- Consumes: cart store `addProduct` / `addMisc`; `ModifierGroup` from catalog store.
- Produces:
  - `VariantModifierSheet` props: `{ product: Product | null; onClose(): void }` — Dialog 560px, 16px radius. Sections per design 04: header (name 22px/600 + SKU stone right — the SKU element is omitted when `sku` is null); "SIZE — CHOOSE 1" variant cards (3-up, selected = `border-2 border-brand-green bg-green-soft`, price green-dark 600) — **required when variants exist**; one section per modifier group, label `NAME — CHOOSE UP TO {max}` / `CHOOSE {min}` uppercase steel 13px/600 (single-select rows when `maxSelect === 1`, multi-select pill row otherwise; enforce `minSelect`/`maxSelect` — Add disabled until satisfied, over-max blocked); footer: qty stepper + Cancel secondary + green **Add — ₱{lineTotal}** where lineTotal = `mulQtyPriceC(qty, variantOrBase + Σ selected deltas)`. Confirm calls `addProduct(product, { variantId, modifiers, qty })`.
  - `MiscItemModal` props `{ open: boolean; onClose(): void }` — name Input + MoneyPad amount; **Add** disabled until both valid; calls `addMisc(name, amountC)`. Only reachable when `allowMiscItems`.

- [ ] **Step 1: Write failing test** — render sheet with seed Iced Latte: **no size preselection** — Add is disabled until a size is chosen; choose Large → `Add — ₱145.00`; select Oat milk → `₱170.00`; selecting Fresh milk deselects Oat milk (max 1); all 3 seed add-ons can be selected simultaneously (maxSelect 3). Over-max blocking is exercised with a **synthetic test-only modifier group** (maxSelect 2 with 3 modifiers, injected via the catalog store in the test — the seed group has no 4th option to attempt): the 3rd selection is ignored. Confirm adds a cart line named `"Iced Latte — Large"` with unitPriceC 14500 and one modifier (+2500). Misc modal test: add "Tinapa" ₱150 → cart line productId null, 15000.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual check against design 04.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): variant/modifier sheet with min-max enforcement + misc item modal"`

---

### Task 13: Discounts — named picker, BO free-entry, SC/PWD capture

**Files:**
- Create: `pos/src/components/sale/DiscountPicker.tsx`, `pos/src/components/sale/ScPwdModal.tsx`
- Modify: `CartPane.tsx` / `CartLineRow.tsx` (wire line + order discount buttons, SC/PWD button, per-line SC/PWD toggle when active)
- Test: `pos/src/components/sale/DiscountPicker.test.tsx`

**Interfaces:**
- Consumes: cart store discount actions; `NamedDiscount` list from catalog.
- Produces:
  - `DiscountPicker` props: `{ target: { kind: "line"; lineId: string } | { kind: "order" }; open: boolean; onClose(): void }` — Dialog: named discounts filtered by `appliesTo` (`line`/`order`/`both`) as selectable rows (name + preview of amount against the current target); a "Remove discount" row when one is set; **Free entry** section (BO-only in MVP — always shown since operator is the BO): amount/percent toggle pills + MoneyPad or percent Numpad; caps enforced by the engine (already) — picker also refuses percent > 100. Applies via `setLineDiscount` / `setOrderDiscount`.
  - `ScPwdModal` props `{ open: boolean; onClose(): void }` — per design & spec: ID number Input, name Input, note "VAT is removed first, then 20% off — applied per line; a line takes SC/PWD or a promo discount, whichever is higher." **Apply** → `setScPwd({ idNo, name })` (marks all lines); **Remove SC/PWD** when already set → `setScPwd(null)`. After applying, cart lines show a toggleable `SC/PWD` soft-green badge (tap = `toggleScPwdLine`).

- [ ] **Step 1: Write failing test** — DiscountPicker on the Ensaymada line lists "Merienda 10%" (appliesTo both) but not "₱20 off" (order-only); selecting it badges the line and totals drop by ₱11.00; order picker lists "₱20 off"; free-entry 10% on order applies; ScPwdModal captures ID/name and Espresso-only cart total becomes ₱60.71.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): named-list + free-entry discounts and SC/PWD capture with per-line marking"`

---

### Task 14: Hold & resume (shift-scoped)

**Files:**
- Create: `pos/src/components/sale/HeldCartsSheet.tsx`, `pos/src/components/sale/HoldDialog.tsx`
- Modify: `CartPane.tsx` (enable Hold / `Held · n` buttons)
- Test: `pos/src/state/cart.hold.test.ts`

**Interfaces:**
- Consumes: cart store `hold`/`resume`/`heldCarts` (already defined Task 10); shift store for current shift id.
- Produces: `HoldDialog` (label Input, default `"Hold " + (n+1)`, green **Hold** pill) and `HeldCartsSheet` (right-side `Sheet` listing holds: label, line count, `formatPeso` total, held time via `formatManilaTime`; per-row **Resume** + **Discard** (confirm; Discard calls `discardHeld(heldId)`); resume when current cart non-empty asks "Replace the current sale?" confirm). Store behaviors: `hold(label, shiftId)` pushes and resets current cart; `resume` restores and removes from list; holds persist across reload (already via persist); holds carry `shiftId` — Task 20's close guard reads `heldCarts.length`.

- [ ] **Step 1: Write failing tests** — store-level: hold stores snapshot with shiftId and clears cart; resume restores exact lines (price locks intact); persistence: rehydrating a second store instance sees the held cart (simulate via `useCartStore.persist.rehydrate()` after localStorage round-trip).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual: hold 2 carts, `Held · 2` matches design.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): hold & resume with shift-scoped persisted holds"`

---

### Task 15: Barcode wedge listener (TDD)

**Files:**
- Create: `pos/src/lib/barcode.ts`, `pos/src/components/sale/useBarcodeWedge.ts`
- Modify: `pos/src/app/sale/page.tsx` (activate hook)
- Test: `pos/src/lib/barcode.test.ts`

**Interfaces:**
- Consumes: catalog products (barcode exact match incl. variants), cart store.
- Produces:

```ts
// lib/barcode.ts — pure, timestamp-injected for testability
export interface WedgeOptions { minLength?: number; maxGapMs?: number; onScan(code: string): void }
export function createWedgeBuffer(opts: WedgeOptions): { feed(key: string, atMs: number): void; reset(): void };
// Rules: digits accumulate when gap since previous key ≤ maxGapMs (default 80);
// a gap over the limit restarts the buffer with the new key;
// "Enter" with buffer length ≥ minLength (default 4) fires onScan(code) and clears;
// any non-digit/non-Enter key clears the buffer.
```

`useBarcodeWedge(onScan)`: window keydown listener feeding `createWedgeBuffer` with `event.timeStamp`; when the scan target resolves (product or variant barcode match): repeat-scan increments the existing plain line (`setQty + 1`), first scan adds (`addProduct`; a weight/variant/modifier product with a direct **variant** barcode match adds that variant with no sheet); `CartStockError` → sonner toast "Out of stock — {name}". Listener skips events when a Dialog is open (`document.querySelector('[role="dialog"]')`).

- [ ] **Step 1: Write failing tests** — buffer: fast digits + Enter fires; slow gap restarts; short code ignored; letters clear; two scans of `4800888000015` against a wired fake onScan increments once per fire.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): keyboard-wedge barcode capture with repeat-scan increment"`

---

### Task 16: Payment screen (design 05)

**Files:**
- Create: `pos/src/app/payment/page.tsx` (replace placeholder), `pos/src/components/payment/MethodPills.tsx`, `CashPanel.tsx`, `NonCashPanel.tsx`, `OrderSummaryRail.tsx`, `pos/src/state/lastSale.ts` (tiny non-persisted store: `{ sale: CompletedSale | null; set(s): void }` — carries the completed sale to the Receipt screen)
- Modify: `pos/src/state/cart.ts` (implement the `conflictLineIds` behavior Task 10's contract declares — set on conflict, cleared on any cart mutation), `pos/src/components/sale/CartLineRow.tsx` (conflict styling + hint)
- Test: `pos/src/app/payment/payment.test.tsx`

**Interfaces:**
- Consumes: cart store + totals, shift store, `getApi().completeSale`, `usePairingStore.peekReceiptNo()` / `commitReceiptSeq()`, `catalog.refreshStock()`, `newId`, `nowIso`.
- Produces: completed-sale flow; `StockConflictError` handling (`conflictLineIds` — the cart-store field declared in Task 10 — set via `useCartStore.setState({ conflictLineIds })`, cleared on any cart mutation; `CartLineRow` renders a conflicted line with `border border-danger bg-danger-bg` and a "stock changed — adjust or remove" hint).

Layout per design 05: top bar `← Back to sale` (router.back) + `MKT · T1`; center column — eyebrow `AMOUNT DUE` steel 14px/600 tracked, amount 64px/700 mono, meta line (`4 lines · dine-in · VAT included ₱46.38` stone 13px); method pills (Cash active by default, `dark` active style); Cash → `CashPanel` 520px card: `MoneyPad` ("Cash tendered"), quick pills `Exact ₱100 ₱200 ₱500 ₱1000` (Exact sets exact total; denominations SET the tendered amount to that denomination, and a second tap of the same one adds another note — implement as: tap sets `max(current, 0) + denomination` when current came from quick-tap chain, plain set on first tap; keep it simple: **each tap adds** the denomination, Exact resets to exact — matches counter reality), green-soft change strip (`Change` + mono 28px `₱{tendered − total}`; negative renders as `Short ₱x.xx` in warn colors), green **Complete sale** pill disabled while `tenderedC < totalC`. Non-cash methods → `NonCashPanel`: "Amount ₱{total}" static + optional `Reference number` Input, Complete always enabled (amount = total, tendered = total, change 0). Right rail `OrderSummaryRail` 340px: `ORDER` eyebrow, one row per line (`1 × Iced Latte — Large, oat` + mono amount), divider, Discounts/Service charge/Total rows.

Complete handler: build `SaleDraft` — `id: newId()`, `receiptNo: pairing.peekReceiptNo()` (peek — the sequence is not consumed yet), `shiftId: shift.id`, cart fields, `totals: computeTotals(...)`, payment (with `id: newId()`), `createdAtDevice: nowIso()` → `api.completeSale` → on success: `pairing.commitReceiptSeq()` (the number is consumed only now — failed attempts never burn one, per BIR sequential numbering), `catalog.refreshStock()` (tiles/caps reflect the decrement — pos-spec §9 auto-decrement), `lastSale.set(sale)`, `cart.clear()`, `router.replace("/receipt")`. On `StockConflictError`: map conflicts to line ids, set `conflictLineIds`, `catalog.refreshStock()` (show the true quantities the conflict revealed), toast "Stock changed — fix the highlighted line", `router.replace("/sale")` — the receipt sequence is untouched, so the retry reuses the same number. A sale never half-commits (mock guarantees; UI must not clear the cart on failure).

- [ ] **Step 1: Write failing tests** — with paired mock + open shift + espresso in cart: render payment page (mock router), Complete disabled until tendered ≥ total; quick-tap ₱100 enables; completing writes a sale (`api.listSales` length 1), clears cart, advances the receipt seq, and updates the catalog stock cache (selling 6 Pan de sal leaves `catalog.availableQty("prod-pandesal", null)` at 2). Conflict path: set Pan de sal qty 6 in cart, adjust mock stock down to 2 behind the scenes (`adjustStock`), attempt complete → cart preserved, `conflictLineIds` contains the line, **and the receipt seq did NOT advance**.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual run-through of design 05.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): payment screen — methods, cash tender with change, atomic completion, stock-race recovery"`

---

### Task 17: Receipt screen + 58/80mm printing (design 06)

**Files:**
- Create: `pos/src/app/receipt/page.tsx` (replace placeholder), `pos/src/components/receipt/ReceiptView.tsx`, `pos/src/components/receipt/PrintRoot.tsx`, `pos/src/components/receipt/printReceipt.ts`
- Modify: `pos/src/app/globals.css` (print widths), `layout.tsx` if `#print-root` not present from Task 7
- Test: `pos/src/components/receipt/ReceiptView.test.tsx`

**Interfaces:**
- Consumes: `lastSale` store, settings store (`paperWidth`), pairing store (branch/terminal), business settings.
- Produces:
  - `ReceiptView` props: `{ sale: CompletedSale; business: BusinessSettings; branch: BranchInfo; terminalCode: string; reprint?: boolean }` — pure render, `font-mono text-xs leading-relaxed`, used on-screen (white sheet 240px/58mm · 320px/80mm per canvas) and in print. Layout exactly per pos-spec §6 / design 06: centered business name (14px/600) + `receiptHeader` lines → dashed divider → Receipt/Date/Terminal rows → dashed → item lines (`name qty×unitPrice` + total — the printed unit price is `lineUnitWithModsC(line)`, modifier-inclusive: a ₱145.00 Large latte with +₱25.00 Oat milk prints `1×170.00`, total `170.00`, matching design 06; the indented `+ Oat milk 25.00` line is an informational breakdown, not an addend; line-discount note indented plain `Merienda 10% −11.00`) → dashed → Subtotal / Discounts / SC-PWD (with `ID {idNo} — {name}` when applied) / `Service charge 5%` / **TOTAL** (14px/600) / payment method + tendered + change + reference when present → dashed → `VATable sales / VAT-exempt sales / VAT 12% (included)` → dashed → centered `receiptFooter`. `reprint` renders `*** REPRINT ***` under the header. **No Sentry branding anywhere.**
  - `printReceipt.ts`: `printNode(children: ReactNode, paperWidth: "58" | "80"): void` — renders into `#print-root` (createRoot), applies class `print-58`/`print-80`, calls `window.print()`, unmounts after `afterprint`. globals.css gains `.print-58 { width: 58mm } .print-80 { width: 80mm }` inside the print block.
  - Receipt page: success header (`✓ Sale completed — MKT-T1-000318`), centered ReceiptView + button stack: green **Print receipt**, secondary **Done — new sale** (`router.replace("/sale")` — cart already cleared), footnote per design. If `lastSale.sale` is null (deep-load), redirect `/sale`.

- [ ] **Step 1: Write failing test** — render `ReceiptView` with a fixture `CompletedSale` built from the Task 4 design cart (spec-correct totals): assert texts `KAPE DIARIA` (from settings `name`), `MKT-T1-000318`, an item line matching `1×170.00` (modifier-inclusive unit price), `Subtotal` `423.25`, `Service charge 5%` `20.61`, `TOTAL` `432.86`, `VAT 12% (included)` `46.38`, no string "Sentry" anywhere (`queryByText(/sentry/i)` null); `reprint` shows the stamp; SC/PWD fixture prints the ID number.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual: complete a sale, print preview at both widths.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): receipt screen and 58/80mm print pipeline with business-only branding"`

---

### Task 18: Sales history + sale detail (design 07)

**Files:**
- Create: `pos/src/app/history/page.tsx` (replace placeholder), `pos/src/components/history/SaleRow.tsx`, `pos/src/components/history/SaleDetail.tsx`
- Test: `pos/src/app/history/history.test.tsx`

**Interfaces:**
- Consumes: `api.listSales` / `api.getSale`, `ReceiptView` + `printReceipt` (reprint), time formatters.
- Produces: history list + detail; detail's **Void…** / **Refund…** buttons render disabled until Task 19 wires dialogs (`onVoid`/`onRefund` props default undefined).

Per design 07: filter row — `Today` pill (default) + `Pick a date` (native `<input type="date">` styled as pill) + right-aligned summary line (`38 sales · ₱18,240.50 · 1 void · 1 refund` — computed from the loaded list: **non-voided** count/sum, i.e. statuses completed + refunded, matching the Z-report gross model where refunds offset separately; plus void/refund counts). Rows: receipt no mono 600 (muted for voided), time (`formatManilaTime`), description (`4 lines · dine-in · cash` + `· ref 1029-3847` when reference + `· "reason"` when voided/refunded + `· PIN ✓` when refunded (refunds only — voids are ungated) + `· SC/PWD` when scPwd), status Badge (`COMPLETED` soft-green / `VOIDED` warn / `REFUNDED` danger-soft), amount mono right (voided: line-through muted; refunded: `−₱310.00` danger). Tap → detail view (same page, state): header `← History`, receipt no + status badge, **Reprint** secondary pill (prints with `reprint`), **Refund…** outline-destructive pill (Task 19), void button only while its shift is open; body renders `ReceiptView` on-screen.

- [ ] **Step 1: Write failing test** — seed mock with 2 sales (one voided via API), render history: both rows appear newest-first, voided row shows warn badge + line-through; clicking a row shows detail with Reprint button.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): sales history with filters and sale detail with stamped reprint"`

---

### Task 19: Void + refund PIN gate (design 08)

**Files:**
- Create: `pos/src/components/history/VoidDialog.tsx`, `pos/src/components/history/RefundDialog.tsx`, `pos/src/components/numpad/PinEntry.tsx`
- Modify: `SaleDetail.tsx` (wire both)
- Test: `pos/src/components/history/RefundDialog.test.tsx`

**Interfaces:**
- Consumes: `api.voidSale` / `api.refundSale`, shift store (void availability = sale.shiftId === current open shift id), `PinInvalidError` / `PinLockedError`.
- Produces:
  - `PinEntry` props `{ length?: 6; value: string; onChange(v: string): void }` — six 14px dots (filled `bg-ink` / empty `border-hairline-strong`) + Numpad (digits only, `back`).
  - `VoidDialog` props `{ sale: CompletedSale; open: boolean; onClose(): void; onDone(updated: CompletedSale): void }` — required reason Input ("double tap"…), destructive **Void sale** pill; ungated per spec.
  - `RefundDialog` same props — per design 08: title `Refund {receiptNo}`, sub `Full amount ₱1,120.75 · stock returns automatically. This shift's expected cash is reduced.` (the second sentence only when it will be an in-shift refund; out-of-shift shows `Recorded outside the current shift.`), required reason Input, `ENTER OWNER PIN` eyebrow + `PinEntry`, caption `Failed attempts are logged and throttled.` stone 12px, Cancel + destructive **Refund ₱{total}** (disabled until reason non-empty and PIN length 6). Wrong PIN → shake-free inline error `Wrong PIN — {n} attempts left` (n = `attemptsRemaining` from `PinInvalidError`: 3 → 2 → 1 → 0), clears entry; locked → `Locked — try again in {m} min`, entry disabled. Both dialogs' success paths call `catalog.refreshStock()` after `onDone` — returned stock un-blocks OUT tiles per pos-spec §9 "auto-return on void/refund".

- [ ] **Step 1: Write failing test** — with a completed mock sale: wrong PIN shows attempts-left error and sale stays completed; correct PIN (123456) + reason refunds (status badge updates via `onDone`); void dialog requires reason (button disabled empty).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual against design 08.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): ungated void and PIN-gated full refund with lockout messaging"`

---

### Task 20: Shift screen — X totals, cash in/out, close with Z report (design 09)

**Files:**
- Create: `pos/src/app/shift/page.tsx` (replace placeholder), `pos/src/components/shift/ShiftTotalsCards.tsx`, `CashMovementList.tsx`, `CashMoveDialog.tsx`, `ClosePanel.tsx`, `ZReportView.tsx`, `DayBoundaryBanner.tsx`, `pos/src/lib/day-boundary.ts`
- Test: `pos/src/lib/day-boundary.test.ts`, `pos/src/app/shift/shift.test.tsx`

**Interfaces:**
- Consumes: shift store, `api.getShiftTotals` / `closeShift`, cart store `heldCarts`, business `dayStartTime`, `printReceipt`.
- Produces:

```ts
// lib/day-boundary.ts
export function crossedDayBoundary(openedAtIso: string, dayStartTime: string, nowIso: string): boolean;
// Most recent Manila-time occurrence of dayStartTime ("HH:mm") at or before now = boundary B.
// Returns openedAt < B && now >= B.
// Implement by computing Manila wall-clock components of `now` via Intl.DateTimeFormat("en-CA", …)
// then constructing B as a UTC timestamp (Manila is UTC+8, no DST).
```

Screen per design 09: warn banner (`DayBoundaryBanner`, only when `crossedDayBoundary(...)`): `⚠ The business day ended at 04:00 with this shift still open. Close it when the drawer is counted — shifts never auto-close.` 3 KPI cards (`GROSS SALES` amount + `{n} sales` / `CASH SALES` + `card x · gcash y` breakdown / `VOIDS / REFUNDS` `1 / 1` + `−₱395.00 total`). Cash movements card: header + `+ Cash in` / `− Cash out` secondary pills opening `CashMoveDialog` (MoneyPad + required reason → `shiftStore.addCashMovement`); list rows time/description/±mono-amount (green in, danger out). Close card: warn strip `"{n} held carts must be completed or discarded before closing."` when `heldCarts.length > 0` (Close disabled); `Counted cash` MoneyPad-backed input; expected breakdown line (`Expected: 2,000 + 12,485.25 − 310.00 + 1,000 − 750` — build from `ShiftTotals` fields: opening + cashSales − cashRefunds + cashIn − cashOut) + expected amount mono; over/short chip (soft-green `+x.xx` / danger-soft `−x.xx`); green **Close & print Z** → `closeShift` → render `ZReportView` full-screen state with **Print Z** + **Done** (→ `/shift-open`). Right rail: `Z REPORT PREVIEW` card fed live from `getShiftTotals` (same `ZReportView` component in preview mode fed a synthesized `ZReport` with counted = expected). `ZReportView` props `{ z: ZReport; preview?: boolean }` — mono 12px rows per design: Shift/Opened, per-method totals + Gross, Sales/Voids/Refunds (`1 (85.00)` format)/SC-PWD disc./Service charge, Opening float / Cash in-out net (`+250.00`) / Expected / Counted / Over-short.

- [ ] **Step 1: Write failing tests**

```ts
// day-boundary.test.ts
import { crossedDayBoundary } from "./day-boundary";
test("shift opened before 04:00 boundary nags after it", () => {
  // Manila 03:00 open (19:00Z prev day), now Manila 05:00 (21:00Z prev day) → crossed
  expect(crossedDayBoundary("2026-08-18T19:00:00.000Z", "04:00", "2026-08-18T21:00:00.000Z")).toBe(true);
  // opened 07:02 Manila, now 15:00 same day → not crossed
  expect(crossedDayBoundary("2026-08-18T23:02:00.000Z", "04:00", "2026-08-19T07:00:00.000Z")).toBe(false);
  // midnight default boundary
  expect(crossedDayBoundary("2026-08-19T10:00:00.000Z", "00:00", "2026-08-19T17:00:00.000Z")).toBe(true);
});
```

Shift page test: seed a cash sale + cash in 1000 + cash out 750; expected math renders; held cart blocks close (button disabled + warn strip); discard hold → close with counted → over/short computed and Z view shows.

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual against design 09.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): shift screen — X totals, cash movements, guarded close with Z report + day-boundary nag"`

---

### Task 21: Stock screen + quick adjust (design 10)

**Files:**
- Create: `pos/src/app/stock/page.tsx` (replace placeholder), `pos/src/components/stock/StockList.tsx`, `pos/src/components/stock/AdjustDialog.tsx`
- Test: `pos/src/app/stock/stock.test.tsx`

**Interfaces:**
- Consumes: catalog store (`stock`, `refreshStock`), `api.adjustStock`, `AdjustReason`.
- Produces: the stock page calls `catalog.refreshStock()` on mount so the list reflects this session's sales (its dialog copy says "System says {n}"); stock rows per design 10 — tracked products only (per-variant rows when variants exist, labeled `Iced Latte — Large`), name 14px/600, LOW `warn` badge when ≤ threshold / OUT `neutral` badge at 0, qty mono right (`formatQty` — weight shows 3dp `23.450`, label `Jasmine rice (kg)`), green-dark **Adjust** text button. `AdjustDialog` props `{ product: Product; variantId: string | null; currentQty: number; open: boolean; onClose(): void }` — per design: title `Adjust stock — {name}`, sub `System says {n}. Posted as an adjustment event with who and why — this is audit-logged.`, **New quantity** numeric entry (Numpad; decimals allowed only for weight), live `Δ {+2}` hint, required reason pill group (Damage / Expiry / Theft ∕ loss / Count correction / Other — single-select, active `dark`), optional note Input (placeholder `Note (optional) — "found 2 in the back chiller"`), Cancel + green **Post adjustment** (disabled until reason picked and qty valid ≥ 0) → `api.adjustStock` → `catalog.refreshStock()` → tiles/rows update (Ube loaf leaves OUT state on the Sale grid).

- [ ] **Step 1: Write failing test** — render stock page with seed: Pan de sal shows LOW and `8`; adjust Ube loaf to 2 with Count correction → row shows `2`, no OUT badge; posting without a reason is impossible (button disabled); negative qty rejected at input level.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): stock levels with low/out badges and audit-logged quick adjust"`

---

### Task 22: Settings screen + unpair + remote-unpair handling (design 11)

**Files:**
- Create: `pos/src/app/settings/page.tsx` (replace placeholder), `pos/src/components/settings/UnpairDialog.tsx`, `pos/src/components/settings/TestPrint.tsx`, `pos/src/components/receipt/sampleSale.ts`, `pos/src/lib/version.ts`, `pos/src/lib/handle-api-error.ts`
- Modify: `pos/src/state/catalog.ts` (its `UnauthorizedError` catch calls `resetTerminalState()`), `pos/src/api/mock/adapter.ts` (add dev-only helper `debugRevokeDevice()` on the mock to simulate portal remote-unpair), `pos/src/app/payment/page.tsx`, `pos/src/app/shift/page.tsx`, `pos/src/app/stock/page.tsx`, `pos/src/app/history/page.tsx` (wrap their API call sites with `handleApiError`)
- Test: `pos/src/app/settings/settings.test.tsx`

**Interfaces:**
- Consumes: settings store, pairing store, `api.unpair`, `printReceipt`, `ReceiptView` (preview with a canned sample sale fixture exported as `SAMPLE_SALE` from `pos/src/components/receipt/sampleSale.ts` — create it here; a small completed sale built with real `computeTotals`).
- Produces: four cards per design 11 —
  1. **Receipt paper width**: `58 mm` / `80 mm` toggle pills (active `dark`; writes settings store) + **Test print** secondary pill (prints `SAMPLE_SALE` at the chosen width).
  2. **Receipt preview**: sub `Header, footer, and TIN come from the portal's business settings` + **Preview** pill → Dialog showing `ReceiptView` of `SAMPLE_SALE` at chosen width.
  3. **Connection**: sub `Online · API reachable · last catalog load {formatManilaTime(loadedAt)}` (from catalog store + a `health()` ping on mount) + `HEALTHY` soft-green badge / `UNREACHABLE` warn badge.
  4. **Paired to {business} — {branch} ({code}), {terminalName}**: sub `Unpairing requires the owner to sign in. The owner can also unpair remotely from the portal.` + **Unpair…** outline-destructive → `UnpairDialog`: email + password re-auth → `api.unpair` → `resetTerminalState()` → router `/pair`.
  Footer line: `Sentry POS v0.1.0 · refund PIN is managed in the owner portal` (version from `package.json` via literal constant `APP_VERSION` in `pos/src/lib/version.ts` — keep in sync manually).
  Remote unpair: every post-pairing mock method throws `UnauthorizedError` once revoked (Task 5's `assertNotRevoked`), so the 401 can surface from any call site. `pos/src/lib/handle-api-error.ts` exports two functions: `resetTerminalState()` — the ONE full-reset choke point calling `usePairingStore.unpair()` + `useCartStore.resetAll()` + `useShiftStore.reset()` — and `handleApiError(e, router?)`: `UnauthorizedError` → `resetTerminalState()` + `router.replace("/pair")` when a router is passed (the catalog store's catch calls `resetTerminalState()` only — it runs inside a store, and TerminalGate's unpaired→`/pair` redirect handles navigation); `NetworkError` → toast "Offline — no network, no selling until the offline milestone"; anything else rethrows. Apply `handleApiError` at the payment/shift/stock/history API call sites (those pages are in this task's Modify list). `UnpairDialog`'s success path also calls `resetTerminalState()`.

- [ ] **Step 1: Write failing test** — paper width toggle persists (localStorage round-trip); unpair with wrong password errors inline and stays paired; correct credentials unpair (status back to `"unpaired"`); after `debugRevokeDevice()`, a catalog refresh resets pairing (remote-unpair path).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests pass; manual sweep of design 11.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): settings — paper width, test print, preview, connection health, unpair + 401 reset"`

---

### Task 23: Responsive collapse pass (phone layouts)

**Files:**
- Modify: `pos/src/app/sale/page.tsx` + `CartPane.tsx` (below `md`: product area becomes a single-column list of compact rows [name, price, add]; cart collapses into a bottom bar — item count + `formatPeso(total)` + **View sale** — opening the cart in a `Sheet side="bottom"` with the full CartPane content), `payment/page.tsx` (rail stacks under the panel below `md`; amount 40px), `history/page.tsx` (row meta wraps; columns hide gracefully), `shift/page.tsx` (KPI cards stack; Z preview moves below), `stock/page.tsx`, `settings/page.tsx` (cards full-width), `TopBar.tsx` (nav pills scroll horizontally `overflow-x-auto no-scrollbar`; status chips collapse to dots-only below `sm`)
- Test: `pos/src/components/sale/responsive.test.tsx`

**Interfaces:**
- Consumes: everything shipped; Tailwind breakpoints per design-spec (`<480`, `480–767`, `768–1023`, `1024+`; tablet landscape 1024+ is the design target and must remain pixel-true to the canvas).
- Produces: usable phone layout per pos-spec §1 ("phones get the collapsed list layout"). No feature loss at any width.

- [ ] **Step 1: Write failing test** — mock `matchMedia`/viewport (set `window.innerWidth = 390` + fire resize; components read a `useIsPhone()` hook — create `pos/src/lib/use-media.ts` with `useIsPhone(): boolean` built on `matchMedia("(max-width: 767px)")`): Sale page at phone width renders the bottom cart bar (`View sale`) instead of the side pane; at 1194 renders the side pane.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** with the `useIsPhone` hook for structural swaps and Tailwind classes for the rest.
- [ ] **Step 4: Tests pass; manual dev-tools sweep at 390 / 768 / 1194 widths on all screens.**
- [ ] **Step 5: Commit & push** — `git commit -m "feat(pos): responsive collapse — phone list layout with bottom-sheet cart"`

---

### Task 24: Verification sweep + README

**Files:**
- Create: `pos/README.md`, root `README.md`
- Modify: anything the sweep flags

**Interfaces:** consumes everything; produces the verified, documented app.

- [ ] **Step 1: Full verification** — from `pos/`: `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` all green; `npm run build` emits `out/` with all 10 routes; `npx serve out` (or any static server) manual E2E: pair → open shift → grid + barcode + variant + weight + misc sale → discounts + SC/PWD → hold/resume → cash payment with change → receipt print preview → history → void → refund with PIN (wrong-PIN lockout message) → cash in/out → close shift with Z → stock adjust un-blocks a tile → settings paper width + test print + unpair. Fix whatever fails before proceeding.
- [ ] **Step 2: Write `pos/README.md`** — what the app is, dev commands (`npm run dev|test|lint|build`), **mock mode** section: credentials `maria@kapediaria.ph` / `sentry-demo`, refund PIN `123456`, data persists in localStorage (`sentry-pos:mock:v1`; clear site data to reset), `NEXT_PUBLIC_API_MODE` seam explanation (mock today; HTTP adapter + openapi-typescript client when `sentry-pos-be` ships), architecture map (lib/domain/api/state/components), pointer to `design/pos-terminal.dc.html` and the specs. Root `README.md`: repo layout (`pos/` now, `portal/` next), spec index.
- [ ] **Step 3: Commit & push** — `git add -A && git commit -m "docs(pos): README + verification sweep fixes" && git push origin main`

---

## Deferred (explicitly NOT in this plan)

- `portal/` app, `sentry-pos-be` (milestone 1 backend — separate plan; when it lands, add the HTTP `PosApi` adapter + openapi-typescript client and delete nothing else)
- Offline layer: Dexie mirror, Serwist shell caching, sync queue/cursors (milestone 4 — conventions are already in place: client UUIDs, append-only mock events, static export)
- Everything in pos-spec §12 non-goals (split payments, partial refunds, staff PINs, etc.)
