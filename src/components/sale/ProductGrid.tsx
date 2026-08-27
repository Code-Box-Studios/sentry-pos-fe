"use client";

import { Badge } from "@/components/ui/badge";
import type { Product } from "@/domain/types";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCatalogStore } from "@/state/catalog";
import { ALL_CATEGORIES } from "./CategoryTabs";
import { ProductTile } from "./ProductTile";

export function matchesSearch(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return product.name.toLowerCase().includes(q) || (product.sku ?? "").toLowerCase().includes(q);
}

function priceLabel(product: Product): string {
  if (product.variants.length > 0) return `from ${formatPeso(Math.min(...product.variants.map((v) => v.priceC)))}`;
  return product.soldBy === "weight" ? `${formatPeso(product.priceC)} / kg` : formatPeso(product.priceC);
}

/** Phones get one compact row per product instead of the tile grid (pos-spec §1). */
function ProductRow({
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
  const low = tracked && !out && product.lowStockThreshold !== null && availableQty <= product.lowStockThreshold;

  return (
    <button
      type="button"
      disabled={out}
      onClick={() => onSelect(product)}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-hairline px-4 py-3 text-left",
        out ? "bg-surface opacity-75" : "bg-white active:bg-hairline-soft"
      )}
    >
      <span className={cn("flex-1 text-[15px] font-semibold", out ? "text-stone" : "text-ink")}>
        {product.name}
      </span>
      {out && <Badge variant="neutral">OUT OF STOCK</Badge>}
      {low && <Badge variant="warn">{`LOW · ${availableQty} LEFT`}</Badge>}
      <span className={cn("text-sm", out ? "text-mist" : "text-steel")}>{priceLabel(product)}</span>
      {!out && <span className="text-lg font-semibold text-green-dark">+</span>}
    </button>
  );
}

export function ProductGrid({
  products,
  categoryId,
  search,
  onSelect,
  layout = "grid",
}: {
  products: Product[];
  categoryId: string;
  search: string;
  onSelect(product: Product): void;
  layout?: "grid" | "list";
}) {
  const availableQty = useCatalogStore((s) => s.availableQty);
  // Subscribing to the map keeps tiles honest after a sale decrements stock.
  useCatalogStore((s) => s.stock);

  const visible = products.filter(
    (p) => p.active && (categoryId === ALL_CATEGORIES || p.categoryId === categoryId) && matchesSearch(p, search)
  );

  if (visible.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-stone">No products match.</div>;
  }

  if (layout === "list") {
    return (
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {visible.map((p) => (
          <ProductRow key={p.id} product={p} availableQty={availableQty(p.id, null)} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid flex-1 auto-rows-[118px] grid-cols-2 content-start gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
      {visible.map((p) => (
        <ProductTile key={p.id} product={p} availableQty={availableQty(p.id, null)} onSelect={onSelect} />
      ))}
    </div>
  );
}
