"use client";

import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/domain/types";

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "other", label: "Other" },
];

/** One method per sale in MVP — split payments are a later phase (pos-spec §5). */
export function MethodPills({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange(m: PaymentMethod): void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {PAYMENT_METHODS.map((m) => (
        <Button
          key={m.value}
          variant={m.value === value ? "dark" : "secondary"}
          className={m.value === value ? "px-6" : "border-hairline bg-white px-6"}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </Button>
      ))}
    </div>
  );
}
