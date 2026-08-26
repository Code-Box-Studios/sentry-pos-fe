import type { PosApi } from "./client";
import { MockPosApi } from "./mock/adapter";
import { HttpPosApi } from "./http/adapter";
import { usePairingStore } from "@/state/pairing";

let instance: PosApi | null = null;

/** "mock" or the live base URL — surfaced on the Settings connection card. */
export function apiTarget(): string {
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  return mode === "http" ? (process.env.NEXT_PUBLIC_API_URL || "http (no URL set)") : mode;
}

export function getApi(): PosApi {
  if (instance) return instance;
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  if (mode === "http") {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_MODE=http requires NEXT_PUBLIC_API_URL (e.g. "http://localhost:4000/v1")');
    }
    instance = new HttpPosApi({
      baseUrl,
      getDeviceToken: () => usePairingStore.getState().deviceToken,
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
