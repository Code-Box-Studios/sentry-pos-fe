"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/api/errors";
import { MoneyPad } from "@/components/numpad/MoneyPad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShiftStore } from "@/state/shift";

export function CashMoveDialog({
  type,
  open,
  onClose,
}: {
  type: "in" | "out";
  open: boolean;
  onClose(): void;
}) {
  const addCashMovement = useShiftStore((s) => s.addCashMovement);
  const [amountC, setAmountC] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountC(null);
      setReason("");
      setError(null);
    }
  }, [open]);

  const valid = amountC !== null && amountC > 0 && reason.trim() !== "";

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addCashMovement(type, amountC, reason.trim());
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not record the movement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">
            {type === "in" ? "Cash in" : "Cash out"}
          </DialogTitle>
          <p className="text-sm text-steel">
            {type === "in"
              ? "Money added to the drawer — a change fund, for example."
              : "Money taken from the drawer — a supplier paid in cash, for example."}
          </p>
        </DialogHeader>

        <MoneyPad label="Amount" valueC={amountC} onChange={setAmountC} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="cash-move-reason" className="text-[13px] font-semibold text-ink">Reason</Label>
          <Input
            id="cash-move-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={type === "in" ? "change fund from safe" : "LPG delivery paid from drawer"}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!valid || busy} onClick={submit}>
            Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
