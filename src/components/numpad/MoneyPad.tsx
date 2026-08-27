"use client";

import { useEffect, useRef, useState } from "react";
import { formatC, parsePesoInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Numpad, type NumpadKey } from "./Numpad";

function rawFromValue(valueC: number | null): string {
  return valueC === null ? "" : (valueC / 100).toFixed(2);
}

function group(whole: string): string {
  return whole === "" ? "0" : Number(whole).toLocaleString("en-PH");
}

/**
 * Whole-peso entry formats to full centavos ("2000" → "2,000.00"), but once a decimal point is keyed
 * the typed digits show verbatim — otherwise backspacing a trailing zero looks like a dead key.
 */
function displayFor(raw: string): string {
  if (raw === "") return formatC(0);
  const parsed = parsePesoInput(raw);
  if (!raw.includes(".")) return parsed === null ? group(raw) : formatC(parsed);
  const [whole = "", decimals = ""] = raw.split(".");
  return `${group(whole)}.${decimals}`;
}

/** Keyed peso entry: an amount display over the numpad, centavo-exact throughout. */
export function MoneyPad({
  valueC,
  onChange,
  label,
  className,
}: {
  valueC: number | null;
  onChange(c: number | null): void;
  label?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState(() => rawFromValue(valueC));
  // Remembers what we last told the parent so an external set (quick-tender pills) resyncs the keys.
  const emitted = useRef<number | null>(valueC);

  useEffect(() => {
    if (valueC !== emitted.current) {
      emitted.current = valueC;
      setRaw(rawFromValue(valueC));
    }
  }, [valueC]);

  function press(key: NumpadKey) {
    let next = raw;
    if (key === "back") next = raw.slice(0, -1);
    else if (key === ".") next = raw.includes(".") ? raw : raw === "" ? "0." : `${raw}.`;
    else {
      const [, decimals] = raw.split(".");
      if (decimals !== undefined && decimals.length >= 2) return;
      next = raw === "0" ? key : raw + key;
    }
    setRaw(next);
    const parsed = next === "" ? null : parsePesoInput(next);
    emitted.current = parsed;
    onChange(parsed);
  }

  const display = displayFor(raw);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label && <div className="text-[13px] font-semibold text-ink">{label}</div>}
      <output
        aria-label={label ?? "Amount"}
        className="flex h-14 items-center rounded-[8px] border-2 border-green-dark px-4 font-mono text-2xl font-semibold text-ink"
      >
        ₱{display}
      </output>
      <Numpad onKey={press} />
    </div>
  );
}
