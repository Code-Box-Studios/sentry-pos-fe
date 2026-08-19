/** Used sparingly, per landing-spec §1 — one mark per feature card, drawn from the brand palette. */
const PATHS: Record<string, React.ReactNode> = {
  // The counter — a till.
  counter: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
      <path d="M7 13h4" />
    </>
  ),
  // The numbers — a rising series.
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  // The record — an append-only log.
  record: (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M15 3v4h4" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
};

export function FeatureIcon({ name }: { name: string }) {
  return (
    <span className="flex size-11 items-center justify-center rounded-lg bg-brand-green-soft">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-5 text-brand-green-dark"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[name] ?? PATHS.counter}
      </svg>
    </span>
  );
}
