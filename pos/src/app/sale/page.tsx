"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/chrome/TopBar";
import { ALL_CATEGORIES, CategoryTabs } from "@/components/sale/CategoryTabs";
import { ProductGrid } from "@/components/sale/ProductGrid";
import { SearchBar } from "@/components/sale/SearchBar";
import type { Product } from "@/domain/types";
import { useCatalogStore } from "@/state/catalog";
import { CartStockError, useCartStore } from "@/state/cart";

export default function SalePage() {
  const catalog = useCatalogStore((s) => s.catalog);
  const addProduct = useCartStore((s) => s.addProduct);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState("");

  const business = catalog?.business ?? null;

  function selectProduct(product: Product) {
    // Variants, modifier groups and weight entry all need a sheet — wired in Tasks 11–12.
    if (product.variants.length > 0 || product.modifierGroupIds.length > 0) return;
    if (product.soldBy === "weight") return;
    try {
      addProduct(product);
    } catch (e) {
      if (e instanceof CartStockError) toast.error(`Out of stock — ${product.name}`);
      else throw e;
    }
  }

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="sale" />
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            allowMisc={business?.allowMiscItems ?? false}
            autoFocus={business?.type === "retail"}
          />
          <CategoryTabs categories={catalog?.categories ?? []} value={categoryId} onChange={setCategoryId} />
          <ProductGrid
            products={catalog?.products ?? []}
            categoryId={categoryId}
            search={search}
            onSelect={selectProduct}
          />
        </section>
        <aside className="hidden w-[392px] flex-none border-l border-hairline bg-white md:block" />
      </div>
    </main>
  );
}
