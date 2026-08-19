"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/api/errors";
import { StatusStrip } from "@/components/chrome/StatusStrip";
import { MoneyPad } from "@/components/numpad/MoneyPad";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useShiftStore } from "@/state/shift";

export default function ShiftOpenPage() {
  const router = useRouter();
  const open = useShiftStore((s) => s.open);
  const [openingCashC, setOpeningCashC] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleOpen() {
    if (openingCashC === null) return;
    setBusy(true);
    setError(null);
    try {
      await open(openingCashC);
      router.replace("/sale");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the shift");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <StatusStrip />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-[460px] max-w-full gap-6 p-10">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium text-ink">Open a shift</h1>
            <p className="text-sm text-steel">Count the drawer and enter the opening float.</p>
          </div>
          <MoneyPad label="Opening cash" valueC={openingCashC} onChange={setOpeningCashC} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button size="lg" className="w-full" onClick={handleOpen} disabled={busy || openingCashC === null}>
            Open shift
          </Button>
        </Card>
      </div>
    </main>
  );
}
