"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReceiptView } from "@/components/receipt/ReceiptView";
import { printNode } from "@/components/receipt/printReceipt";
import { Button } from "@/components/ui/button";
import { useCatalogStore } from "@/state/catalog";
import { useLastSaleStore } from "@/state/lastSale";
import { usePairingStore } from "@/state/pairing";
import { useSettingsStore } from "@/state/settings";

export default function ReceiptPage() {
  const router = useRouter();
  const sale = useLastSaleStore((s) => s.sale);
  const business = useCatalogStore((s) => s.catalog?.business ?? null);
  const branch = usePairingStore((s) => s.branch);
  const terminalCode = usePairingStore((s) => s.terminalCode ?? "");
  const paperWidth = useSettingsStore((s) => s.paperWidth);

  // Deep-loading /receipt with nothing to show belongs back at the sale screen.
  useEffect(() => {
    if (!sale) router.replace("/sale");
  }, [sale, router]);

  if (!sale || !business || !branch) return null;

  const receipt = (
    <ReceiptView sale={sale} business={business} branch={branch} terminalCode={terminalCode} />
  );

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <header className="flex h-[52px] flex-none items-center gap-4 border-b border-hairline bg-white px-5">
        <div className="flex items-center gap-2">
          <div className="flex size-[22px] items-center justify-center rounded-full bg-brand-green text-xs font-semibold text-ink">
            ✓
          </div>
          <div className="text-[15px] font-semibold text-ink">Sale completed — {sale.receiptNo}</div>
        </div>
        <div className="flex-1" />
        <div className="font-mono text-[13px] font-semibold text-slate">
          {branch.code} · {terminalCode}
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-12 overflow-y-auto p-6 md:flex-row">
        <div
          className="shadow-[0_4px_12px_0_rgba(0,30,43,0.08)]"
          style={{ width: paperWidth === "58" ? 240 : 320 }}
        >
          {receipt}
        </div>

        <div className="flex w-[280px] max-w-full flex-col gap-3">
          <Button size="lg" className="h-[52px]" onClick={() => printNode(receipt, paperWidth)}>
            Print receipt
          </Button>
          <Button size="lg" variant="secondary" className="h-[52px]" onClick={() => router.replace("/sale")}>
            Done — new sale
          </Button>
          <p className="text-center text-[13px] text-stone">
            Printing is optional per sale. Reprints from Sale Detail are stamped REPRINT.
          </p>
        </div>
      </div>
    </main>
  );
}
