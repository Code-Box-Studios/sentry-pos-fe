"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrderType } from "@/domain/types";
import { useCatalogStore } from "@/state/catalog";
import { useCartStore } from "@/state/cart";
import { CartLineRow } from "./CartLineRow";
import { TotalsFooter } from "./TotalsFooter";

const ORDER_TYPES: Array<{ value: OrderType; label: string }> = [
  { value: "dine_in", label: "Dine-in" },
  { value: "takeout", label: "Takeout" },
  { value: "none", label: "None" },
];

export function CartPane({
  onCharge,
  onDiscount,
  onLineDiscount,
  onScPwd,
  onHold,
  onHeldList,
  onEditWeight,
}: {
  onCharge(): void;
  onDiscount(): void;
  onLineDiscount(lineId: string): void;
  onScPwd(): void;
  onHold(): void;
  onHeldList(): void;
  onEditWeight(lineId: string): void;
}) {
  const business = useCatalogStore((s) => s.catalog?.business ?? null);
  const cart = useCartStore((s) => s.cart);
  const heldCarts = useCartStore((s) => s.heldCarts);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const toggleScPwdLine = useCartStore((s) => s.toggleScPwdLine);
  const clear = useCartStore((s) => s.clear);
  const [confirmClear, setConfirmClear] = useState(false);

  const totals = useCartStore((s) => s.totals)({
    taxRate: business?.taxRate ?? 0,
    serviceChargeRate: business?.serviceChargeRate ?? 0,
  });

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <div className="flex-1 text-base font-semibold text-ink">Current sale</div>
        {cart.lines.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            Clear
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onHold} disabled={cart.lines.length === 0}>
          Hold
        </Button>
        <Button variant="secondary" size="sm" onClick={onHeldList} disabled={heldCarts.length === 0}>
          Held · {heldCarts.length}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-hairline px-5 py-3">
        {ORDER_TYPES.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={cart.orderType === t.value ? "dark" : "secondary"}
            className={cart.orderType === t.value ? "" : "border-hairline"}
            onClick={() => setOrderType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {cart.lines.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone">No items yet — tap a product to start.</p>
        ) : (
          cart.lines.map((line) => (
            <CartLineRow
              key={line.id}
              line={line}
              totals={totals.lines.find((l) => l.lineId === line.id)}
              scPwdActive={cart.scPwd !== null}
              onSetQty={(qty) => setQty(line.id, qty)}
              onRemove={() => removeLine(line.id)}
              onEditWeight={() => onEditWeight(line.id)}
              onDiscount={() => onLineDiscount(line.id)}
              onToggleScPwd={() => toggleScPwdLine(line.id)}
            />
          ))
        )}
      </div>

      <TotalsFooter
        cart={cart}
        totals={totals}
        serviceChargeRate={business?.serviceChargeRate ?? 0}
        onDiscount={onDiscount}
        onScPwd={onScPwd}
        onCharge={onCharge}
      />

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="gap-5 rounded-xl sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-ink">Clear this sale?</DialogTitle>
            <p className="text-sm text-steel">Every line is removed. Held sales are not affected.</p>
          </DialogHeader>
          <div className="flex gap-2.5">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                clear();
                setConfirmClear(false);
              }}
            >
              Clear sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
