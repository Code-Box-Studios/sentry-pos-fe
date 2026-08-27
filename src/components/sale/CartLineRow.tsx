"use client";

import { Badge } from "@/components/ui/badge";
import type { CartLine } from "@/domain/cart";
import type { LineTotals } from "@/domain/totals";
import { formatC, formatPeso } from "@/lib/money";
import { formatQty } from "@/lib/qty";
import { cn } from "@/lib/utils";
import { discountBadgeLabel } from "./discountLabel";

function Stepper({ qty, onChange }: { qty: number; onChange(next: number): void }) {
  return (
    <div className="flex items-center rounded-full border border-hairline">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(qty - 1)}
        className="flex size-[30px] items-center justify-center text-base text-slate"
      >
        −
      </button>
      <span className="w-7 text-center text-sm font-semibold text-ink">{qty}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(qty + 1)}
        className="flex size-[30px] items-center justify-center text-base text-slate"
      >
        +
      </button>
    </div>
  );
}

export function CartLineRow({
  line,
  totals,
  scPwdActive,
  conflicted = false,
  onSetQty,
  onRemove,
  onEditWeight,
  onDiscount,
  onToggleScPwd,
}: {
  line: CartLine;
  totals: LineTotals | undefined;
  scPwdActive: boolean;
  conflicted?: boolean;
  onSetQty(qty: number): void;
  onRemove(): void;
  onEditWeight(): void;
  onDiscount(): void;
  onToggleScPwd(): void;
}) {
  const hasMods = line.modifiers.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-hairline-soft px-5 py-3 last:border-b-0",
        conflicted && "border border-danger bg-danger-bg"
      )}
    >
      <div className="flex items-baseline gap-2">
        <div className="flex-1 text-[15px] font-semibold text-ink">{line.name}</div>
        <div className="font-mono text-[15px] font-semibold text-ink">{formatC(totals?.netC ?? 0)}</div>
        <button
          type="button"
          aria-label={`Remove ${line.name}`}
          onClick={onRemove}
          className="-mr-1 flex size-6 items-center justify-center rounded-lg text-stone active:bg-hairline-soft"
        >
          ×
        </button>
      </div>

      {line.modifiers.map((m) => (
        <div key={m.modifierId} className="pl-3 text-[13px] text-steel">
          + {m.name}
          {m.priceDeltaC !== 0 && ` (+${formatPeso(m.priceDeltaC)})`}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2.5">
        {line.soldBy === "weight" ? (
          <button
            type="button"
            onClick={onEditWeight}
            className="rounded-[8px] border border-hairline-strong px-3 py-1 font-mono text-sm font-semibold text-ink"
          >
            {formatQty(line.qty, "weight")} kg
          </button>
        ) : (
          <Stepper qty={line.qty} onChange={onSetQty} />
        )}

        <div className="text-[13px] text-stone">
          @ {formatPeso(line.unitPriceC)}
          {line.soldBy === "weight" && " / kg"}
          {hasMods && " + mods"}
        </div>

        <div className="flex-1" />

        {line.discount && (
          <button type="button" onClick={onDiscount} aria-label="Change line discount">
            <Badge variant="soft-green">{discountBadgeLabel(line.discount)}</Badge>
          </button>
        )}

        {scPwdActive && (
          <button
            type="button"
            onClick={onToggleScPwd}
            aria-label={line.scPwdMarked ? `Remove SC/PWD from ${line.name}` : `Apply SC/PWD to ${line.name}`}
          >
            <Badge variant={line.scPwdMarked ? "soft-green" : "neutral"}>SC/PWD</Badge>
          </button>
        )}
      </div>

      {conflicted && (
        <p className="text-[13px] font-semibold text-danger">stock changed — adjust or remove</p>
      )}
    </div>
  );
}
