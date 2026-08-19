"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/chrome/TopBar";
import { AdjustDialog } from "@/components/stock/AdjustDialog";
import { buildStockRows, StockList, type StockRow } from "@/components/stock/StockList";
import { useCatalogStore } from "@/state/catalog";

export default function StockPage() {
  const products = useCatalogStore((s) => s.catalog?.products ?? []);
  const availableQty = useCatalogStore((s) => s.availableQty);
  const refreshStock = useCatalogStore((s) => s.refreshStock);
  // Subscribing to the map keeps the list live after a sale or an adjustment.
  useCatalogStore((s) => s.stock);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);

  useEffect(() => {
    // The dialog says "System says {n}", so start from the server's numbers.
    void refreshStock().catch((e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not load stock")
    );
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
