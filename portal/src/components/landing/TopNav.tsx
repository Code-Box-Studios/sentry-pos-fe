"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type NavLink = { label: string; href: string };

/**
 * Rides the hero band transparent, then turns into a white bar once the page scrolls past it.
 *
 * Both logo marks render at once and cross-fade rather than swapping the `src`: the reverse mark is
 * only needed for the first 24px of scroll, and fetching the dark one at that moment shows a gap.
 */
export function TopNav({
  links,
  signInLabel,
  signInHref,
}: {
  links: NavLink[];
  signInLabel: string;
  signInHref: string;
}) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const sync = () => setSolid(window.scrollY > 24);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-[72px] items-center border-b px-6 transition-[background-color,border-color,box-shadow] duration-250 md:px-8 ${
        solid
          ? "border-hairline bg-canvas shadow-[0_2px_12px_0_rgba(0,30,43,0.06)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex w-full max-w-[1280px] items-center gap-5 lg:gap-7">
        <a href="#top" className="flex items-center gap-[9px]" aria-label="Sentry — back to top">
          <span className="relative block size-7">
            <Image
              src="/brand/sentry-mark-reverse.svg"
              alt=""
              width={28}
              height={28}
              priority
              className={`absolute inset-0 transition-opacity duration-250 ${solid ? "opacity-0" : "opacity-100"}`}
            />
            <Image
              src="/brand/sentry-mark.svg"
              alt=""
              width={28}
              height={28}
              priority
              className={`absolute inset-0 transition-opacity duration-250 ${solid ? "opacity-100" : "opacity-0"}`}
            />
          </span>
          <span
            className={`text-xl font-semibold tracking-[-0.4px] transition-colors duration-250 ${
              solid ? "text-ink" : "text-white"
            }`}
          >
            Sentry
          </span>
        </a>

        <div className="flex-1" />

        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`hidden text-sm font-medium no-underline transition-colors duration-250 md:block ${
              solid ? "text-slate hover:text-ink" : "text-white/85 hover:text-white"
            }`}
          >
            {link.label}
          </a>
        ))}

        <span
          aria-hidden
          className={`hidden h-[22px] w-px transition-colors duration-250 md:block ${
            solid ? "bg-hairline" : "bg-white/24"
          }`}
        />

        <a
          href={signInHref}
          className="bg-brand-green text-ink hover:bg-brand-green-hover rounded-full px-[22px] py-2.5 text-sm font-semibold whitespace-nowrap no-underline transition hover:-translate-y-px hover:text-ink"
        >
          {signInLabel}
        </a>
      </nav>
    </header>
  );
}
