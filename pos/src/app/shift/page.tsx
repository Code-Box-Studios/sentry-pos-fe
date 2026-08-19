"use client";

import { TopBar } from "@/components/chrome/TopBar";

export default function ShiftPage() {
  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="shift" />
      <div className="p-6 text-steel">Shift screen</div>
    </main>
  );
}
