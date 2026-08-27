import type { DiscountSpec } from "@/domain/cart";
import { formatPeso } from "@/lib/money";

export function discountAmountLabel(d: DiscountSpec): string {
  return d.kind === "percent" ? `${d.value}% OFF` : `${formatPeso(d.value)} OFF`;
}

/**
 * "Merienda 10%" reads as "10% OFF · MERIENDA" on a line badge — the amount already says the
 * percentage, so it comes off the name.
 */
export function discountBadgeLabel(d: DiscountSpec): string {
  if (d.source === "free") return discountAmountLabel(d);
  const name = d.name.replace(/\s*\d+(\.\d+)?%\s*$/, "").trim();
  return name === "" ? discountAmountLabel(d) : `${discountAmountLabel(d)} · ${name.toUpperCase()}`;
}

/** Row label in the totals footer, where the full discount name is the useful part. */
export function discountRowLabel(d: DiscountSpec): string {
  return d.source === "named" ? d.name : discountAmountLabel(d);
}
