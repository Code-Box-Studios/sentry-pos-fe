"use client";

/** Shifts never auto-close; the banner nags once the business day has rolled over (pos-spec §8). */
export function DayBoundaryBanner({ dayStartTime }: { dayStartTime: string }) {
  return (
    <div className="flex items-center gap-2 bg-warn-bg px-6 py-2.5 text-[13px] font-semibold text-warn-text">
      ⚠ The business day ended at {dayStartTime} with this shift still open. Close it when the drawer is
      counted — shifts never auto-close.
    </div>
  );
}
