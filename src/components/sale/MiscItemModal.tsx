"use client";

import { useEffect, useState } from "react";
import { MoneyPad } from "@/components/numpad/MoneyPad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/state/cart";

/** Open-price line with no product and no stock movement (pos-spec §4). */
export function MiscItemModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const addMisc = useCartStore((s) => s.addMisc);
  const [name, setName] = useState("");
  const [amountC, setAmountC] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setAmountC(null);
    }
  }, [open]);

  const valid = name.trim() !== "" && amountC !== null && amountC > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-5 rounded-xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">Misc item</DialogTitle>
          <p className="text-sm text-steel">
            An off-catalog line. It is reported as its own group so overuse stays visible.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="misc-name" className="text-[13px] font-semibold text-ink">Name</Label>
          <Input id="misc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tinapa" />
        </div>

        <MoneyPad label="Amount" valueC={amountC} onChange={setAmountC} />

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              addMisc(name.trim(), amountC);
              onClose();
            }}
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
