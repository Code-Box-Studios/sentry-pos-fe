import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emptyCart, type Cart, type CartLine, type CartModifier, type DiscountSpec, type ScPwdInfo } from "@/domain/cart";
import { computeTotals, type CartTotals } from "@/domain/totals";
import type { OrderType, Product } from "@/domain/types";
import { nowIso } from "@/lib/time";
import { newId } from "@/lib/uuid";
import { useCatalogStore } from "./catalog";

export interface HeldCart { id: string; label: string; heldAt: string; shiftId: string; cart: Cart }

/** Thrown when a tap would take a tracked product below zero (pos-spec §9). */
export class CartStockError extends Error {
  constructor(public availableQty: number) {
    super("insufficient stock");
    this.name = "CartStockError";
  }
}

interface CartState {
  cart: Cart;
  heldCarts: HeldCart[];
  /** Set by the payment stock-race path; cleared by any cart mutation. */
  conflictLineIds: string[];
  addProduct(p: Product, opts?: { variantId?: string; modifiers?: CartModifier[]; qty?: number }): void;
  addMisc(name: string, amountC: number): void;
  setQty(lineId: string, qty: number): void;
  removeLine(lineId: string): void;
  setLineDiscount(lineId: string, d: DiscountSpec | null): void;
  setOrderDiscount(d: DiscountSpec | null): void;
  setOrderType(t: OrderType): void;
  setScPwd(info: ScPwdInfo | null): void;
  toggleScPwdLine(lineId: string): void;
  hold(label: string, shiftId: string): void;
  resume(heldId: string): void;
  discardHeld(heldId: string): void;
  /** Resets the CURRENT cart only — held carts survive. */
  clear(): void;
  /** Current cart AND holds — unpair / 401 paths. */
  resetAll(): void;
  totals(settings: { taxRate: number; serviceChargeRate: number }): CartTotals;
}

function qtyInCart(cart: Cart, productId: string, variantId: string | null, exceptLineId?: string): number {
  return cart.lines
    .filter((l) => l.productId === productId && l.variantId === variantId && l.id !== exceptLineId)
    .reduce((sum, l) => sum + l.qty, 0);
}

/** Throws unless `wanted` more units fit inside what the branch actually has. */
function assertStock(cart: Cart, productId: string, variantId: string | null, wanted: number, exceptLineId?: string): void {
  const available = useCatalogStore.getState().availableQty(productId, variantId);
  if (available === null) return; // untracked
  const claimed = qtyInCart(cart, productId, variantId, exceptLineId);
  if (claimed + wanted > available) throw new CartStockError(Math.max(0, available - claimed));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      /** Every mutation clears the stale stock-conflict highlight. */
      const mutate = (fn: (cart: Cart) => Cart) =>
        set((s) => ({ cart: fn(s.cart), conflictLineIds: [] }));

      const mapLines = (fn: (line: CartLine) => CartLine) =>
        mutate((cart) => ({ ...cart, lines: cart.lines.map(fn) }));

      return {
        cart: emptyCart(),
        heldCarts: [],
        conflictLineIds: [],

        addProduct: (p, opts = {}) => {
          const { cart } = get();
          const variantId = opts.variantId ?? null;
          const variant = variantId ? p.variants.find((v) => v.id === variantId) ?? null : null;
          const modifiers = opts.modifiers ?? [];
          const qty = opts.qty ?? 1;

          if (p.trackStock) assertStock(cart, p.id, variantId, qty);

          // Plain repeat taps stack onto the existing line; anything customised gets its own.
          const mergeable =
            modifiers.length === 0
              ? cart.lines.find(
                  (l) =>
                    l.productId === p.id &&
                    l.variantId === variantId &&
                    l.modifiers.length === 0 &&
                    l.discount === null
                )
              : undefined;

          if (mergeable) {
            mapLines((l) => (l.id === mergeable.id ? { ...l, qty: l.qty + qty } : l));
            return;
          }

          const line: CartLine = {
            id: newId(),
            productId: p.id,
            variantId,
            name: variant ? `${p.name} — ${variant.name}` : p.name,
            soldBy: p.soldBy,
            qty,
            unitPriceC: variant ? variant.priceC : p.priceC, // price locks here
            modifiers,
            discount: null,
            scPwdMarked: cart.scPwd !== null,
            trackStock: p.trackStock,
          };
          mutate((c) => ({ ...c, lines: [...c.lines, line] }));
        },

        addMisc: (name, amountC) => {
          const { cart } = get();
          const line: CartLine = {
            id: newId(),
            productId: null,
            variantId: null,
            name,
            soldBy: "unit",
            qty: 1,
            unitPriceC: amountC,
            modifiers: [],
            discount: null,
            scPwdMarked: cart.scPwd !== null,
            trackStock: false,
          };
          mutate((c) => ({ ...c, lines: [...c.lines, line] }));
        },

        setQty: (lineId, qty) => {
          const { cart } = get();
          const line = cart.lines.find((l) => l.id === lineId);
          if (!line) return;
          if (qty <= 0) {
            mutate((c) => ({ ...c, lines: c.lines.filter((l) => l.id !== lineId) }));
            return;
          }
          if (line.trackStock && line.productId) assertStock(cart, line.productId, line.variantId, qty, lineId);
          mapLines((l) => (l.id === lineId ? { ...l, qty } : l));
        },

        removeLine: (lineId) => mutate((c) => ({ ...c, lines: c.lines.filter((l) => l.id !== lineId) })),

        setLineDiscount: (lineId, d) => mapLines((l) => (l.id === lineId ? { ...l, discount: d } : l)),

        setOrderDiscount: (d) => mutate((c) => ({ ...c, orderDiscount: d })),

        setOrderType: (t) => mutate((c) => ({ ...c, orderType: t })),

        // Marking defaults to every line; the operator can un-mark individually afterwards.
        setScPwd: (info) =>
          mutate((c) => ({
            ...c,
            scPwd: info,
            lines: info ? c.lines.map((l) => ({ ...l, scPwdMarked: true })) : c.lines,
          })),

        toggleScPwdLine: (lineId) =>
          mapLines((l) => (l.id === lineId ? { ...l, scPwdMarked: !l.scPwdMarked } : l)),

        hold: (label, shiftId) =>
          set((s) => ({
            heldCarts: [...s.heldCarts, { id: newId(), label, heldAt: nowIso(), shiftId, cart: s.cart }],
            cart: emptyCart(),
            conflictLineIds: [],
          })),

        resume: (heldId) =>
          set((s) => {
            const held = s.heldCarts.find((h) => h.id === heldId);
            if (!held) return s;
            return {
              cart: held.cart,
              heldCarts: s.heldCarts.filter((h) => h.id !== heldId),
              conflictLineIds: [],
            };
          }),

        discardHeld: (heldId) => set((s) => ({ heldCarts: s.heldCarts.filter((h) => h.id !== heldId) })),

        clear: () => set({ cart: emptyCart(), conflictLineIds: [] }),

        resetAll: () => set({ cart: emptyCart(), heldCarts: [], conflictLineIds: [] }),

        totals: (settings) => computeTotals(get().cart, settings),
      };
    },
    {
      name: "sentry-pos:carts",
      partialize: (s) => ({ cart: s.cart, heldCarts: s.heldCarts }),
    }
  )
);
