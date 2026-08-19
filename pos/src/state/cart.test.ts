import type { CatalogPayload, Product } from "@/domain/types";
import { useCatalogStore } from "./catalog";
import { CartStockError, useCartStore } from "./cart";
import { seedCatalogForTest } from "@/test/utils";

let catalog: CatalogPayload;
const find = (id: string): Product => catalog.products.find((p) => p.id === id)!;
const S = { taxRate: 0.12, serviceChargeRate: 0.05 };

beforeEach(() => {
  catalog = seedCatalogForTest();
  useCartStore.getState().resetAll();
});

test("repeat taps stack onto one line and lock the price at add time", () => {
  const espresso = find("prod-espresso");
  useCartStore.getState().addProduct(espresso);
  useCartStore.getState().addProduct(espresso);

  const { lines } = useCartStore.getState().cart;
  expect(lines).toHaveLength(1);
  expect(lines[0]!.qty).toBe(2);
  expect(lines[0]!.unitPriceC).toBe(8500);

  // A portal price change must never touch a cart in progress (pos-spec §4).
  useCatalogStore.setState({
    catalog: { ...catalog, products: catalog.products.map((p) => (p.id === "prod-espresso" ? { ...p, priceC: 9900 } : p)) },
  });
  expect(useCartStore.getState().cart.lines[0]!.unitPriceC).toBe(8500);
});

test("a tracked product cannot be added past what the branch has", () => {
  const pandesal = find("prod-pandesal"); // seed stock 8
  for (let i = 0; i < 8; i++) useCartStore.getState().addProduct(pandesal);
  expect(useCartStore.getState().cart.lines[0]!.qty).toBe(8);

  try {
    useCartStore.getState().addProduct(pandesal);
    throw new Error("expected the 9th tap to be refused");
  } catch (e) {
    expect(e).toBeInstanceOf(CartStockError);
    expect((e as CartStockError).availableQty).toBe(0);
  }
  expect(useCartStore.getState().cart.lines[0]!.qty).toBe(8);
});

test("setQty respects the same cap and removes the line at zero", () => {
  const pandesal = find("prod-pandesal");
  useCartStore.getState().addProduct(pandesal);
  const lineId = useCartStore.getState().cart.lines[0]!.id;

  useCartStore.getState().setQty(lineId, 8);
  expect(useCartStore.getState().cart.lines[0]!.qty).toBe(8);
  expect(() => useCartStore.getState().setQty(lineId, 9)).toThrow(CartStockError);

  useCartStore.getState().setQty(lineId, 0);
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
});

test("an untracked product has no cap", () => {
  const espresso = find("prod-espresso");
  for (let i = 0; i < 50; i++) useCartStore.getState().addProduct(espresso);
  expect(useCartStore.getState().cart.lines[0]!.qty).toBe(50);
});

test("a variant line snapshots the variant price and its own name", () => {
  const latte = find("prod-latte");
  useCartStore.getState().addProduct(latte, {
    variantId: "var-latte-l",
    modifiers: [{ groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 }],
  });
  const line = useCartStore.getState().cart.lines[0]!;
  expect(line.name).toBe("Iced Latte — Large");
  expect(line.unitPriceC).toBe(14500);
  expect(line.modifiers).toHaveLength(1);
});

test("a modifier line never merges into a plain one", () => {
  const latte = find("prod-latte");
  useCartStore.getState().addProduct(latte, { variantId: "var-latte-l" });
  useCartStore.getState().addProduct(latte, {
    variantId: "var-latte-l",
    modifiers: [{ groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 }],
  });
  expect(useCartStore.getState().cart.lines).toHaveLength(2);
});

test("misc lines carry no product and no stock effect", () => {
  useCartStore.getState().addMisc("Tinapa", 15000);
  const line = useCartStore.getState().cart.lines[0]!;
  expect(line.productId).toBeNull();
  expect(line.trackStock).toBe(false);
  expect(useCartStore.getState().totals(S).totalC).toBe(15000);
});

test("SC/PWD marks every line, including ones added afterwards", () => {
  useCartStore.getState().addProduct(find("prod-espresso"));
  useCartStore.getState().setScPwd({ idNo: "SC-1234-5678", name: "Jose Cruz" });
  expect(useCartStore.getState().cart.lines.every((l) => l.scPwdMarked)).toBe(true);

  useCartStore.getState().addProduct(find("prod-cappuccino"));
  expect(useCartStore.getState().cart.lines.every((l) => l.scPwdMarked)).toBe(true);

  // 85.00 → 60.71, 120.00 → 85.71
  expect(useCartStore.getState().totals(S).totalC).toBe(6071 + 8571);

  useCartStore.getState().toggleScPwdLine(useCartStore.getState().cart.lines[0]!.id);
  expect(useCartStore.getState().totals(S).totalC).toBe(8500 + 8571);
});

test("clear empties the cart but keeps holds; resetAll drops both", () => {
  useCartStore.getState().addProduct(find("prod-espresso"));
  useCartStore.getState().hold("Hold 1", "shift-1");
  useCartStore.getState().addProduct(find("prod-cappuccino"));

  useCartStore.getState().clear();
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
  expect(useCartStore.getState().heldCarts).toHaveLength(1);

  useCartStore.getState().resetAll();
  expect(useCartStore.getState().heldCarts).toHaveLength(0);
});

test("any mutation clears a stale stock-conflict highlight", () => {
  useCartStore.getState().addProduct(find("prod-espresso"));
  const lineId = useCartStore.getState().cart.lines[0]!.id;
  useCartStore.setState({ conflictLineIds: [lineId] });

  useCartStore.getState().setQty(lineId, 2);
  expect(useCartStore.getState().conflictLineIds).toEqual([]);
});
