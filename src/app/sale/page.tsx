"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TopBar } from "@/components/chrome/TopBar";
import { CartPane } from "@/components/sale/CartPane";
import { ALL_CATEGORIES, CategoryTabs } from "@/components/sale/CategoryTabs";
import { ProductGrid } from "@/components/sale/ProductGrid";
import { DiscountPicker, type DiscountTarget } from "@/components/sale/DiscountPicker";
import { HeldCartsSheet } from "@/components/sale/HeldCartsSheet";
import { HoldDialog } from "@/components/sale/HoldDialog";
import { MiscItemModal } from "@/components/sale/MiscItemModal";
import { ScPwdModal } from "@/components/sale/ScPwdModal";
import { SearchBar } from "@/components/sale/SearchBar";
import { VariantModifierSheet } from "@/components/sale/VariantModifierSheet";
import { useBarcodeWedge } from "@/components/sale/useBarcodeWedge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatPeso } from "@/lib/money";
import { useIsPhone } from "@/lib/use-media";
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
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);
  const [miscOpen, setMiscOpen] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<DiscountTarget | null>(null);
  const [scPwdOpen, setScPwdOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const isPhone = useIsPhone();
  const [holdOpen, setHoldOpen] = useState(false);
  const [heldListOpen, setHeldListOpen] = useState(false);
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
    if (product.variants.length > 0 || product.modifierGroupIds.length > 0) {
      setSheetProduct(product);
      return;
    }
    if (product.soldBy === "weight") {
      setWeightFor({ product, lineId: null });
      return;
    }
    withStockToast(product.name, () => addProduct(product));
  }

  // An exact barcode match adds instantly; scanning again just stacks the same line.
  function handleScan(code: string) {
    for (const product of catalog?.products ?? []) {
      const variant = product.variants.find((v) => v.barcode === code);
      if (variant) {
        withStockToast(product.name, () => addProduct(product, { variantId: variant.id }));
        return;
      }
      if (product.barcode === code) {
        if (product.soldBy === "weight") setWeightFor({ product, lineId: null });
        else withStockToast(product.name, () => addProduct(product));
        return;
      }
    }
    toast.error(`No product for ${code}`);
  }

  useBarcodeWedge(handleScan);

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

  const lines = useCartStore((s) => s.cart.lines);
  const lineCount = lines.length;
  const cartTotalC = useCartStore((s) => s.totals)({
    taxRate: business?.taxRate ?? 0,
    serviceChargeRate: business?.serviceChargeRate ?? 0,
  }).totalC;

  // One instance of the pane, mounted either in the side rail or in the phone sheet.
  const cartPane = (
    <CartPane
      onCharge={() => router.push("/payment")}
      onDiscount={() => setDiscountTarget({ kind: "order" })}
      onLineDiscount={(lineId) => setDiscountTarget({ kind: "line", lineId })}
      onScPwd={() => setScPwdOpen(true)}
      onHold={() => setHoldOpen(true)}
      onHeldList={() => setHeldListOpen(true)}
      onEditWeight={editLineWeight}
    />
  );

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="sale" />
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            allowMisc={business?.allowMiscItems ?? false}
            onMisc={() => setMiscOpen(true)}
            autoFocus={business?.type === "retail"}
          />
          <CategoryTabs categories={catalog?.categories ?? []} value={categoryId} onChange={setCategoryId} />
          <ProductGrid
            products={catalog?.products ?? []}
            categoryId={categoryId}
            search={search}
            onSelect={selectProduct}
            layout={isPhone ? "list" : "grid"}
          />
        </section>
        {!isPhone && (
          <aside className="w-[392px] flex-none border-l border-hairline">
            {cartPane}
          </aside>
        )}
      </div>

      {isPhone && (
        <>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            disabled={lineCount === 0}
            className="flex h-16 flex-none items-center gap-3 border-t border-hairline bg-white px-5 text-left disabled:text-stone"
          >
            <span className="flex-1 text-[15px] font-semibold">
              {lineCount} {lineCount === 1 ? "item" : "items"} · {formatPeso(cartTotalC)}
            </span>
            <span className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-ink">
              View sale
            </span>
          </button>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent side="bottom" className="h-[88dvh] gap-0 bg-white p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Current sale</SheetTitle>
              </SheetHeader>
              {cartPane}
            </SheetContent>
          </Sheet>
        </>
      )}

      <VariantModifierSheet product={sheetProduct} onClose={() => setSheetProduct(null)} />
      <MiscItemModal open={miscOpen} onClose={() => setMiscOpen(false)} />
      <ScPwdModal open={scPwdOpen} onClose={() => setScPwdOpen(false)} />
      <HoldDialog open={holdOpen} onClose={() => setHoldOpen(false)} />
      <HeldCartsSheet open={heldListOpen} onClose={() => setHeldListOpen(false)} />
      {discountTarget && (
        <DiscountPicker target={discountTarget} open onClose={() => setDiscountTarget(null)} />
      )}

      <WeightModal
        product={weightFor?.product ?? null}
        initialQty={weightFor?.qty}
        onConfirm={confirmWeight}
        onClose={() => setWeightFor(null)}
      />
    </main>
  );
}
