"use client";

import { TopBar } from "@/components/chrome/TopBar";

export default function HistoryPage() {
  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="history" />
      <div className="p-6 text-steel">History screen</div>
    </main>
  );
}
