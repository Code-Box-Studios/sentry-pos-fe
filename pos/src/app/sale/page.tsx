"use client";

import { TopBar } from "@/components/chrome/TopBar";

export default function SalePage() {
  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="sale" />
      <div className="p-6 text-steel">Sale screen</div>
    </main>
  );
}
