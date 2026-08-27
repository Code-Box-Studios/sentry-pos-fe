"use client";

import { useEffect, useState } from "react";
import { getApi } from "@/api";
import { ApiError, PinInvalidError, PinLockedError } from "@/api/errors";
import type { CompletedSale } from "@/api/types";
import { PinEntry } from "@/components/numpad/PinEntry";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/money";
import { useCatalogStore } from "@/state/catalog";
import { useShiftStore } from "@/state/shift";

const PIN_LENGTH = 6;

/** Refunds are allowed any time, but always behind the owner's PIN (pos-spec §7). */
export function RefundDialog({
  sale,
  open,
  onClose,
  onDone,
}: {
  sale: CompletedSale;
  open: boolean;
  onClose(): void;
  onDone(updated: CompletedSale): void;
}) {
  const refreshStock = useCatalogStore((s) => s.refreshStock);
  const shift = useShiftStore((s) => s.shift);
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setPin("");
      setError(null);
      setLocked(false);
    }
  }, [open]);

  const inShift = shift !== null && shift.id === sale.shiftId;

  async function submit() {
    if (reason.trim() === "" || pin.length !== PIN_LENGTH || busy || locked) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await getApi().refundSale(sale.id, reason.trim(), pin);
      onDone(updated);
      await refreshStock(); // returned stock un-blocks OUT tiles
      onClose();
    } catch (e) {
      setPin("");
      if (e instanceof PinLockedError) {
        setLocked(true);
        setError(`Locked — try again in ${Math.max(1, Math.ceil(e.retryAfterSeconds / 60))} min`);
      } else if (e instanceof PinInvalidError) {
        setError(`Wrong PIN — ${e.attemptsRemaining} attempts left`);
      } else {
        setError(e instanceof ApiError ? e.message : "Could not refund this sale");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">Refund {sale.receiptNo}</DialogTitle>
          <p className="text-sm text-steel">
            Full amount {formatPeso(sale.totals.totalC)} · stock returns automatically.{" "}
            {inShift ? "This shift's expected cash is reduced." : "Recorded outside the current shift."}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="refund-reason" className="text-[13px] font-semibold text-ink">Reason</Label>
          <Input
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Customer returned order"
          />
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <div className="text-[13px] font-semibold text-steel">ENTER OWNER PIN</div>
          <PinEntry value={pin} onChange={setPin} length={PIN_LENGTH} disabled={locked} />
          {error ? (
            <p className="text-sm font-semibold text-danger">{error}</p>
          ) : (
            <p className="text-xs text-stone">Failed attempts are logged and throttled.</p>
          )}
        </div>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={busy || locked || reason.trim() === "" || pin.length !== PIN_LENGTH}
            onClick={submit}
          >
            Refund {formatPeso(sale.totals.totalC)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
