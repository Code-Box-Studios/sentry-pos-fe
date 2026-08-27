"use client";

import type { ShiftTotals } from "@/api/types";
import { Card } from "@/components/ui/card";
import { formatC, formatPeso } from "@/lib/money";

function Kpi({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <Card className="gap-1 p-[18px]">
      <div className="text-xs font-semibold tracking-widest text-steel">{label}</div>
      <div className="font-mono text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-stone">{meta}</div>
    </Card>
  );
}

/** The de facto X reading, available at any time (pos-spec §8). */
export function ShiftTotalsCards({ totals }: { totals: ShiftTotals }) {
  const nonCash = [
    ["card", totals.byMethod.card],
    ["gcash", totals.byMethod.gcash],
    ["maya", totals.byMethod.maya],
    ["other", totals.byMethod.other],
  ] as const;
  const nonCashMeta =
    nonCash
      .filter(([, amount]) => amount > 0)
      .map(([name, amount]) => `${name} ${formatC(amount)}`)
      .join(" · ") || "cash only";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Kpi
        label="GROSS SALES"
        value={formatPeso(totals.grossC)}
        meta={`${totals.saleCount} ${totals.saleCount === 1 ? "sale" : "sales"}`}
      />
      <Kpi label="CASH SALES" value={formatPeso(totals.cashSalesC)} meta={nonCashMeta} />
      <Kpi
        label="VOIDS / REFUNDS"
        value={`${totals.voidCount} / ${totals.refundCount}`}
        meta={`−${formatPeso(totals.voidAmountC + totals.refundAmountC)} total`}
      />
    </div>
  );
}
