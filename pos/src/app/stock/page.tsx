"use client";

import { TopBar } from "@/components/chrome/TopBar";

export default function StockPage() {
  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="stock" />
      <div className="p-6 text-steel">Stock screen</div>
    </main>
  );
}
