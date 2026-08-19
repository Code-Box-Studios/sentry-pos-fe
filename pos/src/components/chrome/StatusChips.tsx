"use client";

import { useEffect, useState } from "react";
import type { Shift } from "@/api/types";
import { formatManilaTime12 } from "@/lib/time";
import { cn } from "@/lib/utils";

function Chip({ tone, label }: { tone: "green" | "amber"; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[13px] font-medium",
        tone === "green" ? "text-green-dark" : "text-steel"
      )}
    >
      <div className={cn("size-2 rounded-full", tone === "green" ? "bg-brand-green" : "bg-warn-text")} />
      <span>{label}</span>
    </div>
  );
}

/** The persistent status strip: shift state and connection (pos-spec §10). */
export function StatusChips({ shift = null }: { shift?: Shift | null }) {
  // Starts optimistic so the prerendered HTML and the first client frame agree.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <>
      {shift ? (
        <Chip tone="green" label={`Shift open · ${formatManilaTime12(shift.openedAt)}`} />
      ) : (
        <Chip tone="amber" label="No shift open" />
      )}
      <Chip tone={online ? "green" : "amber"} label={online ? "Online" : "Offline"} />
    </>
  );
}
