"use client";

import { useState } from "react";
import type { ShiftTotals } from "@/api/types";
import { MoneyPad } from "@/components/numpad/MoneyPad";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatC, formatPeso } from "@/lib/money";

/** Mirrors the Z arithmetic so the operator can see where "expected" came from. */
function expectedBreakdown(totals: ShiftTotals, openingCashC: number): string {
  const parts = [formatC(openingCashC), `+ ${formatC(totals.cashSalesC)}`];
  if (totals.cashRefundsC > 0) parts.push(`− ${formatC(totals.cashRefundsC)}`);
  if (totals.cashInC > 0) parts.push(`+ ${formatC(totals.cashInC)}`);
  if (totals.cashOutC > 0) parts.push(`− ${formatC(totals.cashOutC)}`);
  return `Expected: ${parts.join(" ")}`;
}

export function ClosePanel({
  totals,
  openingCashC,
  heldCount,
  countedCashC,
  onCountedChange,
  onClose,
  busy,
}: {
  totals: ShiftTotals;
  openingCashC: number;
  heldCount: number;
  countedCashC: number | null;
  onCountedChange(c: number | null): void;
  onClose(): void;
  busy: boolean;
}) {
  const [padOpen, setPadOpen] = useState(false);
  const blockedByHolds = heldCount > 0;
  const overShortC = (countedCashC ?? 0) - totals.expectedCashC;
  const counted = countedCashC !== null;

  return (
    <Card className="gap-3 p-5">
      <div className="text-[15px] font-semibold text-ink">Close shift</div>

      {blockedByHolds && (
        <div className="rounded-[8px] bg-warn-bg px-3 py-2 text-[13px] font-semibold text-warn-text">
          {heldCount} held {heldCount === 1 ? "cart" : "carts"} must be completed or discarded before closing.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="text-[13px] font-semibold text-ink">Counted cash</div>
          <button
            type="button"
            aria-label="Counted cash"
            onClick={() => setPadOpen(true)}
            className="flex h-12 items-center rounded-[8px] border-2 border-green-dark px-3.5 font-mono text-xl font-semibold text-ink"
          >
            {formatPeso(countedCashC ?? 0)}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-0.5">
          <div className="text-[13px] text-steel">{expectedBreakdown(totals, openingCashC)}</div>
          <div className="font-mono text-lg font-semibold text-ink">{formatPeso(totals.expectedCashC)}</div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <div className="text-[13px] text-steel">Over / short</div>
          <div
            className={`rounded-full px-3 py-1 font-mono text-base font-bold ${
              overShortC < 0 ? "bg-danger-bg text-danger" : "bg-green-soft text-green-dark"
            }`}
          >
            {overShortC >= 0 ? "+" : "−"}
            {formatC(Math.abs(overShortC))}
          </div>
        </div>

        <Button className="h-12 px-6" disabled={busy || blockedByHolds || !counted} onClick={onClose}>
          Close &amp; print Z
        </Button>
      </div>

      <Dialog open={padOpen} onOpenChange={setPadOpen}>
        <DialogContent className="gap-5 rounded-xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-ink">Count the drawer</DialogTitle>
            <p className="text-sm text-steel">Over/short is shown, never blocked — centavo noise is expected.</p>
          </DialogHeader>
          <MoneyPad label="Counted cash" valueC={countedCashC} onChange={onCountedChange} />
          <Button onClick={() => setPadOpen(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
