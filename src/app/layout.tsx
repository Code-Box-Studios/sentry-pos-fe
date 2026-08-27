import type { Metadata } from "next";
import { Figtree, Source_Code_Pro } from "next/font/google";
import { TerminalGate } from "@/components/chrome/TerminalGate";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", weight: ["400", "500", "600", "700"] });
const sourceCodePro = Source_Code_Pro({ subsets: ["latin"], variable: "--font-scp", weight: ["400", "600"] });

export const metadata: Metadata = { title: "Sentry POS" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} ${sourceCodePro.variable} font-sans bg-surface text-ink antialiased`}>
        <TerminalGate>{children}</TerminalGate>
        <Toaster theme="light" position="top-center" />
        <div id="print-root" />
      </body>
    </html>
  );
}
