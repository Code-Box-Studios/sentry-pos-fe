"use client";

import type { Product } from "@/domain/types";
import { useCatalogStore } from "@/state/catalog";
import { ALL_CATEGORIES } from "./CategoryTabs";
import { ProductTile } from "./ProductTile";

export function matchesSearch(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return product.name.toLowerCase().includes(q) || (product.sku ?? "").toLowerCase().includes(q);
}

export function ProductGrid({
  products,
  categoryId,
  search,
  onSelect,
}: {
  products: Product[];
  categoryId: string;
  search: string;
  onSelect(product: Product): void;
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

  return (
    <div className="grid flex-1 auto-rows-[118px] grid-cols-2 content-start gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
      {visible.map((p) => (
        <ProductTile key={p.id} product={p} availableQty={availableQty(p.id, null)} onSelect={onSelect} />
      ))}
    </div>
  );
}
