import type { MockPosApi } from "@/api/mock/adapter";
import { makeSeedCatalog } from "@/api/mock/seed";
import type { CatalogPayload } from "@/domain/types";
import { stockKey, useCatalogStore } from "@/state/catalog";

/** Signs in as the seed owner and pairs the terminal to Marikit as "Counter 1". */
export async function pairForTest(api: MockPosApi): Promise<void> {
  const session = await api.ownerSignIn("maria@kapediaria.ph", "sentry-demo");
  const business = (await api.listBusinesses(session)).find((b) => !b.isDemo)!;
  const [branch] = await api.listBranches(session, business.id);
  await api.pairTerminal(session, business.id, branch!.id, "Counter 1");
}

/** Loads the seed catalog into the catalog store, payload and derived stock map alike. */
export function seedCatalogForTest(): CatalogPayload {
  const catalog: CatalogPayload = {
    ...makeSeedCatalog(),
    terminal: { name: "Counter 1", code: "T1" },
    loadedAt: new Date().toISOString(),
  };
  useCatalogStore.setState({
    catalog,
    stock: new Map(catalog.stock.map((s) => [stockKey(s.productId, s.variantId), s.qty])),
  });
  return catalog;
}
