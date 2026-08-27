"use client";

import type { CompletedSale, SaleStatus } from "@/api/types";
import { ReceiptView } from "@/components/receipt/ReceiptView";
import { printNode } from "@/components/receipt/printReceipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";
import { useSettingsStore } from "@/state/settings";
import { useShiftStore } from "@/state/shift";

const STATUS: Record<SaleStatus, { label: string; variant: "soft-green" | "warn" | "danger-soft" }> = {
  completed: { label: "COMPLETED", variant: "soft-green" },
  voided: { label: "VOIDED", variant: "warn" },
  refunded: { label: "REFUNDED", variant: "danger-soft" },
};

export function SaleDetail({
  sale,
  onBack,
  onVoid,
  onRefund,
}: {
  sale: CompletedSale;
  onBack(): void;
  onVoid?(): void;
  onRefund?(): void;
}) {
  const business = useCatalogStore((s) => s.catalog?.business ?? null);
  const branch = usePairingStore((s) => s.branch);
  const terminalCode = usePairingStore((s) => s.terminalCode ?? "");
  const paperWidth = useSettingsStore((s) => s.paperWidth);
  const shift = useShiftStore((s) => s.shift);

  if (!business || !branch) return null;

  const status = STATUS[sale.status];
  // Voids are a same-shift mistake control; once the shift closes, reversal is always a refund.
  const canVoid = sale.status === "completed" && shift !== null && shift.id === sale.shiftId;
  const canRefund = sale.status === "completed";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-[52px] flex-none items-center gap-4 border-b border-hairline bg-white px-5">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← History
        </Button>
        <span className="font-mono text-[15px] font-semibold text-ink">{sale.receiptNo}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            printNode(
              <ReceiptView
                sale={sale}
                business={business}
                branch={branch}
                terminalCode={terminalCode}
                reprint
              />,
              paperWidth
            )
          }
        >
          Reprint
        </Button>
        {canVoid && (
          <Button variant="outline-destructive" size="sm" onClick={onVoid} disabled={!onVoid}>
            Void…
          </Button>
        )}
        {canRefund && (
          <Button variant="outline-destructive" size="sm" onClick={onRefund} disabled={!onRefund}>
            Refund…
          </Button>
        )}
      </header>

      <div className="flex flex-1 justify-center overflow-y-auto p-6">
        <div
          className="h-fit shadow-[0_4px_12px_0_rgba(0,30,43,0.08)]"
          style={{ width: paperWidth === "58" ? 240 : 320 }}
        >
          <ReceiptView sale={sale} business={business} branch={branch} terminalCode={terminalCode} />
        </div>
      </div>
    </div>
  );
}
