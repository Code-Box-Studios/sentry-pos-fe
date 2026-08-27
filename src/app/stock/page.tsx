"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/chrome/TopBar";
import { AdjustDialog } from "@/components/stock/AdjustDialog";
import { buildStockRows, StockList, type StockRow } from "@/components/stock/StockList";
import { handleApiError } from "@/lib/handle-api-error";
import { useCatalogStore } from "@/state/catalog";

export default function StockPage() {
  const router = useRouter();
  // Router identity is not guaranteed stable; a ref keeps it out of effect deps and out of a loop.
  const routerRef = useRef(router);
  routerRef.current = router;
  const products = useCatalogStore((s) => s.catalog?.products ?? []);
  const availableQty = useCatalogStore((s) => s.availableQty);
  const refreshStock = useCatalogStore((s) => s.refreshStock);
  // Subscribing to the map keeps the list live after a sale or an adjustment.
  useCatalogStore((s) => s.stock);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);

  useEffect(() => {
    // The dialog says "System says {n}", so start from the server's numbers.
    void refreshStock().catch((e: unknown) => handleApiError(e, routerRef.current));
  }, [refreshStock]);

  const rows = buildStockRows(products, availableQty);

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="stock" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <StockList rows={rows} onAdjust={setAdjusting} />
      </div>

      {adjusting && (
        <AdjustDialog
          product={adjusting.product}
          variantId={adjusting.variantId}
          label={adjusting.label}
          currentQty={adjusting.qty}
          open
          onClose={() => setAdjusting(null)}
        />
      )}
    </main>
  );
}
