/**
 * The one basket every mockup on this page rings up.
 *
 * These are not decorative numbers. They are the cart asserted in `pos/src/domain/totals.test.ts`
 * ("design cart, spec-correct") — a dine-in order at 12% VAT-inclusive pricing with a 5% service
 * charge, run through the terminal's own totals engine:
 *
 *     Iced Latte — Large + oat  145.00 + 25.00 = 170.00
 *     Pan de sal × 6 @ 12.00                   =  72.00
 *     Ensaymada × 2 @ 55.00                    = 110.00, less Merienda 10% = −11.00
 *     Jasmine rice 0.750 kg @ 95.00/kg         =  71.25
 *     subtotal 423.25 · discounted 412.25 · service charge 20.61 · total 432.86 · VAT 46.38
 *
 * `design/landing.dc.html` drops the Ensaymada line but keeps its Merienda discount, so the artwork
 * shows ₱444.41 over lines that sum to ₱302.25. On a page whose whole argument is that the numbers
 * are right, a column that does not add up is the first thing a reader checks — so the shipped page
 * uses what the software actually computes, and every mockup reads it from here.
 */

export type DemoLine = {
  /** As the terminal's cart panel writes it. */
  text: string;
  /** Abbreviated for the narrow tablet mockup, where the cart column is ~130px wide. */
  short?: string;
  amount: string;
  discount?: boolean;
};

export const DEMO_LINES: DemoLine[] = [
  { text: "1 × Iced Latte — Large, oat", short: "1 × Iced Latte — L, oat", amount: "170.00" },
  { text: "6 × Pan de sal", amount: "72.00" },
  { text: "2 × Ensaymada", amount: "110.00" },
  { text: "Merienda 10%", amount: "−11.00", discount: true },
  { text: "0.750 kg Jasmine rice", amount: "71.25" },
  { text: "Service charge 5%", amount: "20.61" },
];

/** Four item lines; the discount and the service charge are not lines of their own. */
export const DEMO_LINE_COUNT = 4;

export const DEMO_TOTAL = "₱432.86";
export const DEMO_VAT_INCLUDED = "₱46.38";
