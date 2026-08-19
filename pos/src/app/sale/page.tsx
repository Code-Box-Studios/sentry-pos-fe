"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TopBar } from "@/components/chrome/TopBar";
import { CartPane } from "@/components/sale/CartPane";
import { ALL_CATEGORIES, CategoryTabs } from "@/components/sale/CategoryTabs";
import { ProductGrid } from "@/components/sale/ProductGrid";
import { SearchBar } from "@/components/sale/SearchBar";
import { WeightModal } from "@/components/sale/WeightModal";
import type { Product } from "@/domain/types";
import { useCatalogStore } from "@/state/catalog";
import { CartStockError, useCartStore } from "@/state/cart";

export default function SalePage() {
  const router = useRouter();
  const catalog = useCatalogStore((s) => s.catalog);
  const addProduct = useCartStore((s) => s.addProduct);
  const setQty = useCartStore((s) => s.setQty);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState("");
  const [weightFor, setWeightFor] = useState<{ product: Product; lineId: string | null; qty?: number } | null>(null);

  const business = catalog?.business ?? null;

  function withStockToast(name: string, fn: () => void) {
    try {
      fn();
    } catch (e) {
      if (e instanceof CartStockError) toast.error(`Out of stock — ${name}`);
      else throw e;
    }
  }

  function selectProduct(product: Product) {
    // Variants and modifier groups open the sheet in Task 12.
    if (product.variants.length > 0 || product.modifierGroupIds.length > 0) return;
    if (product.soldBy === "weight") {
      setWeightFor({ product, lineId: null });
      return;
    }
    withStockToast(product.name, () => addProduct(product));
  }

  function editLineWeight(lineId: string) {
    const line = useCartStore.getState().cart.lines.find((l) => l.id === lineId);
    const product = catalog?.products.find((p) => p.id === line?.productId);
    if (line && product) setWeightFor({ product, lineId, qty: line.qty });
  }

  function confirmWeight(qty: number) {
    if (!weightFor) return;
    const { product, lineId } = weightFor;
    withStockToast(product.name, () => {
      if (lineId) setQty(lineId, qty);
      else addProduct(product, { qty });
    });
    setWeightFor(null);
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
        <aside className="hidden w-[392px] flex-none border-l border-hairline md:block">
          <CartPane
            onCharge={() => router.push("/payment")}
            onDiscount={() => undefined}
            onLineDiscount={() => undefined}
            onScPwd={() => undefined}
            onHold={() => undefined}
            onHeldList={() => undefined}
            onEditWeight={editLineWeight}
          />
        </aside>
      </div>

      <WeightModal
        product={weightFor?.product ?? null}
        initialQty={weightFor?.qty}
        onConfirm={confirmWeight}
        onClose={() => setWeightFor(null)}
      />
    </main>
  );
}
