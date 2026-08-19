import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { getLandingContent } from "@/lib/landing";
import "../globals.css";

// design-spec names Euclid Circular A, whose licensing is pending; Figtree is the stand-in the
// terminal already ships (landing-spec §6).
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
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
      <body className={`${figtree.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
