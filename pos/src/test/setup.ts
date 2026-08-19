import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * jsdom ships no matchMedia. Back it with window.innerWidth so responsive components can be driven
 * from tests by setting the width and firing a resize.
 */
const listeners = new Set<{ query: string; notify(): void }>();

function evaluate(query: string): boolean {
  const max = /max-width:\s*(\d+)px/.exec(query);
  const min = /min-width:\s*(\d+)px/.exec(query);
  if (max && window.innerWidth > Number(max[1])) return false;
  if (min && window.innerWidth < Number(min[1])) return false;
  return true;
}

window.matchMedia = (query: string): MediaQueryList => {
  const handlers = new Set<(e: MediaQueryListEvent) => void>();
  const entry = {
    query,
    notify() {
      const event = { matches: evaluate(query), media: query } as MediaQueryListEvent;
      for (const handler of handlers) handler(event);
    },
  };
  listeners.add(entry);

  return {
    get matches() {
      return evaluate(query);
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, handler: (e: MediaQueryListEvent) => void) => {
      handlers.add(handler);
    },
    removeEventListener: (_type: string, handler: (e: MediaQueryListEvent) => void) => {
      handlers.delete(handler);
    },
    addListener: (handler: (e: MediaQueryListEvent) => void) => {
      handlers.add(handler);
    },
    removeListener: (handler: (e: MediaQueryListEvent) => void) => {
      handlers.delete(handler);
    },
    dispatchEvent: () => true,
  } as MediaQueryList;
};

window.addEventListener("resize", () => {
  for (const entry of listeners) entry.notify();
});

/** Sets the viewport width and lets every live media query re-evaluate. */
export function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  window.dispatchEvent(new Event("resize"));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
