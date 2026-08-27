import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogPayload } from "@/domain/types";
import { seedCatalogForTest } from "@/test/utils";
import { ALL_CATEGORIES } from "./CategoryTabs";
import { ProductGrid } from "./ProductGrid";

let catalog: CatalogPayload;
const onSelect = vi.fn();

beforeEach(() => {
  catalog = seedCatalogForTest();
  onSelect.mockClear();
});

function grid(props: Partial<{ categoryId: string; search: string }> = {}) {
  return render(
    <ProductGrid
      products={catalog.products}
      categoryId={props.categoryId ?? ALL_CATEGORIES}
      search={props.search ?? ""}
      onSelect={onSelect}
    />
  );
}

test("a zero-stock tracked product is shown out of stock and cannot be tapped", async () => {
  const user = userEvent.setup();
  grid();
  const tile = screen.getByRole("button", { name: /Ube loaf/ });
  expect(tile).toBeDisabled();
  expect(screen.getByText("OUT OF STOCK")).toBeInTheDocument();
  await user.click(tile);
  expect(onSelect).not.toHaveBeenCalled();
});

test("a product at or below its threshold shows how many are left", () => {
  grid();
  expect(screen.getByText("LOW · 8 LEFT")).toBeInTheDocument();
});

test("variant and weight products advertise themselves", () => {
  grid();
  expect(screen.getByText("3 SIZES")).toBeInTheDocument();
  expect(screen.getByText("BY WEIGHT")).toBeInTheDocument();
  expect(screen.getByText("from ₱120.00")).toBeInTheDocument();
  expect(screen.getByText("₱95.00 / kg")).toBeInTheDocument();
});

test("search matches name or SKU, case-insensitively", () => {
  grid({ search: "kopiko" });
  expect(screen.getByRole("button", { name: /Kopiko 3-in-1/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Espresso/ })).toBeNull();

  grid({ search: "cf-101" });
  expect(screen.getByRole("button", { name: /Espresso/ })).toBeInTheDocument();
});

test("a category tab hides everything else", () => {
  grid({ categoryId: "cat-coffee" });
  expect(screen.getByRole("button", { name: /Espresso/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Pan de sal/ })).toBeNull();
});

test("tapping an in-stock tile reports the product", async () => {
  const user = userEvent.setup();
  grid();
  await user.click(screen.getByRole("button", { name: /Espresso/ }));
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "prod-espresso" }));
});
