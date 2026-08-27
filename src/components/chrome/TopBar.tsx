"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePairingStore } from "@/state/pairing";
import { StatusChips } from "./StatusChips";

export type TopBarTab = "sale" | "history" | "shift" | "stock" | "settings";

const NAV: Array<{ tab: TopBarTab; label: string; href: string }> = [
  { tab: "sale", label: "Sale", href: "/sale" },
  { tab: "history", label: "History", href: "/history" },
  { tab: "shift", label: "Shift", href: "/shift" },
  { tab: "stock", label: "Stock", href: "/stock" },
  { tab: "settings", label: "Settings", href: "/settings" },
];

export function TopBar({ active }: { active: TopBarTab }) {
  const business = usePairingStore((s) => s.business);
  const branch = usePairingStore((s) => s.branch);
  const terminalCode = usePairingStore((s) => s.terminalCode);

  return (
    <header className="flex h-[52px] flex-none items-center gap-3 border-b border-hairline bg-white px-3 sm:gap-5 sm:px-5">
      <Image src="/brand/sentry-mark.svg" alt="Sentry" width={24} height={24} className="size-6" priority />
      <nav className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((item) => (
          <Button
            key={item.tab}
            asChild
            size="sm"
            variant={item.tab === active ? "dark" : "ghost"}
            className={item.tab === active ? "rounded-full" : "rounded-full text-steel"}
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
      </nav>
      <div className="hidden flex-1 sm:block" />
      {business?.isDemo && <Badge variant="warn" className="tracking-widest">DEMO</Badge>}
      <div className="hidden font-mono text-[13px] font-semibold text-slate sm:block">
        {branch?.code ?? "—"} · {terminalCode ?? "—"}
      </div>
      <StatusChips />
    </header>
  );
}
