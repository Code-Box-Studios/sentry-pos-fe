import { qtyToMilli, milliToQty, formatQty, mulQtyPriceC } from "./qty";

test("qtyToMilli/milliToQty round-trip at 3dp", () => {
  expect(qtyToMilli(0.75)).toBe(750);
  expect(qtyToMilli(23.45)).toBe(23450);
  expect(milliToQty(750)).toBe(0.75);
});
test("qtyToMilli rejects >3dp", () => {
  expect(() => qtyToMilli(0.7501)).toThrow();
});
test("formatQty", () => {
  expect(formatQty(6, "unit")).toBe("6");
  expect(formatQty(0.75, "weight")).toBe("0.750");
});
test("weight line total rounds half-up per line", () => {
  expect(mulQtyPriceC(0.75, 9500)).toBe(7125); // 0.750 kg × ₱95.00
  expect(mulQtyPriceC(6, 1200)).toBe(7200);
});
