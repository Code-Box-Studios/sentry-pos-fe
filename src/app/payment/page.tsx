"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApi } from "@/api";
import { StockConflictError, ValidationError } from "@/api/errors";
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
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { useLastSaleStore } from "@/state/lastSale";
import { useOperatorStore } from "@/state/operator";
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

  const pending = useCartStore(s => s.pendingDraft);
  const submitting = useRef(false);
  const [method, setMethod] = useState<PaymentMethod>(pending?.payment.method ?? "cash");
  const [tenderedC, setTenderedC] = useState<number | null>(pending?.payment.tenderedC ?? null);
  const [referenceNo, setReferenceNo] = useState(pending?.payment.referenceNo ?? "");
  const [busy, setBusy] = useState(false);

  const computeTotals = useCartStore((s) => s.totals);
  const totals = pending?.totals ?? computeTotals({
    taxRate: business?.taxRate ?? 0,
    serviceChargeRate: business?.serviceChargeRate ?? 0,
  });

  async function complete() {
    if (submitting.current || (!pending && (!shift || cart.lines.length === 0))) return;
    submitting.current = true;
    setBusy(true);
    const pairing = usePairingStore.getState();
    const tendered = method === "cash" ? tenderedC ?? 0 : totals.totalC;

    // Preserve the entire request until the API confirms success or a definitive rejection.
    const { saleId, paymentId } = useCartStore.getState().ensurePendingIds();

    const draft: SaleDraft = pending ?? {
      id: saleId,
      // Peek, never consume: a failed attempt must not burn a receipt number.
      receiptNo: pairing.peekReceiptNo(),
      shiftId: shift!.id,
      operatorUserId: useOperatorStore.getState().operator?.userId ?? null,
      orderType: cart.orderType,
      lines: cart.lines,
      orderDiscount: cart.orderDiscount,
      scPwd: cart.scPwd,
      totals,
      payment: {
        id: paymentId,
        method,
        referenceNo: method === "cash" || referenceNo.trim() === "" ? null : referenceNo.trim(),
        amountC: totals.totalC,
        tenderedC: tendered,
        changeC: Math.max(0, tendered - totals.totalC),
      },
      createdAtDevice: nowIso(),
    };

    try {
      const snapshot = useCartStore.getState().savePendingDraft(draft);
      const sale = await getApi().completeSale(snapshot);
      if (pairing.peekReceiptNo() === snapshot.receiptNo) pairing.commitReceiptSeq();
      useCartStore.getState().releasePending();
      // The sale is committed and the receipt number spent: nothing below may throw, or the
      // cashier is stranded with a paid sale and no receipt. Stock refresh is best-effort only.
      refreshStock().catch(() => {});
      setLastSale(sale);
      clearCart();
      router.replace("/receipt");
    } catch (e) {
      if (e instanceof ValidationError || e instanceof StockConflictError) useCartStore.getState().releasePending();
      if (e instanceof StockConflictError) {
        // Another terminal took the last unit. Keep the cart, show which line, leave the number unused.
        useCartStore.setState({
          conflictLineIds: e.conflicts.map((c) => c.lineId).filter((id): id is string => id !== null),
        });
        await refreshStock().catch(() => {});
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
      submitting.current = false;
      setBusy(false);
    }
  }

  const lineCount = cart.lines.length;

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <header className="flex h-[52px] flex-none items-center gap-4 border-b border-hairline bg-white px-5">
        <Button variant="ghost" size="sm" disabled={busy || !!pending} onClick={() => router.back()}>
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

          {pending && <div role="status" className="max-w-md rounded border border-hairline p-3 text-sm">
            This payment is awaiting confirmation. Retry the original payment before changing the sale.
          </div>}
          <fieldset disabled={busy || !!pending} className="contents">
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
          </fieldset>
          {pending && <Button disabled={busy} onClick={complete}>Retry original payment</Button>}
        </section>

        <OrderSummaryRail cart={cart} totals={totals} />
      </div>
    </main>
  );
}
