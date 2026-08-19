"use client";

import { MoneyPad } from "@/components/numpad/MoneyPad";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatC, formatPeso, pesos } from "@/lib/money";

const DENOMINATIONS = [100, 200, 500, 1000];

export function CashPanel({
  totalC,
  tenderedC,
  onTenderedChange,
  onComplete,
  busy,
}: {
  totalC: number;
  tenderedC: number | null;
  onTenderedChange(c: number | null): void;
  onComplete(): void;
  busy: boolean;
}) {
  const tendered = tenderedC ?? 0;
  const changeC = tendered - totalC;
  const short = changeC < 0;

  return (
    <Card className="w-[520px] max-w-full gap-[18px] rounded-xl p-7">
      <MoneyPad label="Cash tendered" valueC={tenderedC} onChange={onTenderedChange} />

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => onTenderedChange(totalC)}>
          Exact
        </Button>
        {DENOMINATIONS.map((d) => (
          <Button
            key={d}
            variant="secondary"
            className="flex-1"
            // Counter reality: notes go into the drawer one on top of the other.
            onClick={() => onTenderedChange(tendered + pesos(d))}
          >
            ₱{d}
          </Button>
        ))}
      </div>

      <div
        className={`flex items-baseline rounded-lg px-[18px] py-3.5 ${short ? "bg-warn-bg" : "bg-green-soft"}`}
        aria-live="polite"
      >
        <div className={`flex-1 text-[15px] font-semibold ${short ? "text-warn-text" : "text-green-dark"}`}>
          {short ? "Short" : "Change"}
        </div>
        <div className={`font-mono text-[28px] font-bold ${short ? "text-warn-text" : "text-green-dark"}`}>
          ₱{formatC(Math.abs(changeC))}
        </div>
      </div>

      <Button size="lg" className="h-[52px] w-full" disabled={busy || short} onClick={onComplete}>
        Complete sale
      </Button>
      <p className="sr-only">Total due {formatPeso(totalC)}</p>
    </Card>
  );
}
