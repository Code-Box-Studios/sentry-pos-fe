import { apiTarget, getApi, setApiForTests } from "./index";
import { HttpPosApi } from "./http/adapter";
import { MockPosApi } from "./mock/adapter";

afterEach(() => {
  setApiForTests(null); // getApi caches a singleton — reset between tests
  vi.unstubAllEnvs();
});

describe("getApi mode selection", () => {
  test("defaults to the mock adapter", () => {
    expect(getApi()).toBeInstanceOf(MockPosApi);
  });

  test("builds the HTTP adapter in http mode (trailing slash trimmed)", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/v1/");
    expect(getApi()).toBeInstanceOf(HttpPosApi);
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
});
