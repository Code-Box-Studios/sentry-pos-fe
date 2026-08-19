"use client";

import Image from "next/image";
import { usePairingStore } from "@/state/pairing";
import { StatusChips } from "./StatusChips";

/** The nav-less header used by the pre-sale and payment screens (designs 02, 05, 06). */
export function StatusStrip({ children, chips = true }: { children?: React.ReactNode; chips?: boolean }) {
  const branch = usePairingStore((s) => s.branch);
  const terminalCode = usePairingStore((s) => s.terminalCode);

  return (
    <header className="flex h-[52px] flex-none items-center gap-4 border-b border-hairline bg-white px-5">
      {children ?? <Image src="/brand/sentry-mark.svg" alt="Sentry" width={24} height={24} className="size-6" priority />}
      <div className="flex-1" />
      <div className="font-mono text-[13px] font-semibold text-slate">
        {branch?.code ?? "—"} · {terminalCode ?? "—"}
      </div>
      {chips && <StatusChips />}
    </header>
  );
}
