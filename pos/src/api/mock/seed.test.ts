import { makeSeedCatalog } from "./seed";

test("seed satisfies catalog invariants", () => {
  const c = makeSeedCatalog();
  expect(c.products.length).toBeGreaterThanOrEqual(12);
  const skus = c.products.flatMap((p) => [p.sku, ...p.variants.map((v) => v.sku)]).filter(Boolean);
  expect(new Set(skus).size).toBe(skus.length); // unique per business
  const barcodes = c.products.flatMap((p) => [p.barcode, ...p.variants.map((v) => v.barcode)]).filter(Boolean);
  expect(new Set(barcodes).size).toBe(barcodes.length);
  const latte = c.products.find((p) => p.name === "Iced Latte")!;
  expect(latte.sku).toBe("CF-102"); // design 04 sheet header depends on it
  expect(latte.variants.map((v) => v.priceC)).toEqual([12000, 13000, 14500]);
  expect(latte.modifierGroupIds.length).toBe(2); // Milk, Add-ons (size is variants)
  const oat = c.modifierGroups.find((g) => g.id === "mg-milk")!.modifiers.find((m) => m.id === "mod-oat")!;
  expect(oat.name).toBe("Oat milk"); // full label — design + later fixtures render "Oat milk"
  const rice = c.products.find((p) => p.name === "Jasmine rice")!;
  expect(rice.soldBy).toBe("weight");
  const stockFor = (name: string) => c.stock.find((s) => s.productId === c.products.find((p) => p.name === name)!.id)!.qty;
  expect(stockFor("Pan de sal")).toBe(8);
  expect(stockFor("Ube loaf")).toBe(0);
  expect(stockFor("Jasmine rice")).toBe(23.45);
  expect(c.business.taxRate).toBe(0.12);
  expect(c.business.serviceChargeRate).toBe(0.05);
});
