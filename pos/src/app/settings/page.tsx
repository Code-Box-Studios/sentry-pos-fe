"use client";

import { TopBar } from "@/components/chrome/TopBar";

export default function SettingsPage() {
  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="settings" />
      <div className="p-6 text-steel">Settings screen</div>
    </main>
  );
}
