"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getApi } from "@/api";
import type { OperatorRosterEntry } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";
import { useOperatorStore } from "@/state/operator";
import { handleApiError } from "@/lib/handle-api-error";
import { UnauthorizedError } from "@/api/errors";
import { EmergencyCloseDialog } from "@/components/shift/EmergencyCloseDialog";

export function OperatorUnlockScreen() {
  const branch = usePairingStore((state) => state.branch);
  const shift = useShiftStore((state) => state.shift);
  const [roster, setRoster] = useState<OperatorRosterEntry[]>([]);
  const [selected, setSelected] = useState<OperatorRosterEntry | null>(null);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emergency, setEmergency] = useState(false);
  useEffect(() => {
    let active = true;
    void getApi().listOperators().then((rows) => { if (active) setRoster(rows); }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load this branch's operators.");
      if (cause instanceof UnauthorizedError) handleApiError(cause);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const needsSetup = selected?.requiresSetup && selected.role !== "owner";
  const unavailable = !!shift && !loading && !roster.some((person) => person.userId === shift.operatorUserId && !person.requiresSetup);
  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    if (!/^\d{6}$/.test(pin)) { setError("Enter your six-digit PIN."); return; }
    if (needsSetup && (!/^\d{6}$/.test(newPin) || newPin === pin || confirm !== newPin)) {
      setError("Choose a different six-digit PIN and enter it twice."); return;
    }
    setBusy(true); setError(null);
    try {
      const result = needsSetup ? await getApi().setupOperatorPin(selected.userId, pin, newPin) : await getApi().unlockOperator(selected.userId, pin);
      // Load the drawer before publishing the operator so the gate never routes
      // against the stale pre-unlock drawer snapshot.
      await useShiftStore.getState().load(result.token);
      useOperatorStore.getState().unlock(result);
      setPin(""); setNewPin(""); setConfirm("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not unlock."); setPin(""); }
    finally { setBusy(false); }
  }
  const pinField = (id: string, label: string, value: string, change: (value: string) => void) => <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={id}>{label}<Input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={value} onChange={(event) => change(event.target.value.replace(/\D/g, ""))} className="font-mono tracking-[0.25em]" /></label>;
  return <main className="flex min-h-dvh items-center justify-center bg-ink px-4 py-8">
    <div className="flex w-full max-w-[520px] flex-col items-center gap-6">
      <Image src="/brand/sentry-mark-reverse.svg" alt="Sentry" width={56} height={56} priority />
      <div className="text-center"><h1 className="text-[28px] font-medium text-white">Unlock this terminal</h1><p className="mt-2 text-sm text-white/64">{branch?.name ?? "Your branch"} · Choose your name, then enter your personal PIN.</p></div>
      <Card className="w-full gap-5 p-5 sm:p-7">
        {shift && <p className="rounded-lg bg-green-soft p-3 text-sm text-green-dark">This drawer belongs to its original operator. Unlock as that person to resume.</p>}
        {error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger">{error}</p>}
        {loading ? <p className="text-sm text-steel">Loading branch operators…</p> : <div className="grid gap-2 sm:grid-cols-2">{roster.map((person) => <Button key={person.userId} variant={selected?.userId === person.userId ? "dark" : "secondary"} className="h-auto min-h-12 justify-between whitespace-normal py-3 text-left" disabled={busy || !!(shift && shift.operatorUserId !== undefined && shift.operatorUserId !== person.userId)} onClick={() => { setSelected(person); setPin(""); setNewPin(""); setConfirm(""); setError(null); }}><span>{person.name}</span><span className="ml-2 text-xs capitalize opacity-70">{person.role}</span></Button>)}</div>}
        {!loading && !roster.length && <p className="text-sm text-steel">No eligible operators. Ask your business owner to restore branch access.</p>}
        {selected?.role === "owner" && selected.requiresSetup ? <p className="text-sm text-steel">Set your owner PIN in portal settings, then return here. You do not need a staff account.</p> : selected && <form className="flex flex-col gap-4" onSubmit={unlock}>
          {pinField("operator-pin", needsSetup ? "Temporary PIN" : "Your PIN", pin, setPin)}
          {needsSetup && <>{pinField("operator-new-pin", "New terminal PIN", newPin, setNewPin)}{pinField("operator-confirm-pin", "Confirm terminal PIN", confirm, setConfirm)}<p className="text-xs text-steel">Temporary PINs expire after 15 minutes. Ask your owner for a fresh one if needed.</p></>}
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Unlocking…" : needsSetup ? "Set PIN and unlock" : "Unlock terminal"}</Button>
        </form>}
        <p className="text-xs text-steel">Locking keeps the cart, unresolved payment and drawer intact. Reloading always requires your PIN.</p>
        {unavailable && <Button variant="outline-destructive" onClick={() => setEmergency(true)}>Emergency close</Button>}
      </Card>
    </div>
    {emergency && <EmergencyCloseDialog onClose={() => setEmergency(false)} />}
  </main>;
}
