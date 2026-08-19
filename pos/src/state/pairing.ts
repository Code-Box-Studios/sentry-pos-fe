import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BranchInfo, BusinessSettings } from "@/domain/types";
import type { PairingResult } from "@/api/types";

/** `{branchCode}-{terminalCode}-{seq}`, `DEMO-` prefixed for the demo business (project-spec §5.4). */
export function formatReceiptNo(branchCode: string, terminalCode: string, seq: number, isDemo: boolean): string {
  return `${isDemo ? "DEMO-" : ""}${branchCode}-${terminalCode}-${String(seq).padStart(6, "0")}`;
}

interface PairingState {
  status: "unpaired" | "paired";
  deviceToken: string | null;
  business: BusinessSettings | null;
  branch: BranchInfo | null;
  terminalName: string | null;
  terminalCode: string | null;
  /** Terminal-owned sequence — BIR requires it be per-machine and gap-free. */
  receiptSeq: number;
  hydrated: boolean;
  setHydrated(v: boolean): void;
  pair(r: PairingResult): void;
  unpair(): void;
  /** Formats the CURRENT number without consuming it, so a failed sale never burns one. */
  peekReceiptNo(): string;
  /** Called only after completeSale succeeds. */
  commitReceiptSeq(): void;
}

const EMPTY = {
  status: "unpaired" as const,
  deviceToken: null,
  business: null,
  branch: null,
  terminalName: null,
  terminalCode: null,
  receiptSeq: 1,
};

export const usePairingStore = create<PairingState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      pair: (r) =>
        set({
          status: "paired",
          deviceToken: r.deviceToken,
          business: r.business,
          branch: r.branch,
          terminalName: r.terminalName,
          terminalCode: r.terminalCode,
          receiptSeq: r.receiptSeq,
        }),
      unpair: () => set({ ...EMPTY }),
      peekReceiptNo: () => {
        const { branch, terminalCode, receiptSeq, business } = get();
        return formatReceiptNo(branch?.code ?? "", terminalCode ?? "", receiptSeq, business?.isDemo ?? false);
      },
      commitReceiptSeq: () => set({ receiptSeq: get().receiptSeq + 1 }),
    }),
    {
      name: "sentry-pos:pairing",
      partialize: (s) => ({
        status: s.status,
        deviceToken: s.deviceToken,
        business: s.business,
        branch: s.branch,
        terminalName: s.terminalName,
        terminalCode: s.terminalCode,
        receiptSeq: s.receiptSeq,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);
