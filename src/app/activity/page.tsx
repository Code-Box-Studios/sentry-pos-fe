"use client";

import { useCallback, useEffect, useState } from "react";
import { getApi } from "@/api";
import type { OperatorActivity } from "@/api/types";
import { TopBar } from "@/components/chrome/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { handleApiError } from "@/lib/handle-api-error";
import { formatPeso } from "@/lib/money";
import { formatManilaTime } from "@/lib/time";
import { useOperatorStore } from "@/state/operator";

export default function ActivityPage() {
  const operator = useOperatorStore((state) => state.operator);
  const [data, setData] = useState<OperatorActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { setData(await getApi().getOperatorActivity()); }
    catch (cause) {
      try { handleApiError(cause); } catch { /* Inline error keeps refresh available. */ }
      setError(cause instanceof Error ? cause.message : "Could not load activity");
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const identity = (userId: string | null) => !userId ? "Legacy terminal activity" : userId === operator?.userId ? "You" : "Attributed operator";
  return <main className="flex h-dvh flex-col bg-surface">
    <TopBar active="activity" />
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div><h1 className="text-2xl font-medium text-ink">{operator?.role === "cashier" ? "My activity" : "Branch activity"}</h1><p className="mt-1 text-sm text-steel">{operator?.role === "cashier" ? "Your sales and drawers at this branch." : "Sales and drawers at this terminal's branch."} Latest 100 of each, with variance shown only after close.</p></div>
          <Button size="sm" variant="secondary" onClick={load} disabled={busy}>Refresh</Button>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {!data && busy && <p className="text-sm text-steel">Loading activity…</p>}
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Card className="gap-0 p-5"><h2 className="pb-3 font-semibold text-ink">Sales</h2>
            {data?.sales.map((sale) => <div key={sale.id} className="flex items-center justify-between gap-3 border-t border-hairline py-3 text-sm"><div className="min-w-0"><p className="truncate font-mono font-semibold">{sale.receiptNo}</p><p className="mt-1 text-xs text-steel">{formatManilaTime(sale.createdAt)} · {identity(sale.operatorUserId)} · {sale.status}</p></div><span className="shrink-0 font-mono">{formatPeso(sale.totalC)}</span></div>)}
            {data && !data.sales.length && <p className="text-sm text-steel">No recorded sales yet.</p>}
          </Card>
          <Card className="gap-0 p-5"><h2 className="pb-3 font-semibold text-ink">Shifts &amp; over/short</h2>
            {data?.shifts.map((shift) => <div key={shift.id} className="flex items-center justify-between gap-3 border-t border-hairline py-3 text-sm"><div><p>{formatManilaTime(shift.openedAt)}</p><p className="mt-1 text-xs text-steel">{identity(shift.operatorUserId)} · {shift.closedAt ? "Closed" : "Open"}</p></div><span className={`shrink-0 font-mono ${shift.overShortC !== null && shift.overShortC < 0 ? "text-danger" : "text-green-dark"}`}>{shift.overShortC === null ? "—" : `${shift.overShortC < 0 ? "−" : "+"}${formatPeso(Math.abs(shift.overShortC))}`}</span></div>)}
            {data && !data.shifts.length && <p className="text-sm text-steel">No recorded shifts yet.</p>}
          </Card>
        </div>
      </div>
    </div>
  </main>;
}
