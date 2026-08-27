import { MockPosApi } from "./adapter";
import { resetMockState } from "./store";
import { ValidationError } from "../errors";

const api = () => new MockPosApi({ latencyMs: 0 });

beforeEach(() => resetMockState());

test("sign in with seed owner works; wrong password rejected", async () => {
  const s = await api().ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  expect(s.ownerName).toBe("Maria Reyes");
  await expect(api().ownerSignIn("maria@kapediaria.ph", "nope")).rejects.toBeInstanceOf(ValidationError);
});

test("pair flow: businesses → branches → pair → catalog", async () => {
  const a = api();
  const s = await a.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  const businesses = await a.listBusinesses(s);
  expect(businesses.some((b) => b.isDemo)).toBe(true);
  const real = businesses.find((b) => !b.isDemo)!;
  const branches = await a.listBranches(s, real.id);
  expect(branches.map((b) => b.code)).toEqual(["MKT", "BYN"]);
  const pairing = await a.pairTerminal(s, real.id, branches[0]!.id, "Counter 1");
  expect(pairing.terminalCode).toBe("T1");
  const catalog = await a.pullCatalog();
  expect(catalog.branch.code).toBe("MKT");
  expect(catalog.terminal).toEqual({ name: "Counter 1", code: "T1" });
  expect(catalog.products.length).toBeGreaterThan(0);
  expect(catalog.stock.length).toBeGreaterThan(0);
});

test("re-pairing after unpair assigns a fresh terminal code — no receipt collisions", async () => {
  const a = api();
  const s = await a.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  const real = (await a.listBusinesses(s)).find((b) => !b.isDemo)!;
  const [branch] = await a.listBranches(s, real.id);
  const first = await a.pairTerminal(s, real.id, branch!.id, "Counter 1");
  expect(first.terminalCode).toBe("T1");
  await a.unpair("maria@kapediaria.ph", "sentry-demo");
  const second = await a.pairTerminal(s, real.id, branch!.id, "Counter 1 again");
  expect(second.terminalCode).toBe("T2");   // terminalPairCount survives unpair
  expect(second.receiptSeq).toBe(1);        // fresh series under the new code
});
