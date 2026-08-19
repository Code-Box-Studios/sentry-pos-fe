import { halfUp, pesos, formatC, formatPeso, parsePesoInput, pct, mulRate, vatIncluded } from "./money";

test("halfUp rounds .5 up, away from zero for negatives", () => {
  expect(halfUp(2061.25)).toBe(2061);
  expect(halfUp(2061.5)).toBe(2062);
  expect(halfUp(-10.5)).toBe(-11);
});
test("pesos converts to integer centavos", () => {
  expect(pesos(85)).toBe(8500);
  expect(pesos(0.5)).toBe(50);
});
test("formatC groups thousands", () => {
  expect(formatC(8500)).toBe("85.00");
  expect(formatC(1824050)).toBe("18,240.50");
  expect(formatC(-31000)).toBe("-310.00");
});
test("formatPeso prefixes ₱", () => {
  expect(formatPeso(44441)).toBe("₱444.41");
});
test("parsePesoInput handles keyed amounts", () => {
  expect(parsePesoInput("2000")).toBe(200000);
  expect(parsePesoInput("2,000.50")).toBe(200050);
  expect(parsePesoInput("0.5")).toBe(50);
  expect(parsePesoInput("abc")).toBeNull();
  expect(parsePesoInput("1.234")).toBeNull(); // >2dp of pesos is invalid input
});
test("pct: half-up per spec", () => {
  expect(pct(11000, 10)).toBe(1100);
  expect(pct(41225, 5)).toBe(2061); // 2061.25 rounds down
});
test("vatIncluded extracts 12% from inclusive total", () => {
  expect(vatIncluded(43286, 0.12)).toBe(4638);
  expect(vatIncluded(6071, 0)).toBe(0);
});
test("mulRate", () => {
  expect(mulRate(41225, 0.05)).toBe(2061);
});
