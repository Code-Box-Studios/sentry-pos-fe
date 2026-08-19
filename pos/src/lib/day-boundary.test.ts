import { crossedDayBoundary } from "./day-boundary";

test("shift opened before 04:00 boundary nags after it", () => {
  // Manila 03:00 open (19:00Z prev day), now Manila 05:00 (21:00Z prev day) → crossed
  expect(crossedDayBoundary("2026-08-18T19:00:00.000Z", "04:00", "2026-08-18T21:00:00.000Z")).toBe(true);
  // opened 07:02 Manila, now 15:00 same day → not crossed
  expect(crossedDayBoundary("2026-08-18T23:02:00.000Z", "04:00", "2026-08-19T07:00:00.000Z")).toBe(false);
  // midnight default boundary
  expect(crossedDayBoundary("2026-08-19T10:00:00.000Z", "00:00", "2026-08-19T17:00:00.000Z")).toBe(true);
});

test("a shift opened after the boundary has not crossed it yet", () => {
  // 04:00 Manila boundary = 20:00Z the day before; opened 05:00 Manila, now 23:00 Manila same day
  expect(crossedDayBoundary("2026-08-18T21:00:00.000Z", "04:00", "2026-08-19T15:00:00.000Z")).toBe(false);
});

test("the boundary is the most recent occurrence, not a fixed calendar day", () => {
  // now is 02:00 Manila on the 20th — before that day's 04:00, so the 19th's 04:00 is the boundary.
  // Opened 02:00 Manila on the 19th, i.e. before it: crossed.
  expect(crossedDayBoundary("2026-08-18T18:00:00.000Z", "04:00", "2026-08-19T18:00:00.000Z")).toBe(true);
  // Opened 05:00 Manila on the 19th, i.e. after that boundary: nothing to nag about yet.
  expect(crossedDayBoundary("2026-08-18T21:00:00.000Z", "04:00", "2026-08-19T18:00:00.000Z")).toBe(false);
});
