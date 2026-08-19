import { StatusDot } from "./parts";

export type BranchMockupKind = "transfer" | "expiry" | "stocktake" | "terminals";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-hairline bg-surface flex flex-col gap-2 rounded-xl border p-4">{children}</div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[1px] text-steel">{children}</div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-hairline bg-canvas flex items-center gap-2.5 rounded-[10px] border px-3.5 py-[9px] text-[13px]">
      {children}
    </div>
  );
}

/** The four small illustrations behind the multi-branch claims. */
export function BranchMockup({ kind }: { kind: BranchMockupKind }) {
  if (kind === "transfer") {
    return (
      <Panel>
        <Eyebrow>TRANSFER STOCK</Eyebrow>
        <div className="flex items-center gap-2.5 text-[13px]">
          <span className="bg-brand-teal-deep rounded-full px-3 py-1.5 font-semibold text-white">
            Marikit
          </span>
          <span aria-hidden className="text-brand-green-mid anim-nudge-x font-bold">
            →
          </span>
          <span className="border-hairline-strong rounded-full border px-3 py-1.5 font-semibold text-slate">
            Bayanihan
          </span>
        </div>
        <Row>
          <span className="flex-1 font-semibold">Coke 1.5L</span>
          <span className="font-mono">× 24</span>
        </Row>
        <span className="bg-brand-green text-ink self-start rounded-full px-[18px] py-2 text-xs font-semibold">
          Send transfer
        </span>
      </Panel>
    );
  }

  if (kind === "expiry") {
    return (
      <Panel>
        <Eyebrow>EXPIRING SOON</Eyebrow>
        <Row>
          <span className="flex-1 font-semibold">Cream cheese — 4 units</span>
          <span className="bg-danger-bg text-danger anim-blink-soft rounded-full px-2 py-0.5 text-[10px] font-semibold">
            TOMORROW
          </span>
        </Row>
        <Row>
          <span className="flex-1 font-semibold">Fresh milk — 24 units</span>
          <span className="bg-warn-bg text-warn-text rounded-full px-2 py-0.5 text-[10px] font-semibold">
            3 DAYS
          </span>
        </Row>
        <Row>
          <span className="flex-1 font-semibold">Ube halaya jar — 8 units</span>
          <span className="bg-warn-bg text-warn-text rounded-full px-2 py-0.5 text-[10px] font-semibold">
            5 DAYS
          </span>
        </Row>
      </Panel>
    );
  }

  if (kind === "stocktake") {
    return (
      <Panel>
        <div className="flex items-center">
          <div className="flex-1">
            <Eyebrow>STOCK-TAKE — COUNT DAY</Eyebrow>
          </div>
          <span className="bg-brand-green-soft text-brand-green-dark rounded-full px-2 py-0.5 text-[10px] font-semibold">
            DRAFT
          </span>
        </div>
        <Row>
          <span className="flex-1 font-semibold">Kopiko 3-in-1</span>
          <span className="font-mono text-stone">system 214</span>
          <span className="border-brand-green-dark rounded-[8px] border-2 px-2.5 py-1 font-mono font-semibold">
            211
          </span>
          <span className="text-danger font-mono font-semibold">−3</span>
        </Row>
        <Row>
          <span className="flex-1 font-semibold">Coke 1.5L</span>
          <span className="font-mono text-stone">system 46</span>
          <span className="border-hairline-strong rounded-[8px] border px-2.5 py-1 font-mono font-semibold">
            46
          </span>
          <span className="text-brand-green-dark font-mono font-semibold">✓</span>
        </Row>
      </Panel>
    );
  }

  return (
    <Panel>
      <Eyebrow>TERMINALS</Eyebrow>
      <Row>
        <StatusDot />
        <span className="flex-1 font-semibold">MKT · Counter 1</span>
        <span className="text-xs text-stone">seen just now</span>
      </Row>
      <Row>
        <StatusDot tone="down" />
        <span className="flex-1 font-semibold text-stone line-through">POB · Counter 2</span>
        <span className="bg-danger-bg text-danger anim-blink-soft rounded-full px-3 py-1 text-[11px] font-semibold">
          Unpaired
        </span>
      </Row>
    </Panel>
  );
}
