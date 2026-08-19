"use client";

import type { Cart, CartLine } from "@/domain/cart";
import type { CartTotals } from "@/domain/totals";
import { formatC, formatPeso } from "@/lib/money";
import { formatQty } from "@/lib/qty";

export function lineSummaryLabel(line: CartLine): string {
  const head =
    line.soldBy === "weight" ? `${formatQty(line.qty, "weight")} kg ${line.name}` : `${line.qty} × ${line.name}`;
  return line.modifiers.length > 0 ? `${head}, ${line.modifiers.map((m) => m.name).join(", ")}` : head;
}

export function OrderSummaryRail({ cart, totals }: { cart: Cart; totals: CartTotals }) {
  const discountsC = totals.promoDiscountC + totals.scPwdDiscountC;

  return (
    <aside className="flex w-[340px] flex-none flex-col gap-2.5 border-l border-hairline bg-white p-6">
      <div className="text-sm font-semibold tracking-widest text-steel">ORDER</div>

      {cart.lines.map((line) => {
        const lt = totals.lines.find((l) => l.lineId === line.id);
        return (
          <div key={line.id} className="flex text-sm text-ink">
            <div className="flex-1">{lineSummaryLabel(line)}</div>
            <div className="font-mono">{formatC(lt?.netC ?? 0)}</div>
          </div>
        );
      })}

      <div className="mt-2 flex flex-col gap-1.5 border-t border-hairline pt-3">
        {discountsC > 0 && (
          <div className="flex text-[13px] text-steel">
            <div className="flex-1">Discounts</div>
            <div className="font-mono">−{formatC(discountsC)}</div>
          </div>
        )}
        {totals.serviceChargeC > 0 && (
          <div className="flex text-[13px] text-steel">
            <div className="flex-1">Service charge</div>
            <div className="font-mono">{formatC(totals.serviceChargeC)}</div>
          </div>
        )}
        <div className="flex text-base font-semibold text-ink">
          <div className="flex-1">Total</div>
          <div className="font-mono">{formatPeso(totals.totalC)}</div>
        </div>
      </div>
    </aside>
  );
}
