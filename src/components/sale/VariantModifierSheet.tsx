"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CartModifier } from "@/domain/cart";
import type { Modifier, ModifierGroup, Product } from "@/domain/types";
import { formatPeso } from "@/lib/money";
import { mulQtyPriceC } from "@/lib/qty";
import { cn } from "@/lib/utils";
import { useCatalogStore } from "@/state/catalog";
import { useCartStore } from "@/state/cart";

function groupLabel(group: ModifierGroup): string {
  const rule = group.minSelect > 0 ? `CHOOSE ${group.minSelect}` : `CHOOSE UP TO ${group.maxSelect}`;
  return `${group.name.toUpperCase()} — ${rule}`;
}

function deltaLabel(m: Modifier): string {
  return m.priceDeltaC === 0 ? "+₱0.00" : `+${formatPeso(m.priceDeltaC)}`;
}

/** Enforces min/max select before anything reaches the cart (pos-spec §4). */
export function VariantModifierSheet({ product, onClose }: { product: Product | null; onClose(): void }) {
  const allGroups = useCatalogStore((s) => s.catalog?.modifierGroups ?? []);
  const addProduct = useCartStore((s) => s.addProduct);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    // No preselection: the operator must pick the size the customer asked for.
    setVariantId(null);
    setSelected({});
    setQty(1);
  }, [product]);

  if (!product) return null;

  const groups = product.modifierGroupIds
    .map((id) => allGroups.find((g) => g.id === id))
    .filter((g): g is ModifierGroup => g !== undefined);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const baseC = variant ? variant.priceC : product.priceC;

  const chosen: CartModifier[] = groups.flatMap((g) =>
    (selected[g.id] ?? []).flatMap((modifierId) => {
      const m = g.modifiers.find((x) => x.id === modifierId);
      return m ? [{ groupId: g.id, modifierId: m.id, name: m.name, priceDeltaC: m.priceDeltaC }] : [];
    })
  );

  const unitC = chosen.reduce((sum, m) => sum + m.priceDeltaC, baseC);
  const lineTotalC = mulQtyPriceC(qty, unitC);

  const needsVariant = product.variants.length > 0 && variantId === null;
  const unmetGroup = groups.some((g) => (selected[g.id] ?? []).length < g.minSelect);
  const canAdd = !needsVariant && !unmetGroup;

  function toggle(group: ModifierGroup, modifierId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(modifierId)) return { ...prev, [group.id]: current.filter((id) => id !== modifierId) };
      if (group.maxSelect === 1) return { ...prev, [group.id]: [modifierId] };
      if (current.length >= group.maxSelect) return prev; // over-max taps are ignored
      return { ...prev, [group.id]: [...current, modifierId] };
    });
  }

  function confirm() {
    if (!product || !canAdd) return;
    addProduct(product, { variantId: variantId ?? undefined, modifiers: chosen, qty });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-xl p-0 sm:max-w-[560px]">
        <DialogHeader className="flex-row items-baseline gap-3 px-7 pt-6 pb-4">
          <DialogTitle className="flex-1 text-[22px] font-semibold text-ink">{product.name}</DialogTitle>
          {product.sku && <span className="text-sm text-stone">SKU {product.sku}</span>}
        </DialogHeader>

        {product.variants.length > 0 && (
          <section className="flex flex-col gap-2.5 px-7 pb-5">
            <div className="text-[13px] font-semibold text-steel">SIZE — CHOOSE 1</div>
            <div className="flex gap-2">
              {product.variants.map((v) => {
                const on = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "flex flex-1 flex-col gap-0.5 rounded-lg p-3.5 text-left",
                      on ? "border-2 border-brand-green bg-green-soft" : "border border-hairline"
                    )}
                  >
                    <span className="text-[15px] font-semibold text-ink">{v.name}</span>
                    <span className={cn("text-[13px]", on ? "font-semibold text-green-dark" : "text-steel")}>
                      {formatPeso(v.priceC)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {groups.map((g) => (
          <section key={g.id} className="flex flex-col gap-2.5 px-7 pb-5">
            <div className="text-[13px] font-semibold text-steel">{groupLabel(g)}</div>
            <div className={cn(g.maxSelect === 1 ? "flex flex-col gap-2" : "flex flex-wrap gap-2")}>
              {g.modifiers.map((m) => {
                const on = (selected[g.id] ?? []).includes(m.id);
                return g.maxSelect === 1 ? (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(g, m.id)}
                    className={cn(
                      "flex rounded-lg px-4 py-3",
                      on ? "border-2 border-brand-green bg-green-soft" : "border border-hairline"
                    )}
                  >
                    <span className={cn("flex-1 text-left text-[15px]", on ? "font-semibold" : "font-medium")}>
                      {m.name}
                    </span>
                    <span className={cn("text-sm", on ? "font-semibold text-green-dark" : "text-steel")}>
                      {deltaLabel(m)}
                    </span>
                  </button>
                ) : (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(g, m.id)}
                    className={cn(
                      "rounded-full px-4 py-2.5 text-sm font-medium",
                      on ? "border-2 border-brand-green bg-green-soft text-green-dark" : "border border-hairline text-ink"
                    )}
                  >
                    {m.name} {deltaLabel(m)}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex items-center gap-3 border-t border-hairline px-7 py-5">
          <div className="flex items-center rounded-full border border-hairline-strong">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex size-10 items-center justify-center text-lg text-slate"
            >
              −
            </button>
            <span className="w-8 text-center text-base font-semibold text-ink">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => q + 1)}
              className="flex size-10 items-center justify-center text-lg text-slate"
            >
              +
            </button>
          </div>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canAdd} onClick={confirm}>
            Add — {formatPeso(lineTotalC)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
