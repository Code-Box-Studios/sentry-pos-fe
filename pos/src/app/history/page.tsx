"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApi } from "@/api";
import type { CompletedSale, SaleSummary } from "@/api/types";
import { TopBar } from "@/components/chrome/TopBar";
import { SaleDetail } from "@/components/history/SaleDetail";
import { RefundDialog } from "@/components/history/RefundDialog";
import { SaleRow } from "@/components/history/SaleRow";
import { VoidDialog } from "@/components/history/VoidDialog";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { manilaDateKey, nowIso } from "@/lib/time";

function summarise(sales: SaleSummary[]): string {
  // The Z model counts a refunded sale as sold and nets the refund separately; voids never count.
  const sold = sales.filter((s) => s.status !== "voided");
  const grossC = sold.reduce((sum, s) => sum + s.totalC, 0);
  const voids = sales.filter((s) => s.status === "voided").length;
  const refunds = sales.filter((s) => s.status === "refunded").length;
  const parts = [`${sold.length} ${sold.length === 1 ? "sale" : "sales"}`, formatPeso(grossC)];
  if (voids > 0) parts.push(`${voids} ${voids === 1 ? "void" : "voids"}`);
  if (refunds > 0) parts.push(`${refunds} ${refunds === 1 ? "refund" : "refunds"}`);
  return parts.join(" · ");
}

export default function HistoryPage() {
  const today = manilaDateKey(nowIso());
  const [date, setDate] = useState<string | null>(today);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [selected, setSelected] = useState<CompletedSale | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setSales(await getApi().listSales({ date }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load sales");
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(id: string) {
    try {
      setSelected(await getApi().getSale(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the sale");
    }
  }

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="history" />

      {selected ? (
        <>
          <SaleDetail
            sale={selected}
            onBack={() => setSelected(null)}
            onVoid={() => setVoidOpen(true)}
            onRefund={() => setRefundOpen(true)}
          />
          <VoidDialog
            sale={selected}
            open={voidOpen}
            onClose={() => setVoidOpen(false)}
            onDone={(updated) => {
              setSelected(updated);
              void load();
            }}
          />
          <RefundDialog
            sale={selected}
            open={refundOpen}
            onClose={() => setRefundOpen(false)}
            onDone={(updated) => {
              setSelected(updated);
              void load();
            }}
          />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 px-6 py-5">
            <Button
              size="sm"
              variant={date === today ? "dark" : "secondary"}
              className={date === today ? "" : "border-hairline bg-white"}
              onClick={() => setDate(today)}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={date === null ? "dark" : "secondary"}
              className={date === null ? "" : "border-hairline bg-white"}
              onClick={() => setDate(null)}
            >
              All
            </Button>
            <label className="flex items-center gap-2 rounded-full border border-hairline bg-white px-4 py-1.5 text-[13px] font-semibold text-steel">
              <span>Pick a date</span>
              <input
                type="date"
                aria-label="Pick a date"
                value={date ?? ""}
                onChange={(e) => setDate(e.target.value === "" ? null : e.target.value)}
                className="bg-transparent font-sans text-[13px] text-ink outline-none"
              />
            </label>
            <div className="flex-1" />
            <div className="text-sm text-steel">{summarise(sales)}</div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 pb-6">
            {sales.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone">No sales for this date.</p>
            ) : (
              sales.map((sale) => <SaleRow key={sale.id} sale={sale} onSelect={() => open(sale.id)} />)
            )}
          </div>
        </>
      )}
    </main>
  );
}
