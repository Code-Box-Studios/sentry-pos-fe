"use client";

import type { ZReport } from "@/api/types";
import { formatC } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex${bold ? " font-semibold" : ""}`}>
      <div className="flex-1">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-0.5 border-t border-dashed border-hairline-strong pt-2">{children}</div>;
}

function signed(c: number): string {
  return `${c >= 0 ? "+" : "−"}${formatC(Math.abs(c))}`;
}

/** The printable Z reading; `preview` is the same shape fed live X totals mid-shift. */
export function ZReportView({ z, preview = false }: { z: ZReport; preview?: boolean }) {
  const shiftDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    day: "2-digit",
    month: "short",
  }).format(new Date(z.openedAt));

  return (
    <div className="flex flex-col gap-2.5 bg-white font-mono text-xs leading-relaxed text-ink">
      <div className="font-sans text-[13px] font-semibold tracking-widest text-steel">
        {preview ? "Z REPORT PREVIEW" : "Z REPORT"}
      </div>
      <Row label="Shift" value={`${z.branchCode}-${z.terminalCode} · ${shiftDate}`} />
      <Row label="Opened" value={formatManilaTime(z.openedAt)} />
      {!preview && <Row label="Closed" value={formatManilaTime(z.closedAt)} />}

      <Block>
        <Row label="Cash" value={formatC(z.byMethod.cash)} />
        <Row label="Card" value={formatC(z.byMethod.card)} />
        <Row label="GCash" value={formatC(z.byMethod.gcash)} />
        <Row label="Maya" value={formatC(z.byMethod.maya)} />
        {z.byMethod.other > 0 && <Row label="Other" value={formatC(z.byMethod.other)} />}
        <Row label="Gross" value={formatC(z.grossC)} bold />
      </Block>

      <Block>
        <Row label="Sales" value={String(z.saleCount)} />
        <Row label="Voids" value={`${z.voidCount} (${formatC(z.voidAmountC)})`} />
        <Row label="Refunds" value={`${z.refundCount} (${formatC(z.refundAmountC)})`} />
        <Row label="SC/PWD disc." value={formatC(z.scPwdDiscountC)} />
        <Row label="Service charge" value={formatC(z.serviceChargeC)} />
      </Block>

      <Block>
        <Row label="Opening float" value={formatC(z.openingCashC)} />
        <Row label="Cash in/out" value={signed(z.cashInC - z.cashOutC)} />
        <Row label="Expected" value={formatC(z.expectedCashC)} />
        <Row label="Counted" value={formatC(z.countedCashC)} />
        <Row label="Over/short" value={signed(z.overShortC)} bold />
      </Block>
    </div>
  );
}
