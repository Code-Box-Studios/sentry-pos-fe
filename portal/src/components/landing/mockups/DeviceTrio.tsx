import Image from "next/image";
import { Reveal } from "../Reveal";
import { DEMO_LINES, DEMO_TOTAL } from "./demo-cart";
import { DayBars, Heatmap, StatusDot } from "./parts";

const TILES = [
  { name: "Espresso", price: "₱85.00" },
  { name: "Iced Latte", price: "from ₱120", selected: true },
  { name: "Cheese roll", price: "₱40.00" },
  { name: "Pan de sal", price: "₱12.00", badge: "LOW · 8" },
  { name: "Jasmine rice", price: "₱95 / kg" },
  { name: "Ube loaf", price: "₱120.00", out: true },
];

// Four weeks. -1 is a day that has not happened yet; 6 is the brand green at the top of the ramp.
const AUGUST = [
  0, 0, 0, 0, 0, 3, 4, 2, 1, 2, 1, 2, 4, 5, 1, 2, 1, 2, 3, 4, 5, 2, 2, 6, -1, -1, -1, -1,
];

/**
 * Phone, tablet and portal side by side — the section's whole argument is that they are one design
 * language, so they have to be seen together. The flanking two are decoration for that point and
 * drop away below `lg`, where they would overlap into illegibility.
 *
 * Each device is two elements deep on purpose: the outer one owns the tilt and the reveal, the
 * inner one owns the float. A single element cannot do both — `transform` has one value, and a
 * running animation takes it, which is why the tilt disappears if they share a node.
 */
export function DeviceTrio() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Your phone — the glance */}
      <Reveal className="relative z-10 -mr-6 hidden w-[200px] flex-none -rotate-4 lg:block">
        <div className="bg-surface anim-float overflow-hidden rounded-[20px] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.45)]">
          <div className="border-hairline bg-canvas flex h-[34px] items-center gap-1.5 border-b px-2.5">
            <Image src="/brand/sentry-mark.svg" alt="" width={14} height={14} />
            <div className="text-[10px] font-semibold">Dashboard</div>
            <div className="flex-1" />
            <div className="border-hairline relative flex size-4 items-center justify-center rounded-full border text-[8px]">
              🔔
              <span className="bg-brand-green absolute -top-[3px] -right-[3px] size-[9px] rounded-full" />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-2.5">
            <div className="bg-warn-bg text-warn-text rounded-[8px] px-2 py-1.5 text-[8px] font-semibold">
              ⚠ 3 low stock · 1 shift open late
            </div>
            <div className="border-hairline bg-canvas flex flex-col gap-[5px] rounded-[10px] border p-2.5">
              <div className="text-[10px] font-semibold">Kape Diaria</div>
              <div className="font-mono text-sm font-bold">
                ₱31,485 <span className="text-brand-green-dark text-[8px]">▲ 12%</span>
              </div>
              <DayBars heights={[50, 65, 42, 77, 92, 58, 100]} className="h-[22px]" animate={false} />
            </div>
            <div className="border-hairline bg-canvas flex flex-col gap-[5px] rounded-[10px] border p-2.5 text-[9px]">
              <div className="text-[8px] font-semibold tracking-[0.5px] text-steel">LIVE</div>
              <div className="flex items-start gap-[5px]">
                <span className="mt-[3px]">
                  <StatusDot size={5} />
                </span>
                <span>MKT T1 — just now</span>
              </div>
              <div className="flex items-start gap-[5px]">
                <span className="mt-[3px]">
                  <StatusDot size={5} tone="warn" />
                </span>
                <span className="text-warn-text">BYN T1 — open late</span>
              </div>
            </div>
            <div className="border-hairline bg-canvas flex rounded-[8px] border py-[5px] text-center text-[7px] font-semibold">
              <div className="text-brand-green-dark flex-1">Home</div>
              <div className="flex-1 text-stone">Analytics</div>
              <div className="flex-1 text-stone">Catalog</div>
              <div className="flex-1 text-stone">More</div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* The counter — tablet-first POS */}
      <Reveal delay={120} className="relative z-20 w-full max-w-[520px] min-w-0">
        <div className="bg-surface anim-float overflow-hidden rounded-[14px] shadow-[0_24px_56px_-8px_rgba(0,0,0,0.5)]">
          <div className="border-hairline bg-canvas flex h-[30px] items-center gap-2.5 border-b px-3">
            <Image src="/brand/sentry-mark.svg" alt="" width={14} height={14} />
            <div className="flex gap-0.5">
              {["Sale", "History", "Shift", "Stock"].map((tab, i) => (
                <span
                  key={tab}
                  className={`rounded-full px-[9px] py-[3px] text-[8px] font-semibold ${
                    i === 0 ? "bg-brand-teal-deep text-white" : "text-steel"
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="flex-1" />
            <div className="font-mono text-[8px] font-semibold whitespace-nowrap text-slate">
              MKT · T1
            </div>
            <div className="text-brand-green-dark flex items-center gap-1 text-[8px] font-medium whitespace-nowrap">
              <span className="bg-brand-green size-[5px] shrink-0 rounded-full" />
              Online
            </div>
          </div>

          <div className="flex h-[250px]">
            <div className="flex flex-[1.5] flex-col gap-2 p-2.5">
              <div className="border-hairline-strong bg-canvas flex h-[22px] items-center rounded-md border px-2 text-[8px] text-stone">
                ⌕ Search or scan a barcode
              </div>
              <div className="grid flex-1 grid-cols-3 gap-1.5">
                {TILES.map((tile) => (
                  <div
                    key={tile.name}
                    className={`flex flex-col justify-between rounded-[8px] p-[7px] ${
                      tile.out
                        ? "border-hairline bg-surface border opacity-70"
                        : tile.selected
                          ? "border-brand-green bg-canvas border-2"
                          : "border-hairline bg-canvas border"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className={`text-[9px] font-semibold ${tile.out ? "text-stone" : ""}`}>
                        {tile.name}
                      </div>
                      {tile.badge ? (
                        <span className="bg-warn-bg text-warn-text self-start rounded-full px-1 py-px text-[6px] font-semibold">
                          {tile.badge}
                        </span>
                      ) : null}
                      {tile.out ? (
                        <span className="bg-hairline self-start rounded-full px-1 py-px text-[6px] font-semibold text-steel">
                          OUT
                        </span>
                      ) : null}
                    </div>
                    <div className={`text-[8px] ${tile.out ? "text-mist" : "text-steel"}`}>
                      {tile.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-hairline bg-canvas flex flex-1 flex-col gap-1.5 border-l p-2.5">
              <div className="flex gap-1">
                <span className="bg-brand-teal-deep rounded-full px-2 py-0.5 text-[7px] font-semibold text-white">
                  Dine-in
                </span>
                <span className="border-hairline rounded-full border px-2 py-0.5 text-[7px] font-semibold text-steel">
                  Takeout
                </span>
              </div>
              {DEMO_LINES.map((line) => (
                <div
                  key={line.text}
                  className={`flex gap-1 text-[8px] ${line.discount ? "text-brand-green-dark" : ""}`}
                >
                  <span className="flex-1">{line.short ?? line.text}</span>
                  <span className="font-mono">{line.amount}</span>
                </div>
              ))}
              <div className="flex-1" />
              <div className="border-hairline-soft flex items-baseline border-t pt-1.5">
                <div className="flex-1 text-[9px] font-semibold">Total</div>
                <div className="font-mono text-[13px] font-bold">{DEMO_TOTAL}</div>
              </div>
              <div className="bg-brand-green text-ink flex h-[22px] items-center justify-center rounded-full text-[8px] font-semibold whitespace-nowrap">
                Charge {DEMO_TOTAL}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* The portal — full analytics */}
      <Reveal delay={240} className="relative z-10 -ml-6 hidden w-[250px] flex-none rotate-4 lg:block">
        <div className="bg-canvas anim-float overflow-hidden rounded-[14px] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.45)]">
          <div className="border-hairline flex items-center gap-2 border-b px-3.5 py-3">
            <div className="flex-1 text-[10px] font-semibold">Analytics — Sales</div>
            <span className="bg-brand-teal-deep rounded-full px-2 py-0.5 text-[7px] font-semibold text-white">
              This month
            </span>
          </div>
          <div className="flex flex-col gap-2 px-3.5 py-3">
            <div className="text-[8px] font-semibold tracking-[0.5px] text-steel">
              AUGUST — WHICH DAYS FEED US
            </div>
            <Heatmap days={AUGUST} cell="h-4" />
            <div className="text-[8px] text-stone">Sat 16 is the month&rsquo;s best day: ₱41,205</div>
            <div className="border-hairline-soft flex flex-col gap-[5px] border-t pt-2">
              {[
                { label: "Cash", pct: 68, bar: "bg-brand-green-mid" },
                { label: "GCash", pct: 17, bar: "bg-heat-4" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-1.5 text-[8px]">
                  <div className="w-9 text-steel">{row.label}</div>
                  <div className="bg-hairline-soft h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${row.bar}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <div className="font-mono">{row.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
