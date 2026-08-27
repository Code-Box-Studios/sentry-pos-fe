"use client";

import { useEffect, useState } from "react";
import { Numpad, type NumpadKey } from "@/components/numpad/Numpad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Product } from "@/domain/types";
import { formatPeso } from "@/lib/money";
import { mulQtyPriceC } from "@/lib/qty";

const MAX_DECIMALS = 3;

function parseQty(raw: string): number | null {
  if (!/^\d*(\.\d{1,3})?$/.test(raw) || raw === "" || raw === ".") return null;
  const q = Number(raw);
  return Number.isFinite(q) && q > 0 ? q : null;
}

/** The store's own scale supplies the number; the terminal just captures it (pos-spec §4). */
export function WeightModal({
  product,
  initialQty,
  onConfirm,
  onClose,
}: {
  product: Product | null;
  initialQty?: number;
  onConfirm(qty: number): void;
  onClose(): void;
}) {
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (product) setRaw(initialQty ? String(initialQty) : "");
  }, [product, initialQty]);

  if (!product) return null;

  const qty = parseQty(raw);
  const lineTotalC = qty === null ? 0 : mulQtyPriceC(qty, product.priceC);

  function press(key: NumpadKey) {
    setRaw((prev) => {
      if (key === "back") return prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : prev === "" ? "0." : `${prev}.`;
      const [, decimals] = prev.split(".");
      if (decimals !== undefined && decimals.length >= MAX_DECIMALS) return prev;
      return prev === "0" ? key : prev + key;
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-5 rounded-xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">{product.name}</DialogTitle>
          <p className="text-sm text-steel">{formatPeso(product.priceC)} / kg</p>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="text-[13px] font-semibold text-ink">Weight (kg)</div>
          <output
            aria-label="Weight"
            className="flex h-14 items-center rounded-[8px] border-2 border-green-dark px-4 font-mono text-2xl font-semibold text-ink"
          >
            {raw === "" ? "0" : raw}
          </output>
          <Numpad onKey={press} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 text-sm text-steel">Line total</div>
          <div className="font-mono text-lg font-semibold text-ink">{formatPeso(lineTotalC)}</div>
        </div>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={qty === null} onClick={() => qty !== null && onConfirm(qty)}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
