"use client";

import { Badge } from "@/components/ui/badge";
import type { Product } from "@/domain/types";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";

function priceLabel(product: Product): string {
  if (product.variants.length > 0) {
    const from = Math.min(...product.variants.map((v) => v.priceC));
    return `from ${formatPeso(from)}`;
  }
  if (product.soldBy === "weight") return `${formatPeso(product.priceC)} / kg`;
  return formatPeso(product.priceC);
}

export function ProductTile({
  product,
  availableQty,
  onSelect,
}: {
  product: Product;
  availableQty: number | null;
  onSelect(product: Product): void;
}) {
  const tracked = product.trackStock && availableQty !== null;
  const out = tracked && availableQty <= 0;
  const low =
    tracked && !out && product.lowStockThreshold !== null && availableQty <= product.lowStockThreshold;

  return (
    <button
      type="button"
      disabled={out}
      onClick={() => onSelect(product)}
      className={cn(
        "flex h-full flex-col justify-between rounded-lg border border-hairline p-3.5 text-left transition-colors",
        out ? "bg-surface opacity-75" : "bg-white active:bg-hairline-soft"
      )}
    >
      <div className="flex flex-col items-start gap-1">
        <div className={cn("text-[15px] font-semibold", out ? "text-stone" : "text-ink")}>{product.name}</div>
        {out && <Badge variant="neutral">OUT OF STOCK</Badge>}
        {low && <Badge variant="warn">{`LOW · ${availableQty} LEFT`}</Badge>}
        {!out && !low && product.variants.length > 0 && (
          <div className="text-[11px] font-semibold tracking-widest text-green-dark">
            {product.variants.length} SIZES
          </div>
        )}
        {!out && !low && product.variants.length === 0 && product.soldBy === "weight" && (
          <div className="text-[11px] font-semibold tracking-widest text-steel">BY WEIGHT</div>
        )}
      </div>
      <div className={cn("text-sm", out ? "text-mist" : "text-steel")}>{priceLabel(product)}</div>
    </button>
  );
}
