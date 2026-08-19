"use client";

import { useEffect, useState } from "react";
import { Numpad, type NumpadKey } from "@/components/numpad/Numpad";
import { MoneyPad } from "@/components/numpad/MoneyPad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { lineUnitWithModsC, type Cart, type DiscountSpec } from "@/domain/cart";
import { computeTotals } from "@/domain/totals";
import type { NamedDiscount } from "@/domain/types";
import { formatPeso, pct } from "@/lib/money";
import { mulQtyPriceC } from "@/lib/qty";
import { useCatalogStore } from "@/state/catalog";
import { useCartStore } from "@/state/cart";

export type DiscountTarget = { kind: "line"; lineId: string } | { kind: "order" };

/** What the discount would bite into right now, so the picker can preview real pesos. */
function baseFor(cart: Cart, target: DiscountTarget, settings: { taxRate: number; serviceChargeRate: number }): number {
  if (target.kind === "line") {
    const line = cart.lines.find((l) => l.id === target.lineId);
    return line ? mulQtyPriceC(line.qty, lineUnitWithModsC(line)) : 0;
  }
  // Order discounts skip SC/PWD lines, and must not count themselves.
  const totals = computeTotals({ ...cart, orderDiscount: null }, settings);
  return totals.lines.reduce((sum, l) => (l.applied === "scpwd" ? sum : sum + l.netC), 0);
}

function amountOf(d: Pick<DiscountSpec, "kind" | "value">, baseC: number): number {
  return Math.min(d.kind === "percent" ? pct(baseC, d.value) : d.value, baseC);
}

export function DiscountPicker({
  target,
  open,
  onClose,
}: {
  target: DiscountTarget;
  open: boolean;
  onClose(): void;
}) {
  const business = useCatalogStore((s) => s.catalog?.business ?? null);
  const named = useCatalogStore((s) => s.catalog?.discounts ?? []);
  const cart = useCartStore((s) => s.cart);
  const setLineDiscount = useCartStore((s) => s.setLineDiscount);
  const setOrderDiscount = useCartStore((s) => s.setOrderDiscount);

  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [percentRaw, setPercentRaw] = useState("");
  const [amountC, setAmountC] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setMode("percent");
      setPercentRaw("");
      setAmountC(null);
    }
  }, [open]);

  const settings = {
    taxRate: business?.taxRate ?? 0,
    serviceChargeRate: business?.serviceChargeRate ?? 0,
  };
  const baseC = baseFor(cart, target, settings);
  const current =
    target.kind === "line" ? cart.lines.find((l) => l.id === target.lineId)?.discount ?? null : cart.orderDiscount;

  const scope = target.kind === "line" ? "line" : "order";
  const options: NamedDiscount[] = named.filter((d) => d.active && (d.appliesTo === scope || d.appliesTo === "both"));

  function apply(d: DiscountSpec | null) {
    if (target.kind === "line") setLineDiscount(target.lineId, d);
    else setOrderDiscount(d);
    onClose();
  }

  function pressPercent(key: NumpadKey) {
    setPercentRaw((prev) => {
      if (key === "back") return prev.slice(0, -1);
      if (key === ".") return prev;
      const next = prev === "0" ? key : prev + key;
      return Number(next) > 100 ? prev : next; // a discount over 100% is not a discount
    });
  }

  const percentValue = percentRaw === "" ? null : Number(percentRaw);
  const freeSpec: DiscountSpec | null =
    mode === "percent"
      ? percentValue !== null && percentValue > 0
        ? { source: "free", kind: "percent", value: percentValue }
        : null
      : amountC !== null && amountC > 0
        ? { source: "free", kind: "fixed", value: amountC }
        : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-xl sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">
            {target.kind === "line" ? "Line discount" : "Order discount"}
          </DialogTitle>
          <p className="text-sm text-steel">
            Applies against {formatPeso(baseC)}. Discounts never take a total below zero.
          </p>
        </DialogHeader>

        {options.length > 0 && (
          <div className="flex flex-col gap-2">
            {options.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => apply({ source: "named", discountId: d.id, name: d.name, kind: d.kind, value: d.value })}
                className="flex items-center rounded-lg border border-hairline px-4 py-3 text-left active:bg-hairline-soft"
              >
                <span className="flex-1 text-[15px] font-medium text-ink">{d.name}</span>
                <span className="font-mono text-sm text-green-dark">−{formatPeso(amountOf(d, baseC))}</span>
              </button>
            ))}
          </div>
        )}

        {current && (
          <Button variant="outline-destructive" onClick={() => apply(null)}>
            Remove discount
          </Button>
        )}

        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <div className="text-[13px] font-semibold text-steel">FREE ENTRY</div>
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "percent" ? "dark" : "secondary"} onClick={() => setMode("percent")}>
              Percent
            </Button>
            <Button size="sm" variant={mode === "amount" ? "dark" : "secondary"} onClick={() => setMode("amount")}>
              Amount
            </Button>
          </div>

          {mode === "percent" ? (
            <div className="flex flex-col gap-3">
              <output
                aria-label="Percent"
                className="flex h-14 items-center rounded-[8px] border-2 border-green-dark px-4 font-mono text-2xl font-semibold text-ink"
              >
                {percentRaw === "" ? "0" : percentRaw}%
              </output>
              <Numpad onKey={pressPercent} decimals={false} />
            </div>
          ) : (
            <MoneyPad valueC={amountC} onChange={setAmountC} label="Amount" />
          )}

          <Button disabled={freeSpec === null} onClick={() => freeSpec && apply(freeSpec)}>
            Apply {freeSpec ? `− ${formatPeso(amountOf(freeSpec, baseC))}` : "discount"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
