"use client";

import { useState } from "react";
import { getApi } from "@/api";
import type { ActionApproval, ZReport } from "@/api/types";
import { ActionApprovalForm, approvalReady } from "@/components/chrome/ActionApprovalForm";
import { MoneyPad } from "@/components/numpad/MoneyPad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/state/cart";
import { useShiftStore } from "@/state/shift";
import { handleApiError } from "@/lib/handle-api-error";
import { ZReportView } from "./ZReportView";
import { printNode } from "@/components/receipt/printReceipt";
import { useSettingsStore } from "@/state/settings";

export function EmergencyCloseDialog({ onClose }: { onClose(): void }) {
  const [counted, setCounted] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [approval, setApproval] = useState<ActionApproval | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [z, setZ] = useState<ZReport | null>(null);
  const pending = useCartStore((state) => state.pendingDraft);
  const held = useCartStore((state) => state.heldCarts);
  const cart = useCartStore((state) => state.cart);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const blocked = !!pending || held.length > 0 || cart.lines.length > 0;
  async function submit() {
    if (blocked || busy || counted === null || !reason.trim() || !approvalReady(approval)) return;
    setBusy(true); setError(null);
    try {
      const report = await getApi().emergencyCloseShift({ countedCashC: counted, reason: reason.trim(), approval });
      setApproval(null); setZ(report);
      useShiftStore.setState({ shift: null, hydrated: true });
    } catch (cause) {
      setApproval((value) => value ? { ...value, pin: "" } : null);
      try { handleApiError(cause); } catch { /* PIN/recovery failure stays inline. */ }
      setError(cause instanceof Error ? cause.message : "Could not close this drawer");
    } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => !open && !busy && onClose()}><DialogContent className="max-h-[90dvh] gap-4 overflow-y-auto rounded-xl sm:max-w-[480px]">
    <DialogHeader><DialogTitle>Emergency close</DialogTitle><p className="text-sm text-steel">Only for an unavailable operator or a legacy drawer. The original attribution stays intact; this does not unlock a replacement operator.</p></DialogHeader>
    {z ? <><ZReportView z={z} /><Button onClick={() => printNode(<ZReportView z={z} />, useSettingsStore.getState().paperWidth)}>Print Z</Button><Button variant="secondary" onClick={onClose}>Done</Button></> : <>
      {blocked && <div className="rounded-lg bg-warn-bg p-3 text-sm text-warn-text">Complete or explicitly discard unsubmitted carts before closing. An unresolved payment must be checked first.
        {!pending && !confirmDiscard && <Button size="sm" variant="secondary" className="mt-2" onClick={() => setConfirmDiscard(true)}>Discard unsubmitted carts</Button>}
        {!pending && confirmDiscard && <Button size="sm" variant="outline-destructive" className="mt-2" onClick={() => { useCartStore.getState().resetAll(); setConfirmDiscard(false); }}>Confirm discard of all unsubmitted carts</Button>}
      </div>}
      <MoneyPad label="Counted cash" valueC={counted} onChange={setCounted} />
      <label className="flex flex-col gap-2 text-sm font-medium">Emergency close reason<Input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></label>
      <ActionApprovalForm value={approval} onChange={setApproval} disabled={busy} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button disabled={blocked || busy || counted === null || !reason.trim() || !approvalReady(approval)} onClick={submit}>Submit counted close</Button>
    </>}
  </DialogContent></Dialog>;
}
