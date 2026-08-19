"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApi } from "@/api";
import type { ShiftTotals, ZReport } from "@/api/types";
import { TopBar } from "@/components/chrome/TopBar";
import { printNode } from "@/components/receipt/printReceipt";
import { CashMoveDialog } from "@/components/shift/CashMoveDialog";
import { CashMovementList } from "@/components/shift/CashMovementList";
import { ClosePanel } from "@/components/shift/ClosePanel";
import { DayBoundaryBanner } from "@/components/shift/DayBoundaryBanner";
import { ShiftTotalsCards } from "@/components/shift/ShiftTotalsCards";
import { ZReportView } from "@/components/shift/ZReportView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { crossedDayBoundary } from "@/lib/day-boundary";
import { nowIso } from "@/lib/time";
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";
import { useSettingsStore } from "@/state/settings";
import { useShiftStore } from "@/state/shift";

export default function ShiftPage() {
  const router = useRouter();
  const business = useCatalogStore((s) => s.catalog?.business ?? null);
  const branchCode = usePairingStore((s) => s.branch?.code ?? "");
  const terminalCode = usePairingStore((s) => s.terminalCode ?? "");
  const paperWidth = useSettingsStore((s) => s.paperWidth);
  const shift = useShiftStore((s) => s.shift);
  const closeShift = useShiftStore((s) => s.close);
  const heldCarts = useCartStore((s) => s.heldCarts);

  const [totals, setTotals] = useState<ShiftTotals | null>(null);
  const [countedCashC, setCountedCashC] = useState<number | null>(null);
  const [cashMove, setCashMove] = useState<"in" | "out" | null>(null);
  const [z, setZ] = useState<ZReport | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTotals = useCallback(async () => {
    if (!useShiftStore.getState().shift) return;
    try {
      setTotals(await getApi().getShiftTotals());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load shift totals");
    }
  }, []);

  useEffect(() => {
    void loadTotals();
  }, [loadTotals, shift]);

  async function handleClose() {
    if (countedCashC === null || busy) return;
    setBusy(true);
    try {
      setZ(await closeShift(countedCashC));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not close the shift");
    } finally {
      setBusy(false);
    }
  }

  if (z) {
    return (
      <main className="flex h-dvh flex-col bg-surface">
        <TopBar active="shift" />
        <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-6 md:flex-row">
          <Card className="w-[320px] max-w-full p-5">
            <ZReportView z={z} />
          </Card>
          <div className="flex w-[280px] max-w-full flex-col gap-3">
            <Button size="lg" className="h-[52px]" onClick={() => printNode(<ZReportView z={z} />, paperWidth)}>
              Print Z
            </Button>
            <Button size="lg" variant="secondary" className="h-[52px]" onClick={() => router.replace("/shift-open")}>
              Done
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // A synthesized Z with counted = expected gives the live preview the same component as the real one.
  const preview: ZReport | null =
    shift && totals
      ? {
          ...totals,
          shiftId: shift.id,
          openedAt: shift.openedAt,
          closedAt: nowIso(),
          openingCashC: shift.openingCashC,
          countedCashC: countedCashC ?? totals.expectedCashC,
          overShortC: (countedCashC ?? totals.expectedCashC) - totals.expectedCashC,
          branchCode,
          terminalCode,
        }
      : null;

  const nagging =
    shift && business ? crossedDayBoundary(shift.openedAt, business.dayStartTime, nowIso()) : false;

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="shift" />
      {nagging && business && <DayBoundaryBanner dayStartTime={business.dayStartTime} />}

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          {totals && <ShiftTotalsCards totals={totals} />}

          <CashMovementList
            movements={shift?.cashMovements ?? []}
            onCashIn={() => setCashMove("in")}
            onCashOut={() => setCashMove("out")}
          />

          {shift && totals && (
            <ClosePanel
              totals={totals}
              openingCashC={shift.openingCashC}
              heldCount={heldCarts.length}
              countedCashC={countedCashC}
              onCountedChange={setCountedCashC}
              onClose={handleClose}
              busy={busy}
            />
          )}
        </div>

        {preview && (
          <Card className="h-fit w-[320px] max-w-full flex-none p-5">
            <ZReportView z={preview} preview />
          </Card>
        )}
      </div>

      <CashMoveDialog type={cashMove ?? "in"} open={cashMove !== null} onClose={() => setCashMove(null)} />
    </main>
  );
}
