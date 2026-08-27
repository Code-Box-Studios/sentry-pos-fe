import { createWedgeBuffer } from "./barcode";

const onScan = vi.fn();
beforeEach(() => onScan.mockClear());

/** Feeds a code at scanner speed (10 ms between keys) starting at `from`. */
function scan(buffer: ReturnType<typeof createWedgeBuffer>, code: string, from = 1000): number {
  let at = from;
  for (const ch of code) {
    buffer.feed(ch, at);
    at += 10;
  }
  buffer.feed("Enter", at);
  return at + 10;
}

test("a fast digit burst closed by Enter is a scan", () => {
  const buffer = createWedgeBuffer({ onScan });
  scan(buffer, "4800888000015");
  expect(onScan).toHaveBeenCalledExactlyOnceWith("4800888000015");
});

test("each scan fires once, so a repeat scan is two events", () => {
  const buffer = createWedgeBuffer({ onScan });
  const next = scan(buffer, "4800888000015");
  scan(buffer, "4800888000015", next + 500);
  expect(onScan).toHaveBeenCalledTimes(2);
  expect(onScan).toHaveBeenLastCalledWith("4800888000015");
});

test("a human-speed gap restarts the buffer with the new key", () => {
  const buffer = createWedgeBuffer({ onScan });
  buffer.feed("1", 1000);
  buffer.feed("2", 1010);
  buffer.feed("3", 3000); // long pause — the earlier digits were not part of this code
  buffer.feed("4", 3010);
  buffer.feed("5", 3020);
  buffer.feed("6", 3030);
  buffer.feed("Enter", 3040);
  expect(onScan).toHaveBeenCalledExactlyOnceWith("3456");
});

test("a code shorter than the minimum is ignored", () => {
  const buffer = createWedgeBuffer({ onScan });
  scan(buffer, "123");
  expect(onScan).not.toHaveBeenCalled();
});

test("a letter means someone is typing, so the buffer clears", () => {
  const buffer = createWedgeBuffer({ onScan });
  buffer.feed("1", 1000);
  buffer.feed("2", 1010);
  buffer.feed("a", 1020);
  buffer.feed("3", 1030);
  buffer.feed("4", 1040);
  buffer.feed("Enter", 1050);
  expect(onScan).not.toHaveBeenCalled();
});

test("Enter on an empty buffer does nothing", () => {
  const buffer = createWedgeBuffer({ onScan });
  buffer.feed("Enter", 1000);
  expect(onScan).not.toHaveBeenCalled();
});

test("thresholds are configurable", () => {
  const buffer = createWedgeBuffer({ onScan, minLength: 2, maxGapMs: 200 });
  buffer.feed("7", 1000);
  buffer.feed("8", 1150); // inside the wider gap
  buffer.feed("Enter", 1160);
  expect(onScan).toHaveBeenCalledExactlyOnceWith("78");
});

test("reset drops a partial code", () => {
  const buffer = createWedgeBuffer({ onScan });
  buffer.feed("1", 1000);
  buffer.feed("2", 1010);
  buffer.reset();
  buffer.feed("3", 1020);
  buffer.feed("4", 1030);
  buffer.feed("5", 1040);
  buffer.feed("6", 1050);
  buffer.feed("Enter", 1060);
  expect(onScan).toHaveBeenCalledExactlyOnceWith("3456");
});
