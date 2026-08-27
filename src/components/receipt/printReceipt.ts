"use client";

import type { ReactNode } from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { PaperWidth } from "@/state/settings";
import { PrintRoot } from "./PrintRoot";

/**
 * Printing goes through the browser dialog (pos-spec §6): mount the receipt into #print-root, which
 * the print stylesheet is the only thing to show, then tear it down once the dialog closes.
 */
export function printNode(children: ReactNode, paperWidth: PaperWidth): void {
  const host = document.getElementById("print-root");
  if (!host) return;

  const root = createRoot(host);
  root.render(createElement(PrintRoot, { paperWidth }, children));

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    // Unmount on a later tick: React refuses to unmount while it is still rendering.
    setTimeout(() => root.unmount(), 0);
  };
  window.addEventListener("afterprint", cleanup);

  // Give React a frame to commit before the dialog snapshots the page.
  setTimeout(() => window.print(), 0);
}
