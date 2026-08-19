"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";

/**
 * One terminal, one branch: an unpaired device can only reach /pair, and a paired one never sees it
 * again (pos-spec §3).
 */
export function TerminalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = usePairingStore((s) => s.status);
  const hydrated = usePairingStore((s) => s.hydrated);
  const refresh = useCatalogStore((s) => s.refresh);
  const refreshedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (status === "unpaired") {
      if (pathname !== "/pair") router.replace("/pair");
      return;
    }
    if (pathname === "/pair" || pathname === "/") router.replace("/sale");
  }, [hydrated, status, pathname, router]);

  useEffect(() => {
    if (!hydrated || status !== "paired") return;
    const token = usePairingStore.getState().deviceToken;
    if (!token || refreshedFor.current === token) return;
    refreshedFor.current = token;
    void refresh();
  }, [hydrated, status, refresh]);

  // One null frame while the persisted pairing rehydrates keeps /pair from flashing.
  if (!hydrated) return null;
  return <>{children}</>;
}
