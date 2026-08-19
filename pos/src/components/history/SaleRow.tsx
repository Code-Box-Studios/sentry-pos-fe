"use client";

import { Badge } from "@/components/ui/badge";
import type { SaleStatus, SaleSummary } from "@/api/types";
import type { OrderType, PaymentMethod } from "@/domain/types";
import { formatPeso } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "dine-in",
  takeout: "takeout",
  none: "none",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "cash",
  card: "card",
  gcash: "GCash",
  maya: "Maya",
  other: "other",
};

const STATUS: Record<SaleStatus, { label: string; variant: "soft-green" | "warn" | "danger-soft" }> = {
  completed: { label: "COMPLETED", variant: "soft-green" },
  voided: { label: "VOIDED", variant: "warn" },
  refunded: { label: "REFUNDED", variant: "danger-soft" },
};

export function saleDescription(sale: SaleSummary): string {
  const parts = [
    `${sale.lineCount} ${sale.lineCount === 1 ? "line" : "lines"}`,
    ORDER_TYPE_LABEL[sale.orderType],
    METHOD_LABEL[sale.method],
  ];
  if (sale.referenceNo) parts.push(`ref ${sale.referenceNo}`);
  if (sale.statusReason) parts.push(`"${sale.statusReason}"`);
  if (sale.status === "refunded") parts.push("PIN ✓"); // refunds are gated; voids are not
  if (sale.scPwd) parts.push("SC/PWD");
  return parts.join(" · ");
}

export function SaleRow({ sale, onSelect }: { sale: SaleSummary; onSelect(): void }) {
  const status = STATUS[sale.status];
  const voided = sale.status === "voided";
  const refunded = sale.status === "refunded";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-4 rounded-lg border border-hairline bg-white px-5 py-3.5 text-left active:bg-hairline-soft"
    >
      <span className={cn("w-[150px] font-mono text-sm font-semibold", voided ? "text-stone" : "text-ink")}>
        {sale.receiptNo}
      </span>
      <span className="w-[70px] text-sm text-steel">{formatManilaTime(sale.createdAt)}</span>
      <span className="flex-1 text-sm text-slate">{saleDescription(sale)}</span>
      <Badge variant={status.variant}>{status.label}</Badge>
      <span
        className={cn(
          "w-[100px] text-right font-mono text-[15px] font-semibold",
          voided && "text-stone line-through",
          refunded && "text-danger"
        )}
      >
        {refunded ? `−${formatPeso(sale.totalC)}` : formatPeso(sale.totalC)}
      </span>
    </button>
  );
}
