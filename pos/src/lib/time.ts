const TZ = "Asia/Manila";

/** ICU emits U+202F/U+00A0 before the day period in some builds; normalize to a plain space. */
function normalizeSpaces(s: string): string {
  return s.replace(/[  ]/g, " ");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatManilaTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function formatManilaTime12(iso: string): string {
  return normalizeSpaces(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso))
  );
}

export function formatManilaDateTime(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(d);
  return `${date} ${formatManilaTime(iso)}`;
}

export function manilaDateKey(iso: string): string {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
