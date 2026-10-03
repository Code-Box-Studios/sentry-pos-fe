"use client";

import { useEffect, useId, useState } from "react";
import { getApi } from "@/api";
import type { ActionApproval, OperatorRosterEntry } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleApiError } from "@/lib/handle-api-error";

export function approvalReady(value: ActionApproval | null): value is ActionApproval {
  return !!value?.approverUserId && /^\d{6}$/.test(value.pin);
}

/** One action only. This form never unlocks or changes the active operator. */
export function ActionApprovalForm({ value, onChange, disabled = false }: {
  value: ActionApproval | null;
  onChange(value: ActionApproval | null): void;
  disabled?: boolean;
}) {
  const id = useId();
  const [roster, setRoster] = useState<OperatorRosterEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getApi().listOperators().then((people) => {
      if (!cancelled) setRoster(people.filter((person) => person.role !== "cashier" && !person.requiresSetup));
    }).catch((cause: unknown) => {
      if (cancelled) return;
      try { handleApiError(cause); } catch { /* Show the local actionable error below. */ }
      setError(cause instanceof Error ? cause.message : "Could not load approvers");
    });
    return () => { cancelled = true; };
  }, []);
  return <section className="flex flex-col gap-3 rounded-xl border border-hairline bg-hairline-soft p-4">
    <p className="text-sm font-semibold text-ink">Manager or owner approval</p>
    <p className="text-xs text-steel">Select the person approving in person. Their PIN authorizes only this action; the drawer stays with its operator.</p>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-person`}>Approver</Label>
      <select id={`${id}-person`} className="h-11 w-full rounded-full border border-hairline bg-white px-4 text-sm text-ink" value={value?.approverUserId ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value ? { approverUserId: event.target.value, pin: "" } : null)}>
        <option value="">Select a manager or owner</option>
        {roster.map((person) => <option key={person.userId} value={person.userId}>{person.name} · {person.role === "owner" ? "Owner" : "Manager"}</option>)}
      </select>
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-pin`}>Approver PIN</Label>
      <Input id={`${id}-pin`} type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={value?.pin ?? ""} disabled={disabled || !value?.approverUserId} onChange={(event) => value && onChange({ ...value, pin: event.target.value.replace(/\D/g, "").slice(0, 6) })} />
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </section>;
}
