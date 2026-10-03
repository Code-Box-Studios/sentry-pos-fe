import type { PosApi } from "./client";
import { MockPosApi } from "./mock/adapter";
import { HttpPosApi } from "./http/adapter";
import { usePairingStore } from "@/state/pairing";
import { useOperatorStore } from "@/state/operator";

let instance: PosApi | null = null;

/** Trimmed the same way for both the adapter's baseUrl and the Settings display string. */
function trimmedApiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
}

/** "mock" or the live base URL — surfaced on the Settings connection card. */
export function apiTarget(): string {
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  return mode === "http" ? (trimmedApiUrl() || "http (no URL set)") : mode;
}

export function getApi(): PosApi {
  if (instance) return instance;
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  if (mode === "http") {
    const baseUrl = trimmedApiUrl();
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_MODE=http requires NEXT_PUBLIC_API_URL (e.g. "http://localhost:4000/v1")');
    }
    instance = new HttpPosApi({
      baseUrl,
      getDeviceToken: () => usePairingStore.getState().deviceToken,
      getOperatorToken: () => useOperatorStore.getState().token,
    });
    return instance;
  }
  if (mode !== "mock") {
    throw new Error(`Unknown NEXT_PUBLIC_API_MODE "${mode}" — use "mock" or "http"`);
  }
  instance = new MockPosApi();
  return instance;
}

export function setApiForTests(api: PosApi | null): void { instance = api; }
