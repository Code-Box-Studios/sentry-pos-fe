import type { PaperWidth } from "@/state/settings";

/** Wraps printed content in the paper-width class the print stylesheet keys off. */
export function PrintRoot({ paperWidth, children }: React.PropsWithChildren<{ paperWidth: PaperWidth }>) {
  return <div className={paperWidth === "58" ? "print-58" : "print-80"}>{children}</div>;
}
