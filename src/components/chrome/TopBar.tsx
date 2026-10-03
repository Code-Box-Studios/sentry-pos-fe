"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApi } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePairingStore } from "@/state/pairing";
import { useOperatorStore } from "@/state/operator";
import { StatusChips } from "./StatusChips";

export type TopBarTab = "sale" | "history" | "shift" | "stock" | "settings" | "activity";

const NAV: Array<{ tab: TopBarTab; label: string; href: string }> = [
  { tab: "sale", label: "Sale", href: "/sale" },
  { tab: "history", label: "History", href: "/history" },
  { tab: "shift", label: "Shift", href: "/shift" },
  { tab: "stock", label: "Stock", href: "/stock" },
  { tab: "settings", label: "Settings", href: "/settings" },
];

export function TopBar({ active }: { active: TopBarTab }) {
  const router = useRouter();
  const operator = useOperatorStore((s) => s.operator);
  const business = usePairingStore((s) => s.business);
  const branch = usePairingStore((s) => s.branch);
  const terminalCode = usePairingStore((s) => s.terminalCode);
  const items = [...NAV, { tab: "activity" as const, label: operator?.role === "cashier" ? "My activity" : "Activity", href: "/activity" }];

  function lock() {
    // Send the revocation before clearing its header, but never delay the local privacy lock.
    void getApi().lockOperator().catch(() => {});
    useOperatorStore.getState().lock();
    router.replace("/unlock");
  }

  return (
    <header className="flex h-[52px] flex-none items-center gap-3 border-b border-hairline bg-white px-3 sm:gap-5 sm:px-5">
      <Image src="/brand/sentry-mark.svg" alt="Sentry" width={24} height={24} className="size-6" priority />
      <nav className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
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
      {operator && <>
        <div className="hidden max-w-32 shrink-0 truncate text-right text-[13px] font-semibold text-ink lg:block" title={`${operator.name} · ${operator.role}`}>{operator.name}</div>
        <Button variant="secondary" size="sm" className="rounded-full" aria-label="Lock terminal" onClick={lock}>Lock</Button>
      </>}
    </header>
  );
}
