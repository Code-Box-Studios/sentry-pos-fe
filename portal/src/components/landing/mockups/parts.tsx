/**
 * Shared pieces of the product mockups.
 *
 * Everything in this folder is an illustration of Sentry, hand-built rather than screenshotted, so
 * the marketing page can show the product before there is a portal to photograph. The figures are
 * the same demo business the POS seeds — Kape Diaria, its two branches, its catalogue — so the page
 * and the app tell one story.
 */

/** The three window dots on a mockup's chrome. */
export function WindowDots({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <div aria-hidden className="flex gap-1.5 px-1 pb-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`size-2.5 rounded-full ${tone === "dark" ? "bg-white/20" : "bg-hairline"}`}
        />
      ))}
    </div>
  );
}

/** A live/attention dot. Green pulses; the other tones sit still. */
export function StatusDot({
  tone = "live",
  size = 7,
  delay = 0,
}: {
  tone?: "live" | "warn" | "down";
  size?: number;
  delay?: number;
}) {
  const colour =
    tone === "live" ? "bg-brand-green" : tone === "warn" ? "bg-warn-text" : "bg-danger";
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, animationDelay: delay ? `${delay}ms` : undefined }}
      className={`shrink-0 rounded-full ${colour} ${tone === "live" ? "anim-pulse-dot" : ""}`}
    />
  );
}

/**
 * The seven-bar day strip. Heights are percentages of the track; the tallest is the day that won,
 * which is why only it takes the solid green.
 */
export function DayBars({
  heights,
  className = "h-[30px]",
  animate = true,
}: {
  heights: number[];
  className?: string;
  animate?: boolean;
}) {
  const peak = Math.max(...heights);
  return (
    <div aria-hidden className={`flex items-end gap-[3px] ${className}`}>
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            height: `${h}%`,
            animationDelay: animate ? `${900 + i * 100}ms` : undefined,
          }}
          className={`flex-1 rounded-[2px] ${h === peak ? "bg-brand-green-mid" : "bg-heat-2"} ${
            animate ? "anim-grow-bar" : ""
          }`}
        />
      ))}
    </div>
  );
}

/** Ramp index → token, so a heatmap can be written as a row of small integers. */
export const HEAT = [
  "bg-hairline-soft",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
  "bg-heat-5",
  "bg-brand-green",
] as const;

/** A month grid, seven to a row. `-1` draws a day that has not happened yet. */
export function Heatmap({ days, cell = "h-3" }: { days: number[]; cell?: string }) {
  return (
    <div aria-hidden className="grid grid-cols-7 gap-[3px]">
      {days.map((level, i) => (
        <span
          key={i}
          className={`${cell} rounded-[3px] ${
            level < 0 ? "box-border border border-dashed border-hairline bg-surface" : HEAT[level]
          }`}
        />
      ))}
    </div>
  );
}
