"use client";

import { useEffect, useRef } from "react";

type Tag = "div" | "article" | "section" | "li" | "ul" | "h2" | "h3" | "p";

type RevealProps = {
  as?: Tag;
  /** Stagger within a row, in milliseconds. Matches data-reveal-delay in the design file. */
  delay?: number;
  className?: string;
  id?: string;
  children?: React.ReactNode;
};

/**
 * Fades an element up the first time it crosses into view, then stops watching it.
 *
 * The resting state (opacity 0, nudged down) is CSS on `[data-reveal]`, so it ships in the server
 * HTML and there is no flash of un-revealed content on load. That does mean the element depends on
 * JS to become visible — the <noscript> block in the layout un-hides everything, and the
 * reduced-motion query neutralises the whole mechanism.
 *
 * This renders *as* the element it reveals rather than wrapping it: several call sites are grid or
 * flex children, and an extra wrapper div would change their layout.
 */
export function Reveal({ as: Tag = "div", delay = 0, className, id, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.reveal = "shown";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      // The design triggers at 40px above the fold; the negative bottom margin is the same idea.
      { rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — one ref type per tag, and every tag here is an HTMLElement.
      ref={ref}
      id={id}
      data-reveal=""
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
