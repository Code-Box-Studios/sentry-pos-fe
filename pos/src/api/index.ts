import type { PosApi } from "./client";
import { MockPosApi } from "./mock/adapter";

let instance: PosApi | null = null;

export function getApi(): PosApi {
  if (instance) return instance;
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
  if (mode !== "mock") {
    throw new Error(
      `API mode "${mode}" not implemented yet — the HTTP adapter arrives with sentry-pos-be (openapi-typescript client)`
    );
  }
  instance = new MockPosApi();
  return instance;
}

export function setApiForTests(api: PosApi | null): void { instance = api; }
