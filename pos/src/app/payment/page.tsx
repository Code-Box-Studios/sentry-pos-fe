"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApi } from "@/api";
import { StockConflictError } from "@/api/errors";
import type { SaleDraft } from "@/api/types";
import { CashPanel } from "@/components/payment/CashPanel";
import { MethodPills } from "@/components/payment/MethodPills";
import { NonCashPanel } from "@/components/payment/NonCashPanel";
import { OrderSummaryRail } from "@/components/payment/OrderSummaryRail";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/domain/types";
import { handleApiError } from "@/lib/handle-api-error";
import { formatPeso } from "@/lib/money";
import { nowIso } from "@/lib/time";
import { newId } from "@/lib/uuid";
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { useLastSaleStore } from "@/state/lastSale";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: "dine-in",
  takeout: "takeout",
  none: "no order type",
};

export default function PaymentPage() {
  const router = useRouter();
  const business = useCatalogStore((s) => s.catalog?.business ?? null);
  const refreshStock = useCatalogStore((s) => s.refreshStock);
  const cart = useCartStore((s) => s.cart);
  const clearCart = useCartStore((s) => s.clear);
  const shift = useShiftStore((s) => s.shift);
  const branchCode = usePairingStore((s) => s.branch?.code ?? "—");
  const terminalCode = usePairingStore((s) => s.terminalCode ?? "—");
  const setLastSale = useLastSaleStore((s) => s.set);

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tenderedC, setTenderedC] = useState<number | null>(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [busy, setBusy] = useState(false);

  const totals = useCartStore((s) => s.totals)({
    taxRate: business?.taxRate ?? 0,
    serviceChargeRate: business?.serviceChargeRate ?? 0,
  });

  async function complete() {
    if (!shift || busy) return;
    setBusy(true);
    const pairing = usePairingStore.getState();
    const tendered = method === "cash" ? tenderedC ?? 0 : totals.totalC;

    const draft: SaleDraft = {
      id: newId(),
      // Peek, never consume: a failed attempt must not burn a receipt number.
      receiptNo: pairing.peekReceiptNo(),
      shiftId: shift.id,
      orderType: cart.orderType,
      lines: cart.lines,
      orderDiscount: cart.orderDiscount,
      scPwd: cart.scPwd,
      totals,
      payment: {
        id: newId(),
        method,
        referenceNo: method === "cash" || referenceNo.trim() === "" ? null : referenceNo.trim(),
        amountC: totals.totalC,
        tenderedC: tendered,
        changeC: Math.max(0, tendered - totals.totalC),
      },
      createdAtDevice: nowIso(),
    };

    try {
      const sale = await getApi().completeSale(draft);
      pairing.commitReceiptSeq();
      await refreshStock();
      setLastSale(sale);
      clearCart();
      router.replace("/receipt");
    } catch (e) {
      if (e instanceof StockConflictError) {
        // Another terminal took the last unit. Keep the cart, show which line, leave the number unused.
        useCartStore.setState({
          conflictLineIds: e.conflicts.map((c) => c.lineId).filter((id): id is string => id !== null),
        });
        await refreshStock();
        toast.error("Stock changed — fix the highlighted line");
        router.replace("/sale");
        return;
      }
      try {
        handleApiError(e, router);
      } catch {
        toast.error(e instanceof Error ? e.message : "Could not complete the sale");
      }
    } finally {
      setBusy(false);
    }
  }

  const lineCount = cart.lines.length;

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <header className="flex h-[52px] flex-none items-center gap-4 border-b border-hairline bg-white px-5">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back to sale
        </Button>
        <div className="flex-1" />
        <div className="font-mono text-[13px] font-semibold text-slate">
          {branchCode} · {terminalCode}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <section className="flex flex-1 flex-col items-center justify-center gap-7 p-6 md:overflow-y-auto">
          <div className="flex flex-col items-center gap-1">
            <div className="text-sm font-semibold tracking-widest text-steel">AMOUNT DUE</div>
            <div aria-label="Amount due" className="font-mono text-[40px] leading-none font-bold tracking-tight text-ink md:text-[64px]">
              {formatPeso(totals.totalC)}
            </div>
            <div className="text-[13px] text-stone">
              {lineCount} {lineCount === 1 ? "line" : "lines"} · {ORDER_TYPE_LABEL[cart.orderType]} · VAT included{" "}
              {formatPeso(totals.vatC)}
            </div>
          </div>

          <MethodPills value={method} onChange={setMethod} />

          {method === "cash" ? (
            <CashPanel
              totalC={totals.totalC}
              tenderedC={tenderedC}
              onTenderedChange={setTenderedC}
              onComplete={complete}
              busy={busy}
            />
          ) : (
            <NonCashPanel
              totalC={totals.totalC}
              referenceNo={referenceNo}
              onReferenceChange={setReferenceNo}
              onComplete={complete}
              busy={busy}
            />
          )}
        </section>

        <OrderSummaryRail cart={cart} totals={totals} />
      </div>
    </main>
  );
}
