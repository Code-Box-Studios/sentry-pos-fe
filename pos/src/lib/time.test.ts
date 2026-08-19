import { formatManilaTime, formatManilaTime12, formatManilaDateTime, manilaDateKey } from "./time";

test("UTC renders as Asia/Manila (+08:00)", () => {
  expect(formatManilaTime("2026-08-19T02:42:00.000Z")).toBe("10:42");
  expect(formatManilaTime12("2026-08-18T23:02:00.000Z")).toBe("7:02 AM");
  expect(formatManilaDateTime("2026-08-19T02:42:00.000Z")).toBe("19 Aug 2026 10:42");
  expect(manilaDateKey("2026-08-18T17:30:00.000Z")).toBe("2026-08-19"); // 01:30 Manila next day
});
