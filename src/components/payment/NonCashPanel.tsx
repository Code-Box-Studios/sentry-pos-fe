"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/money";

/** Non-cash methods are recorded types only — no processing, just a reference for reconciliation. */
export function NonCashPanel({
  totalC,
  referenceNo,
  onReferenceChange,
  onComplete,
  busy,
}: {
  totalC: number;
  referenceNo: string;
  onReferenceChange(v: string): void;
  onComplete(): void;
  busy: boolean;
}) {
  return (
    <Card className="w-[520px] max-w-full gap-[18px] rounded-xl p-7">
      <div className="flex items-baseline">
        <div className="flex-1 text-[15px] font-semibold text-ink">Amount</div>
        <div className="font-mono text-[28px] font-bold text-ink">{formatPeso(totalC)}</div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reference-no" className="text-[13px] font-semibold text-ink">
          Reference number (optional)
        </Label>
        <Input
          id="reference-no"
          value={referenceNo}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder="1029-3847"
        />
        <p className="text-xs text-stone">Prints on the receipt and shows in reports and CSV exports.</p>
      </div>

      <Button size="lg" className="h-[52px] w-full" disabled={busy} onClick={onComplete}>
        Complete sale
      </Button>
    </Card>
  );
}
