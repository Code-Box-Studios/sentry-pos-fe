/**
 * Stands in for the product shots until the portal dashboard exists. Deliberately abstract — window
 * chrome and blocked-out shapes — so it reads as a placeholder rather than passing itself off as a
 * real screenshot of a screen nobody has built yet.
 */
export function MockupCard({ label, tone = "dark" }: { label: string; tone?: "dark" | "light" }) {
  const dark = tone === "dark";

  return (
    <div
      role="img"
      aria-label={`${label} — product shot placeholder`}
      className={`overflow-hidden rounded-xl border ${
        dark ? "border-white/10 bg-[#02222f]" : "border-hairline bg-canvas"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b px-4 py-3 ${
          dark ? "border-white/10" : "border-hairline"
        }`}
      >
        <span className="size-2.5 rounded-full bg-mist/40" />
        <span className="size-2.5 rounded-full bg-mist/40" />
        <span className="size-2.5 rounded-full bg-mist/40" />
        <span className={`ml-2 text-xs ${dark ? "text-on-dark-quiet" : "text-stone"}`}>{label}</span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 rounded-lg p-4 ${dark ? "bg-white/5" : "bg-surface"}`}
          >
            <span className={`h-2 w-12 rounded-full ${dark ? "bg-white/20" : "bg-hairline-strong"}`} />
            <span className={`h-4 w-20 rounded-full ${dark ? "bg-brand-green/50" : "bg-brand-green/60"}`} />
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 px-5 pb-8" aria-hidden>
        {[38, 62, 45, 78, 54, 88, 66, 40, 72, 50].map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}px` }}
            className={`flex-1 rounded-t ${dark ? "bg-white/10" : "bg-hairline"}`}
          />
        ))}
      </div>
    </div>
  );
}
