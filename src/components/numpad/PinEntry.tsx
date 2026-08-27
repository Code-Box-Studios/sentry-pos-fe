"use client";

import { Numpad, type NumpadKey } from "./Numpad";
import { cn } from "@/lib/utils";

/** Masked owner-PIN entry — the only PIN in MVP (pos-spec §1). */
export function PinEntry({
  value,
  onChange,
  length = 6,
  disabled = false,
}: {
  value: string;
  onChange(v: string): void;
  length?: number;
  disabled?: boolean;
}) {
  function press(key: NumpadKey) {
    if (disabled) return;
    if (key === "back") onChange(value.slice(0, -1));
    else if (key !== "." && value.length < length) onChange(value + key);
  }

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex gap-2.5" role="status" aria-label={`PIN, ${value.length} of ${length} digits entered`}>
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            className={cn(
              "size-3.5 rounded-full",
              i < value.length ? "bg-ink" : "border border-hairline-strong"
            )}
          />
        ))}
      </div>
      <Numpad onKey={press} decimals={false} className="w-full max-w-[260px]" />
    </div>
  );
}
