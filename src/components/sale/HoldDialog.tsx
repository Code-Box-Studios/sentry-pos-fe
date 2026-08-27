"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/state/cart";
import { useShiftStore } from "@/state/shift";

/** Parks the current sale under a label; holds live inside the shift that made them. */
export function HoldDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const heldCount = useCartStore((s) => s.heldCarts.length);
  const hold = useCartStore((s) => s.hold);
  const shift = useShiftStore((s) => s.shift);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (open) setLabel(`Hold ${heldCount + 1}`);
  }, [open, heldCount]);

  const valid = label.trim() !== "" && shift !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-5 rounded-xl sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">Hold this sale</DialogTitle>
          <p className="text-sm text-steel">
            Resume it any time during this shift. Held sales must be completed or discarded before close.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="hold-label" className="text-[13px] font-semibold text-ink">Label</Label>
          <Input id="hold-label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!valid}
            onClick={() => {
              if (!shift || !valid) return;
              hold(label.trim(), shift.id);
              onClose();
            }}
          >
            Hold
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
