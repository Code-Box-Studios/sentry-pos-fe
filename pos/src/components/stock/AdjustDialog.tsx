"use client";

import { useEffect, useState } from "react";
import { getApi } from "@/api";
import { ApiError } from "@/api/errors";
import { Numpad, type NumpadKey } from "@/components/numpad/Numpad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AdjustReason, Product } from "@/domain/types";
import { formatQty } from "@/lib/qty";
import { useCatalogStore } from "@/state/catalog";

const REASONS: Array<{ value: AdjustReason; label: string }> = [
  { value: "damage", label: "Damage" },
  { value: "expiry", label: "Expiry" },
  { value: "theft_loss", label: "Theft / loss" },
  { value: "count_correction", label: "Count correction" },
  { value: "other", label: "Other" },
];

function parseQty(raw: string, decimals: boolean): number | null {
  const pattern = decimals ? /^\d+(\.\d{1,3})?$/ : /^\d+$/;
  if (!pattern.test(raw)) return null;
  const q = Number(raw);
  return Number.isFinite(q) && q >= 0 ? q : null;
}

/** The sanctioned zero-stock escape hatch — audit-logged with who and why (pos-spec §9). */
export function AdjustDialog({
  product,
  variantId,
  label,
  currentQty,
  open,
  onClose,
}: {
  product: Product;
  variantId: string | null;
  label: string;
  currentQty: number;
  open: boolean;
  onClose(): void;
}) {
  const refreshStock = useCatalogStore((s) => s.refreshStock);
  const decimals = product.soldBy === "weight";
  const [raw, setRaw] = useState("");
  const [reason, setReason] = useState<AdjustReason | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setRaw("");
      setReason(null);
      setNote("");
      setError(null);
    }
  }, [open]);

  const newQty = parseQty(raw, decimals);
  const delta = newQty === null ? null : newQty - currentQty;

  function press(key: NumpadKey) {
    setRaw((prev) => {
      if (key === "back") return prev.slice(0, -1);
      if (key === ".") {
        if (!decimals || prev.includes(".")) return prev;
        return prev === "" ? "0." : `${prev}.`;
      }
      const [, decs] = prev.split(".");
      if (decs !== undefined && decs.length >= 3) return prev;
      return prev === "0" ? key : prev + key;
    });
  }

  async function submit() {
    if (newQty === null || reason === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      await getApi().adjustStock({
        productId: product.id,
        variantId,
        newQty,
        reasonCategory: reason,
        note: note.trim() === "" ? null : note.trim(),
      });
      await refreshStock();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not post the adjustment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-xl sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">Adjust stock — {label}</DialogTitle>
          <p className="text-sm text-steel">
            System says {formatQty(currentQty, product.soldBy)}. Posted as an adjustment event with who
            and why — this is audit-logged.
          </p>
        </DialogHeader>

        <div className="flex items-end gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="text-[13px] font-semibold text-ink">New quantity</div>
            <output
              aria-label="New quantity"
              className="flex h-12 items-center rounded-[8px] border-2 border-green-dark px-3.5 font-mono text-xl font-semibold text-ink"
            >
              {raw === "" ? "0" : raw}
            </output>
          </div>
          <div className="pb-3 text-sm text-steel">
            {delta === null ? "Δ —" : `Δ ${delta >= 0 ? "+" : "−"}${formatQty(Math.abs(delta), product.soldBy)}`}
          </div>
        </div>

        <Numpad onKey={press} decimals={decimals} />

        <div className="flex flex-col gap-2">
          <div className="text-[13px] font-semibold text-ink">Reason</div>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={reason === r.value ? "dark" : "secondary"}
                className={reason === r.value ? "" : "border-hairline"}
                onClick={() => setReason(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        <Input
          aria-label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Note (optional) — "found 2 in the back chiller"`}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={busy || newQty === null || reason === null} onClick={submit}>
            Post adjustment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
