"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeTotals } from "@/domain/totals";
import { formatPeso } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";
import { useCatalogStore } from "@/state/catalog";
import { useCartStore } from "@/state/cart";

type Pending = { id: string; action: "resume" | "discard" } | null;

export function HeldCartsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const business = useCatalogStore((s) => s.catalog?.business ?? null);
  const heldCarts = useCartStore((s) => s.heldCarts);
  const currentLines = useCartStore((s) => s.cart.lines.length);
  const resume = useCartStore((s) => s.resume);
  const discardHeld = useCartStore((s) => s.discardHeld);
  const [pending, setPending] = useState<Pending>(null);

  const settings = {
    taxRate: business?.taxRate ?? 0,
    serviceChargeRate: business?.serviceChargeRate ?? 0,
  };

  function tryResume(id: string) {
    // Resuming replaces whatever is on the screen, so a non-empty cart gets a confirm first.
    if (currentLines > 0) setPending({ id, action: "resume" });
    else {
      resume(id);
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && (setPending(null), onClose())}>
      <SheetContent side="right" className="w-[420px] max-w-full gap-0 bg-white p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b border-hairline px-5 py-4">
          <SheetTitle className="text-base font-semibold text-ink">Held sales</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {heldCarts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-stone">Nothing on hold.</p>
          ) : (
            heldCarts.map((held) => {
              const totals = computeTotals(held.cart, settings);
              const isPending = pending?.id === held.id;
              return (
                <div key={held.id} className="flex flex-col gap-2 border-b border-hairline-soft px-5 py-4">
                  <div className="flex items-baseline gap-2">
                    <div className="flex-1 text-[15px] font-semibold text-ink">{held.label}</div>
                    <div className="font-mono text-[15px] font-semibold text-ink">{formatPeso(totals.totalC)}</div>
                  </div>
                  <div className="text-[13px] text-steel">
                    {held.cart.lines.length} {held.cart.lines.length === 1 ? "line" : "lines"} ·{" "}
                    {formatManilaTime(held.heldAt)}
                  </div>

                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-[13px] font-semibold text-warn-text">
                        {pending.action === "resume" ? "Replace the current sale?" : "Discard this hold?"}
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => setPending(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant={pending.action === "resume" ? "default" : "destructive"}
                        onClick={() => {
                          if (pending.action === "resume") {
                            resume(held.id);
                            onClose();
                          } else {
                            discardHeld(held.id);
                          }
                          setPending(null);
                        }}
                      >
                        {pending.action === "resume" ? "Replace" : "Discard"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => tryResume(held.id)}>
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-destructive"
                        onClick={() => setPending({ id: held.id, action: "discard" })}
                      >
                        Discard
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
