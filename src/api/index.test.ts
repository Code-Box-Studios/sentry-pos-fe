import { apiTarget, getApi, setApiForTests } from "./index";
import { HttpPosApi } from "./http/adapter";
import { MockPosApi } from "./mock/adapter";

afterEach(() => {
  setApiForTests(null); // getApi caches a singleton — reset between tests
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getApi mode selection", () => {
  test("defaults to the mock adapter", () => {
    // Relies on NEXT_PUBLIC_API_MODE being unset in process.env — true only because Vitest
    // does not load .env.local (which sets it to "http") into process.env.
    expect(getApi()).toBeInstanceOf(MockPosApi);
  });

  test("builds the HTTP adapter in http mode (trailing slash trimmed)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/v1/");
    const spy = vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", spy);

    const api = getApi();
    expect(api).toBeInstanceOf(HttpPosApi);
    await api.getStockLevels();

    // Proves the trimmed value is what actually reaches the network, not just what's stored.
    expect(spy).toHaveBeenCalledWith("http://localhost:4000/v1/pos/stock", expect.anything());
  });

  test("refuses http mode without a URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(() => getApi()).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  test("refuses unknown modes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "grpc");
    expect(() => getApi()).toThrow(/Unknown NEXT_PUBLIC_API_MODE/);
  });
});

describe("apiTarget", () => {
  test("reports mock by default", () => {
    expect(apiTarget()).toBe("mock");
  });

  test("reports the live URL in http mode", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/v1");
    expect(apiTarget()).toBe("http://localhost:4000/v1");
  });

  test("trims a trailing slash the same way getApi does", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/v1/");
    expect(apiTarget()).toBe("http://localhost:4000/v1");
  });
});
