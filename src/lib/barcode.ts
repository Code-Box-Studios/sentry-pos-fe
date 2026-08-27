export interface WedgeOptions {
  minLength?: number;
  maxGapMs?: number;
  onScan(code: string): void;
}

export interface WedgeBuffer {
  feed(key: string, atMs: number): void;
  reset(): void;
}

/**
 * Keyboard-wedge scanners type faster than people do. Digits arriving in a tight burst and closed by
 * Enter are a scan; anything slower or with a stray letter is someone using the keyboard.
 * Timestamps are injected so this stays a pure, testable function (pos-spec §4).
 */
export function createWedgeBuffer(opts: WedgeOptions): WedgeBuffer {
  const minLength = opts.minLength ?? 4;
  const maxGapMs = opts.maxGapMs ?? 80;
  let buffer = "";
  let lastAt: number | null = null;

  function reset(): void {
    buffer = "";
    lastAt = null;
  }

  function feed(key: string, atMs: number): void {
    if (key === "Enter") {
      const code = buffer;
      reset();
      if (code.length >= minLength) opts.onScan(code);
      return;
    }
    if (!/^\d$/.test(key)) {
      reset();
      return;
    }
    const tooSlow = lastAt !== null && atMs - lastAt > maxGapMs;
    buffer = tooSlow ? key : buffer + key;
    lastAt = atMs;
  }

  return { feed, reset };
}
