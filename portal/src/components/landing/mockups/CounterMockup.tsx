import { Reveal } from "../Reveal";
import { DEMO_LINES, DEMO_TOTAL, DEMO_VAT_INCLUDED } from "./demo-cart";

const CHIPS = ["All", "Drinks", "Grocery"];

const TILES = [
  { name: "Iced Latte", note: "from ₱120.00" },
  { name: "Coke 1.5L", note: "₱98.00" },
  { name: "Jasmine rice", note: "₱95.00 / kg" },
  { name: "Pan de sal", low: "LOW · 8" },
];

/** The terminal mid-sale: the catalogue grid on the left, the running cart on the right. */
export function CounterMockup() {
  return (
    <div className="border-hairline bg-surface flex flex-col gap-3.5 rounded-2xl border p-5 sm:flex-row">
      <div className="flex flex-[1.2] flex-col gap-2">
        <div className="flex gap-1.5">
          {CHIPS.map((chip, i) => (
            <span
              key={chip}
              className={`rounded-full px-3 py-[5px] text-[11px] font-semibold ${
                i === 0
                  ? "bg-brand-teal-deep text-white"
                  : "border-hairline bg-canvas border text-steel"
              }`}
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {TILES.map((tile, i) => (
            <Reveal
              key={tile.name}
              delay={60 + i * 80}
              className="border-hairline bg-canvas flex flex-col gap-1.5 rounded-[10px] border p-2.5"
            >
              <div className="text-xs font-semibold">{tile.name}</div>
              {tile.low ? (
                <span className="bg-warn-bg text-warn-text anim-blink-soft self-start rounded-full px-1.5 py-px text-[9px] font-semibold">
                  {tile.low}
                </span>
              ) : (
                <div className="text-[11px] text-steel">{tile.note}</div>
              )}
            </Reveal>
          ))}
        </div>
      </div>

      <div className="border-hairline bg-canvas flex flex-1 flex-col gap-2 rounded-xl border p-3.5">
        <div className="text-xs font-semibold">Current sale</div>

        {DEMO_LINES.map((line, i) => (
          <Reveal
            key={line.text}
            delay={160 + i * 70}
            className={`flex text-[11px] ${line.discount ? "text-brand-green-dark" : ""}`}
          >
            <span className="flex-1">{line.text}</span>
            <span className="font-mono">{line.amount}</span>
          </Reveal>
        ))}

        <div className="min-h-2 flex-1" />

        <div className="border-hairline-soft flex items-baseline border-t pt-2">
          <div className="flex-1 text-xs font-semibold">Total</div>
          <div className="font-mono text-base font-bold">{DEMO_TOTAL}</div>
        </div>
        <div className="text-[9px] text-stone">VAT included {DEMO_VAT_INCLUDED}</div>

        <div className="bg-brand-green text-ink relative flex h-[30px] items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold">
          <span
            aria-hidden
            className="anim-shimmer absolute inset-y-0 left-0 w-[34%] bg-[linear-gradient(105deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0)_100%)]"
          />
          <span className="relative">Charge</span>
        </div>
      </div>
    </div>
  );
}
