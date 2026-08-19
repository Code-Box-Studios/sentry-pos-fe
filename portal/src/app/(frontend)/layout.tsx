import type { Metadata } from "next";
import { Figtree, Source_Code_Pro } from "next/font/google";
import { getLandingContent } from "@/lib/landing";
import "../globals.css";

// design-spec names Euclid Circular A, whose licensing is pending; Figtree is the stand-in the
// terminal already ships (landing-spec §6). Source Code Pro carries every peso figure, the same way
// it does at the counter.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-scp",
  weight: ["400", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getLandingContent();
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
    },
  };
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Scroll reveals rest at opacity 0 so there is no flash before the observer runs. Without
            JS that observer never runs, so un-hide the lot rather than serve a blank page. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className={`${figtree.variable} ${sourceCodePro.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
