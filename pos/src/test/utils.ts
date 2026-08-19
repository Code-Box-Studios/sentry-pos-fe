import type { MockPosApi } from "@/api/mock/adapter";

/** Signs in as the seed owner and pairs the terminal to Marikit as "Counter 1". */
export async function pairForTest(api: MockPosApi): Promise<void> {
  const session = await api.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  const business = (await api.listBusinesses(session)).find((b) => !b.isDemo)!;
  const [branch] = await api.listBranches(session, business.id);
  await api.pairTerminal(session, business.id, branch!.id, "Counter 1");
}
