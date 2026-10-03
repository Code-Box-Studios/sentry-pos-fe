"use client";

import type { ReactNode } from "react";
import { createElement } from "react";
import { flushSync } from "react-dom";
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
  flushSync(() => root.render(createElement(PrintRoot, { paperWidth }, children)));

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    // Unmount on a later tick: React refuses to unmount while it is still rendering.
    setTimeout(() => root.unmount(), 0);
  };
  window.addEventListener("afterprint", cleanup);

  // Wait for hosted branding before the print dialog snapshots the page. A failed or slow
  // image must not prevent the cashier from printing the rest of the receipt.
  const images = Array.from(host.querySelectorAll("img"));
  void Promise.all(images.map((img) => new Promise<void>((resolve) => {
    if (img.complete) { resolve(); return; }
    const finish = () => {
      clearTimeout(timeout);
      img.removeEventListener("load", finish);
      img.removeEventListener("error", finish);
      resolve();
    };
    const timeout = setTimeout(finish, 5000);
    img.addEventListener("load", finish);
    img.addEventListener("error", finish);
  }))).then(() => window.print());
}
