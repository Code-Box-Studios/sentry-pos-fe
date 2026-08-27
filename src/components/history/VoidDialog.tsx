"use client";

import { useEffect, useState } from "react";
import { getApi } from "@/api";
import { ApiError } from "@/api/errors";
import type { CompletedSale } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/money";
import { useCatalogStore } from "@/state/catalog";

/** Ungated by design — a void is the mistake control while the sale's shift is still open. */
export function VoidDialog({
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
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (reason.trim() === "" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await getApi().voidSale(sale.id, reason.trim());
      onDone(updated);
      await refreshStock(); // returned stock un-blocks OUT tiles
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not void this sale");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-5 rounded-xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">Void {sale.receiptNo}</DialogTitle>
          <p className="text-sm text-steel">
            {formatPeso(sale.totals.totalC)} · stock returns automatically. The sale stays in history and
            on the Z report.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="void-reason" className="text-[13px] font-semibold text-ink">Reason</Label>
          <Input
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="double tap"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={busy || reason.trim() === ""}
            onClick={submit}
          >
            Void sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
