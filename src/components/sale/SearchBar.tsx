"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar({
  value,
  onChange,
  onMisc,
  allowMisc,
  autoFocus = false,
}: {
  value: string;
  onChange(v: string): void;
  onMisc?(): void;
  allowMisc: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // Retail opens barcode/search-forward; F&B stays grid-forward (pos-spec §4).
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-stone">
          ⌕
        </span>
        <Input
          ref={ref}
          type="search"
          aria-label="Search products"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search name or SKU — scanner adds instantly"
          className="h-11 pl-9 text-[15px]"
        />
      </div>
      {allowMisc && (
        <Button
          variant="secondary"
          className="h-11 border-dashed border-hairline-strong px-5"
          onClick={onMisc}
        >
          + Misc item
        </Button>
      )}
    </div>
  );
}
