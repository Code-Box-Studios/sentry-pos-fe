"use client";

import { lineUnitWithModsC } from "@/domain/cart";
import type { CompletedSale } from "@/api/types";
import type { BranchInfo, BusinessSettings, PaymentMethod } from "@/domain/types";
import { formatC } from "@/lib/money";
import { formatQty } from "@/lib/qty";
import { formatManilaDateTime } from "@/lib/time";
import { discountRowLabel } from "@/components/sale/discountLabel";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
  other: "Other",
};

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex${bold ? " text-sm font-semibold" : ""}`}>
      <div className="flex-1">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-0.5 border-t border-dashed border-hairline-strong pt-2.5">{children}</div>;
}

/**
 * Business branding only — never Sentry's (pos-spec §6). Same component on screen and on paper.
 */
export function ReceiptView({
  sale,
  business,
  branch,
  terminalCode,
  reprint = false,
}: {
  sale: CompletedSale;
  business: BusinessSettings;
  branch: BranchInfo;
  terminalCode: string;
  reprint?: boolean;
}) {
  const { totals } = sale;
  const headerLines = business.receiptHeader.split("\n").filter((l) => l.trim() !== "");
  const footerLines = business.receiptFooter.split("\n").filter((l) => l.trim() !== "");
  const discountsC = totals.promoDiscountC;
  const vatPercent = Math.round(business.taxRate * 100);

  return (
    <div className="flex flex-col gap-3 bg-white p-5 font-mono text-xs leading-relaxed text-ink">
      <div className="flex flex-col gap-0.5 text-center">
        <div className="text-sm font-semibold">{business.name.toUpperCase()}</div>
        <div>{branch.name} Branch</div>
        {branch.address && <div>{branch.address}</div>}
        {headerLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {reprint && <div className="pt-1 font-semibold">*** REPRINT ***</div>}
        {sale.status !== "completed" && <div className="pt-1 font-semibold">*** {sale.status.toUpperCase()} ***</div>}
      </div>

      <Block>
        <Row label="Receipt" value={sale.receiptNo} />
        <Row label="Date" value={formatManilaDateTime(sale.createdAt)} />
        <Row label="Terminal" value={`${branch.code} · ${terminalCode}`} />
      </Block>

      <Block>
        {sale.lines.map((line) => {
          const lt = totals.lines.find((l) => l.lineId === line.id);
          const unitC = lineUnitWithModsC(line);
          const qtyLabel = formatQty(line.qty, line.soldBy);
          return (
            <div key={line.id} className="flex flex-col gap-0.5">
              <div className="flex">
                <div className="flex-1">
                  {line.name} {qtyLabel}×{formatC(unitC)}
                </div>
                <div>{formatC(lt?.grossC ?? 0)}</div>
              </div>
              {line.modifiers.map((m) => (
                <div key={m.modifierId} className="pl-2.5 text-slate">
                  + {m.name} {formatC(m.priceDeltaC)}
                </div>
              ))}
              {line.discount && lt?.applied === "promo" && (
                <div className="pl-2.5">
                  {discountRowLabel(line.discount)} −{formatC(lt.promoDiscountC)}
                </div>
              )}
            </div>
          );
        })}
      </Block>

      <Block>
        <Row label="Subtotal" value={formatC(totals.subtotalC)} />
        {discountsC > 0 && <Row label="Discounts" value={`-${formatC(discountsC)}`} />}
        {totals.scPwdDiscountC > 0 && (
          <>
            <Row label="SC/PWD discount" value={`-${formatC(totals.scPwdDiscountC)}`} />
            {sale.scPwd && <div className="pl-2.5">ID {sale.scPwd.idNo} — {sale.scPwd.name}</div>}
          </>
        )}
        {totals.serviceChargeC > 0 && (
          <Row
            label={`Service charge ${Math.round(business.serviceChargeRate * 100)}%`}
            value={formatC(totals.serviceChargeC)}
          />
        )}
        <Row label="TOTAL" value={formatC(totals.totalC)} bold />
        <Row
          label={METHOD_LABEL[sale.payment.method]}
          value={formatC(sale.payment.method === "cash" ? sale.payment.tenderedC : sale.payment.amountC)}
        />
        {sale.payment.method === "cash" && <Row label="Change" value={formatC(sale.payment.changeC)} />}
        {sale.payment.referenceNo && <Row label="Ref" value={sale.payment.referenceNo} />}
      </Block>

      <Block>
        <Row label="VATable sales" value={formatC(totals.vatableSalesC)} />
        <Row label="VAT-exempt sales" value={formatC(totals.vatExemptSalesC)} />
        <Row label={`VAT ${vatPercent}% (included)`} value={formatC(totals.vatC)} />
      </Block>

      {footerLines.length > 0 && (
        <div className="flex flex-col gap-0.5 border-t border-dashed border-hairline-strong pt-2.5 text-center">
          {footerLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
