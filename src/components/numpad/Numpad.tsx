"use client";

import { cn } from "@/lib/utils";

export type NumpadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

const KEYS: NumpadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

/** 3×4 tap grid sized for a counter tablet (design 02). */
export function Numpad({
  onKey,
  className,
  decimals = true,
}: {
  onKey(k: NumpadKey): void;
  className?: string;
  decimals?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {KEYS.map((key) => {
        const isBack = key === "back";
        const disabled = key === "." && !decimals;
        return (
          <button
            key={key}
            type="button"
            aria-label={isBack ? "Backspace" : key}
            disabled={disabled}
            onClick={() => onKey(key)}
            className={cn(
              "h-14 rounded-[8px] border border-hairline text-xl font-medium text-ink transition-colors",
              "active:bg-hairline-soft disabled:text-mist",
              isBack && "text-steel"
            )}
          >
            {isBack ? "⌫" : key}
          </button>
        );
      })}
    </div>
  );
}
