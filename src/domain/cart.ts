import { newId } from "@/lib/uuid";
import type { OrderType, SoldBy } from "./types";

export type DiscountSpec =
  | { source: "named"; discountId: string; name: string; kind: "percent" | "fixed"; value: number }
  | { source: "free"; kind: "percent" | "fixed"; value: number };

export interface CartModifier { groupId: string; modifierId: string; name: string; priceDeltaC: number }

export interface CartLine {
  id: string;
  productId: string | null;   // null = misc line
  variantId: string | null;
  name: string;               // snapshot, e.g. "Iced Latte — Large"
  soldBy: SoldBy;
  qty: number;
  unitPriceC: number;         // locked at add-to-cart (variant price when variant)
  modifiers: CartModifier[];
  discount: DiscountSpec | null;
  scPwdMarked: boolean;       // participates in SC/PWD when cart.scPwd is set
  trackStock: boolean;
}

export interface ScPwdInfo { idNo: string; name: string }

export interface Cart {
  id: string;
  orderType: OrderType;
  lines: CartLine[];
  orderDiscount: DiscountSpec | null;
  scPwd: ScPwdInfo | null;
}

/** The price the line actually sells at: locked base plus every chosen modifier's delta. */
export function lineUnitWithModsC(line: CartLine): number {
  return line.modifiers.reduce((sum, m) => sum + m.priceDeltaC, line.unitPriceC);
}

export function emptyCart(): Cart {
  return { id: newId(), orderType: "none", lines: [], orderDiscount: null, scPwd: null };
}
