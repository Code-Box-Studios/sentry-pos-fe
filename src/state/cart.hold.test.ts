import type { CatalogPayload, Product } from "@/domain/types";
import { useCartStore } from "./cart";
import { seedCatalogForTest } from "@/test/utils";

let catalog: CatalogPayload;
const find = (id: string): Product => catalog.products.find((p) => p.id === id)!;
const S = { taxRate: 0.12, serviceChargeRate: 0.05 };

beforeEach(() => {
  catalog = seedCatalogForTest();
  useCartStore.getState().resetAll();
});

test("holding snapshots the sale under the shift that made it and frees the screen", () => {
  useCartStore.getState().addProduct(find("prod-espresso"), { qty: 2 });
  useCartStore.getState().setOrderType("dine_in");
  useCartStore.getState().hold("Table 4", "shift-abc");

  const { heldCarts, cart } = useCartStore.getState();
  expect(cart.lines).toHaveLength(0);
  expect(heldCarts).toHaveLength(1);
  expect(heldCarts[0]!.label).toBe("Table 4");
  expect(heldCarts[0]!.shiftId).toBe("shift-abc");
  expect(heldCarts[0]!.cart.lines[0]!.qty).toBe(2);
  expect(heldCarts[0]!.cart.orderType).toBe("dine_in");
});

test("resuming restores the exact lines, price locks intact, and drops it from the list", () => {
  useCartStore.getState().addProduct(find("prod-latte"), {
    variantId: "var-latte-l",
    modifiers: [{ groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 }],
  });
  const original = useCartStore.getState().cart.lines[0]!;
  useCartStore.getState().hold("Hold 1", "shift-abc");

  const heldId = useCartStore.getState().heldCarts[0]!.id;
  useCartStore.getState().resume(heldId);

  const restored = useCartStore.getState().cart.lines[0]!;
  expect(restored).toEqual(original);
  expect(restored.unitPriceC).toBe(14500);
  expect(useCartStore.getState().heldCarts).toHaveLength(0);
  expect(useCartStore.getState().totals(S).totalC).toBe(17000);
});

test("discarding removes just that hold", () => {
  useCartStore.getState().addProduct(find("prod-espresso"));
  useCartStore.getState().hold("Hold 1", "shift-abc");
  useCartStore.getState().addProduct(find("prod-cappuccino"));
  useCartStore.getState().hold("Hold 2", "shift-abc");

  const [first] = useCartStore.getState().heldCarts;
  useCartStore.getState().discardHeld(first!.id);

  expect(useCartStore.getState().heldCarts.map((h) => h.label)).toEqual(["Hold 2"]);
});

test("holds survive a restart — they are persisted, not in-memory", async () => {
  useCartStore.getState().addProduct(find("prod-espresso"), { qty: 3 });
  useCartStore.getState().hold("Hold 1", "shift-abc");

  const persisted = localStorage.getItem("sentry-pos:carts");
  expect(persisted).toContain("Hold 1");

  // A page load starts empty in memory and fills from storage; setState alone would rewrite storage,
  // so put the snapshot back before rehydrating.
  useCartStore.setState({ heldCarts: [] });
  localStorage.setItem("sentry-pos:carts", persisted!);
  await useCartStore.persist.rehydrate();

  const { heldCarts } = useCartStore.getState();
  expect(heldCarts).toHaveLength(1);
  expect(heldCarts[0]!.label).toBe("Hold 1");
  expect(heldCarts[0]!.cart.lines[0]!.qty).toBe(3);
});
