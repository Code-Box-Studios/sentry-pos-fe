/**
 * Every sale, movement, and shift event carries a client-generated UUID (project-spec §5)
 * so the offline milestone can queue writes without server round-trips.
 */
type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues: <T extends ArrayBufferView>(array: T) => T;
};

export function newId(): string {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!c) throw new Error("crypto unavailable — cannot generate ids");
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
