"use client";

import { Button } from "@/components/ui/button";
import type { Cart } from "@/domain/cart";
import type { CartTotals } from "@/domain/totals";
import { formatC, formatPeso } from "@/lib/money";
import { discountRowLabel } from "./discountLabel";

function Row({ label, value, tone = "steel" }: { label: string; value: string; tone?: "steel" | "green" }) {
  return (
    <div className={`flex text-sm ${tone === "green" ? "text-green-dark" : "text-steel"}`}>
      <div className="flex-1">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}

export function TotalsFooter({
  cart,
  totals,
  serviceChargeRate,
  onDiscount,
  onScPwd,
  onCharge,
}: {
  cart: Cart;
  totals: CartTotals;
  serviceChargeRate: number;
  onDiscount(): void;
  onScPwd(): void;
  onCharge(): void;
}) {
  const linePromoC = totals.lines.reduce((sum, l) => (l.applied === "promo" ? sum + l.promoDiscountC : sum), 0);
  const orderDiscountC = totals.promoDiscountC - linePromoC;
  const empty = cart.lines.length === 0;

  return (
    <div className="flex flex-col gap-2 border-t border-hairline px-5 py-4">
      <Row label="Subtotal" value={formatC(totals.subtotalC)} />

      {totals.lines.map((lt) => {
        if (lt.applied !== "promo") return null;
        const line = cart.lines.find((l) => l.id === lt.lineId);
        if (!line?.discount) return null;
        return (
          <Row
            key={lt.lineId}
            tone="green"
            label={`${discountRowLabel(line.discount)} (${line.name})`}
            value={`−${formatC(lt.promoDiscountC)}`}
          />
        );
      })}

      {orderDiscountC > 0 && cart.orderDiscount && (
        <Row tone="green" label={discountRowLabel(cart.orderDiscount)} value={`−${formatC(orderDiscountC)}`} />
      )}

      {totals.scPwdDiscountC > 0 && (
        <Row tone="green" label="SC / PWD (VAT off, then 20%)" value={`−${formatC(totals.scPwdDiscountC)}`} />
      )}

      {cart.orderType === "dine_in" && serviceChargeRate > 0 && (
        <Row label={`Service charge ${Math.round(serviceChargeRate * 100)}%`} value={formatC(totals.serviceChargeC)} />
      )}

      <div className="flex items-baseline">
        <div className="flex-1 text-lg font-semibold text-ink">Total</div>
        <div className="font-mono text-[26px] font-bold text-ink">{formatPeso(totals.totalC)}</div>
      </div>

      <p className="text-xs text-stone">
        VAT included {formatPeso(totals.vatC)} · prices VAT-inclusive
      </p>

      <div className="flex gap-2 pt-1.5">
        <Button variant="secondary" onClick={onDiscount} disabled={empty}>
          Discount
        </Button>
        <Button variant="secondary" onClick={onScPwd} disabled={empty}>
          SC / PWD
        </Button>
        <Button size="lg" className="flex-1" onClick={onCharge} disabled={empty}>
          Charge {formatPeso(totals.totalC)}
        </Button>
      </div>
    </div>
  );
}
