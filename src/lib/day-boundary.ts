/** Manila is UTC+8 year round — no DST to reason about (project-spec §7). */
const MANILA_OFFSET_HOURS = 8;

function manilaDateParts(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .split("-")
    .map(Number);
  return { year: year!, month: month!, day: day! };
}

/**
 * True once the business day rolled over with the shift still open. Shifts never auto-close — this
 * only drives the nag banner (pos-spec §8).
 */
export function crossedDayBoundary(openedAtIso: string, dayStartTime: string, nowIso: string): boolean {
  const [hours, minutes] = dayStartTime.split(":").map(Number);
  const { year, month, day } = manilaDateParts(nowIso);

  // The day-start instant on today's Manila date, expressed as UTC.
  let boundary = Date.UTC(year, month - 1, day, (hours ?? 0) - MANILA_OFFSET_HOURS, minutes ?? 0);
  const now = Date.parse(nowIso);
  // Before today's boundary, the most recent one was yesterday's.
  if (boundary > now) boundary -= 24 * 60 * 60 * 1000;

  return Date.parse(openedAtIso) < boundary && now >= boundary;
}
