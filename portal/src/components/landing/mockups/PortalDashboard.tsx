import Image from "next/image";
import { CountUp } from "../CountUp";
import { DEMO_LINE_COUNT, DEMO_TOTAL } from "./demo-cart";
import { DayBars, Heatmap, StatusDot, WindowDots } from "./parts";

const NAV = ["Dashboard", "Analytics", "Catalog", "Stock", "Terminals", "Activity log"];

const AUGUST = [1, 2, 1, 2, 3, 5, 4, 2, 1, 2, 3, 4, 5, 6];

function Kpi({
  label,
  value,
  delta,
  peso = true,
  down,
}: {
  label: string;
  value: number;
  delta: string;
  peso?: boolean;
  down?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] font-semibold tracking-[0.5px] text-steel">{label}</div>
      <div className="font-mono text-[17px] font-bold">
        {peso ? "₱" : null}
        <CountUp value={value} />
      </div>
      <div className={`text-[10px] font-semibold ${down ? "text-danger" : "text-brand-green-dark"}`}>
        {down ? "▼" : "▲"} {delta}
      </div>
    </div>
  );
}

/**
 * The hero shot: the owner portal on the morning of a normal trading day, with the two alerts that
 * would be waiting floating off its corners.
 */
export function PortalDashboard() {
  return (
    <div className="anim-rise relative mt-6 w-full max-w-[1000px]" style={{ animationDelay: "550ms" }}>
      <div className="bg-canvas-dark rounded-xl p-3 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.4)]">
        <WindowDots />

        <div className="bg-surface flex overflow-hidden rounded-[8px] text-left">
          <div className="border-hairline bg-canvas hidden w-[132px] flex-none flex-col gap-0.5 border-r px-2 py-3.5 sm:flex">
            <Image src="/brand/sentry-mark.svg" alt="" width={18} height={18} className="mx-2 mb-2.5" />
            {NAV.map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-2 py-1.5 text-[11px] ${
                  i === 0
                    ? "bg-brand-green-soft text-brand-green-dark font-semibold"
                    : "font-medium text-steel"
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 text-[13px] font-semibold">
                Good morning, Maria — Wednesday, 19 Aug
              </div>
              <div className="border-hairline relative flex size-6 items-center justify-center rounded-full border text-[11px]">
                🔔
                <span className="bg-brand-green text-ink absolute -top-[3px] -right-[3px] flex h-[13px] min-w-[13px] items-center justify-center rounded-full text-[8px] font-bold">
                  3
                </span>
              </div>
              <div className="bg-brand-teal-deep flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white">
                MS
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="border-hairline bg-canvas flex flex-[1.4] flex-col gap-2 rounded-[10px] border p-3.5">
                <div className="text-xs font-semibold">Kape Diaria</div>
                <div className="flex gap-3.5">
                  <Kpi label="SALES TODAY" value={31485} delta="12%" />
                  <Kpi label="PROFIT" value={13208} delta="9%" />
                  <Kpi label="TXNS" value={96} delta="4%" peso={false} down />
                </div>
                <DayBars heights={[45, 62, 40, 74, 90, 55, 100]} />
                <div className="border-hairline-soft flex flex-col gap-[3px] border-t pt-1.5 text-[10px] text-steel">
                  <div className="flex">
                    <div className="text-ink w-16 font-semibold">Marikit</div>
                    <div>₱18,240 · shift open</div>
                  </div>
                  <div className="flex">
                    <div className="text-ink w-16 font-semibold">Bayanihan</div>
                    <div>₱13,245 · shift open</div>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="border-hairline bg-canvas flex flex-col gap-1.5 rounded-[10px] border px-3.5 py-3">
                  <div className="text-[10px] font-semibold tracking-[1px] text-steel">LIVE</div>
                  <div className="flex gap-1.5 text-[11px]">
                    <span className="mt-1">
                      <StatusDot size={6} />
                    </span>
                    <span>Marikit T1 — seen just now</span>
                  </div>
                  <div className="flex gap-1.5 text-[11px]">
                    <span className="mt-1">
                      <StatusDot size={6} delay={800} />
                    </span>
                    <span>Poblacion T1 — shift open</span>
                  </div>
                  <div className="flex gap-1.5 text-[11px]">
                    <span className="mt-1">
                      <StatusDot size={6} tone="warn" />
                    </span>
                    <span className="text-warn-text">Low stock: Pan de sal</span>
                  </div>
                </div>

                <div className="border-hairline bg-canvas flex flex-col gap-1.5 rounded-[10px] border px-3.5 py-3">
                  <div className="text-[10px] font-semibold tracking-[1px] text-steel">AUGUST</div>
                  <Heatmap days={AUGUST} />
                  <div className="text-[10px] text-stone">Sat 16 is the month&rsquo;s best day</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="border-hairline bg-canvas absolute -top-[18px] -right-14 hidden w-[230px] gap-2.5 rounded-xl border px-3.5 py-3 text-left shadow-[0_16px_48px_-8px_rgba(0,30,43,0.16)] lg:flex"
        style={{ animation: "fadeUp 0.7s ease 1.7s both, floatY 6s ease-in-out 3s infinite" }}
      >
        <div className="bg-warn-bg text-warn-text flex size-7 flex-none items-center justify-center rounded-[8px] text-[13px]">
          ⚠
        </div>
        <div className="flex flex-col gap-px">
          <div className="text-xs font-semibold">Low stock</div>
          <div className="text-[11px] text-steel">Pan de sal crossed 10 at Marikit</div>
        </div>
      </div>

      <div
        className="border-hairline bg-canvas absolute -bottom-[26px] -left-16 hidden w-[210px] flex-col gap-2 rounded-xl border p-3.5 text-left shadow-[0_16px_48px_-8px_rgba(0,30,43,0.16)] lg:flex"
        style={{ animation: "fadeUp 0.7s ease 1.2s both, floatY 7s ease-in-out 2.5s infinite" }}
      >
        <div className="flex items-center gap-1.5">
          <Image src="/brand/sentry-mark.svg" alt="" width={14} height={14} />
          <div className="font-mono text-[10px] font-semibold text-steel">POS · MKT · T1</div>
        </div>
        <div className="flex items-baseline">
          <div className="flex-1 text-[11px] text-steel">{DEMO_LINE_COUNT} lines · dine-in</div>
          <div className="font-mono text-[17px] font-bold">{DEMO_TOTAL}</div>
        </div>
        <div className="bg-brand-green text-ink flex h-[30px] items-center justify-center rounded-full text-[11px] font-semibold">
          Charge
        </div>
      </div>
    </div>
  );
}
