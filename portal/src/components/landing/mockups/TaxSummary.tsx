import { Reveal } from "../Reveal";

const ROWS = [
  { label: "VATable sales", amount: "₱482,910.44" },
  { label: "VAT amount (included)", amount: "₱57,949.25" },
  { label: "VAT-exempt sales (SC/PWD)", amount: "₱21,014.29" },
  { label: "Service charge collected", amount: "₱7,381.10" },
];

/** The month's tax summary, and the email that lands at the day's close. */
export function TaxSummary() {
  return (
    <div className="border-hairline bg-surface flex flex-col gap-3 rounded-2xl border p-5">
      <div className="border-hairline bg-canvas overflow-hidden rounded-xl border">
        <div className="border-hairline flex items-center border-b px-4 py-3">
          <div className="flex-1 text-xs font-semibold">VAT summary — this month</div>
          <div className="bg-brand-green text-ink rounded-full px-3 py-1 text-[10px] font-semibold">
            ↓ CSV
          </div>
        </div>
        {ROWS.map((row, i) => (
          <Reveal
            key={row.label}
            delay={80 + i * 90}
            className={`flex px-4 py-[9px] text-[11px] ${
              i < ROWS.length - 1 ? "border-hairline-soft border-b" : ""
            }`}
          >
            <span className="flex-1">{row.label}</span>
            <span className="font-mono">{row.amount}</span>
          </Reveal>
        ))}
      </div>

      <div className="border-hairline bg-canvas flex items-center gap-2.5 rounded-xl border px-4 py-3">
        <div className="bg-brand-green-soft text-brand-green-dark anim-bob flex size-7 flex-none items-center justify-center rounded-[8px] text-[13px]">
          ✉
        </div>
        <div className="flex flex-col gap-px">
          <div className="text-xs font-semibold">Daily summary — Kape Diaria</div>
          <div className="text-[11px] text-steel">
            Sales ₱31,485 · profit ₱13,208 · 96 sales · 1 void · over/short +₱274.75
          </div>
        </div>
      </div>
    </div>
  );
}
