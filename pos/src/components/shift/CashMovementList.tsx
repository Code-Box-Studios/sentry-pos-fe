"use client";

import type { CashMovement } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatC } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";

export function CashMovementList({
  movements,
  onCashIn,
  onCashOut,
}: {
  movements: CashMovement[];
  onCashIn(): void;
  onCashOut(): void;
}) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center">
        <div className="flex-1 text-[15px] font-semibold text-ink">Cash movements</div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onCashIn}>
            + Cash in
          </Button>
          <Button size="sm" variant="secondary" onClick={onCashOut}>
            − Cash out
          </Button>
        </div>
      </div>

      {movements.length === 0 ? (
        <p className="text-sm text-stone">Nothing in or out of the drawer yet.</p>
      ) : (
        movements.map((m) => (
          <div key={m.id} className="flex gap-3 text-sm">
            <div className="w-[60px] text-steel">{formatManilaTime(m.at)}</div>
            <div className="flex-1 text-ink">
              {m.type === "in" ? "Cash in" : "Cash out"} — {m.reason}
            </div>
            <div className={`font-mono ${m.type === "in" ? "text-green-dark" : "text-danger"}`}>
              {m.type === "in" ? "+" : "−"}
              {formatC(m.amountC)}
            </div>
          </div>
        ))
      )}
    </Card>
  );
}
