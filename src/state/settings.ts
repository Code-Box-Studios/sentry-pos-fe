import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaperWidth = "58" | "80";

interface SettingsState {
  paperWidth: PaperWidth;
  setPaperWidth(w: PaperWidth): void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      paperWidth: "80",
      setPaperWidth: (w) => set({ paperWidth: w }),
    }),
    { name: "sentry-pos:settings" }
  )
);
