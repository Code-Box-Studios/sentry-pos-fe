"use client";

import { Badge } from "@/components/ui/badge";
import type { Product } from "@/domain/types";
import { formatQty } from "@/lib/qty";

export interface StockRow {
  key: string;
  product: Product;
  variantId: string | null;
  label: string;
  qty: number;
}

/** Only stock-tracked products appear; variants get a row each (pos-spec §9). */
export function buildStockRows(
  products: Product[],
  availableQty: (productId: string, variantId: string | null) => number | null
): StockRow[] {
  return products
    .filter((p) => p.active && p.trackStock)
    .flatMap((product): StockRow[] => {
      const suffix = product.soldBy === "weight" ? " (kg)" : "";
      if (product.variants.length === 0) {
        return [
          {
            key: product.id,
            product,
            variantId: null,
            label: `${product.name}${suffix}`,
            qty: availableQty(product.id, null) ?? 0,
          },
        ];
      }
      return product.variants.map((v) => ({
        key: `${product.id}:${v.id}`,
        product,
        variantId: v.id,
        label: `${product.name} — ${v.name}${suffix}`,
        qty: availableQty(product.id, v.id) ?? 0,
      }));
    });
}

export function StockList({ rows, onAdjust }: { rows: StockRow[]; onAdjust(row: StockRow): void }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-stone">Nothing is stock-tracked yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        const out = row.qty <= 0;
        const low =
          !out && row.product.lowStockThreshold !== null && row.qty <= row.product.lowStockThreshold;
        return (
          <div
            key={row.key}
            className="flex items-center gap-4 rounded-lg border border-hairline bg-white px-5 py-3"
          >
            <div className="flex-1 text-sm font-semibold text-ink">{row.label}</div>
            {out && <Badge variant="neutral">OUT</Badge>}
            {low && <Badge variant="warn">LOW</Badge>}
            <div className="w-[90px] text-right font-mono text-sm text-ink">
              {formatQty(row.qty, row.product.soldBy)}
            </div>
            <button
              type="button"
              onClick={() => onAdjust(row)}
              className="text-[13px] font-semibold text-green-dark"
            >
              Adjust
            </button>
          </div>
        );
      })}
    </div>
  );
}
