/**
 * The activity strip under the hero. Sample events, so it is hidden from assistive tech — a screen
 * reader announcing an endless loop of invented transactions helps nobody.
 *
 * The list is rendered twice and translated by exactly -50%, which is what makes the loop seamless.
 * That only holds if the two halves are the same width, so the separating gap is trailing padding
 * inside each half rather than a gap between them.
 */
export function Ticker({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  const run = (key: string) => (
    <div key={key} className="flex shrink-0 gap-10 pr-10">
      {lines.map((line, i) => (
        <span key={i} className="flex shrink-0 gap-10">
          <span>{line}</span>
          <span>·</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      aria-hidden
      className="w-full max-w-[880px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
    >
      <div className="anim-marquee flex w-max py-1.5 font-mono text-xs whitespace-nowrap text-white/44">
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}
