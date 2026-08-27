import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogPayload, Product } from "@/domain/types";
import { useCatalogStore } from "@/state/catalog";
import { useCartStore } from "@/state/cart";
import { seedCatalogForTest } from "@/test/utils";
import { MiscItemModal } from "./MiscItemModal";
import { VariantModifierSheet } from "./VariantModifierSheet";

let catalog: CatalogPayload;
const find = (id: string): Product => catalog.products.find((p) => p.id === id)!;
const onClose = vi.fn();

beforeEach(() => {
  catalog = seedCatalogForTest();
  useCartStore.getState().resetAll();
  onClose.mockClear();
});

const addButton = () => screen.getByRole("button", { name: /^Add — / });

test("a size must be chosen before the line can be added", async () => {
  const user = userEvent.setup();
  render(<VariantModifierSheet product={find("prod-latte")} onClose={onClose} />);

  expect(addButton()).toBeDisabled();
  await user.click(screen.getByRole("button", { name: /Large/ }));
  expect(screen.getByRole("button", { name: "Add — ₱145.00" })).toBeEnabled();
});

test("modifier deltas price into the Add button", async () => {
  const user = userEvent.setup();
  render(<VariantModifierSheet product={find("prod-latte")} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: /Large/ }));
  await user.click(screen.getByRole("button", { name: /Oat milk/ }));
  expect(screen.getByRole("button", { name: "Add — ₱170.00" })).toBeInTheDocument();
});

test("a max-1 group swaps the selection instead of stacking", async () => {
  const user = userEvent.setup();
  render(<VariantModifierSheet product={find("prod-latte")} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: /Large/ }));
  await user.click(screen.getByRole("button", { name: /Oat milk/ }));
  await user.click(screen.getByRole("button", { name: /Fresh milk/ }));
  // Fresh milk is +₱0.00, so choosing it drops the oat surcharge entirely.
  expect(screen.getByRole("button", { name: "Add — ₱145.00" })).toBeInTheDocument();
});

test("a max-3 group takes all three add-ons", async () => {
  const user = userEvent.setup();
  render(<VariantModifierSheet product={find("prod-latte")} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: /Small/ }));
  await user.click(screen.getByRole("button", { name: /Extra shot/ }));
  await user.click(screen.getByRole("button", { name: /Vanilla/ }));
  await user.click(screen.getByRole("button", { name: /Less ice/ }));
  // 120.00 + 30.00 + 15.00 + 0.00
  expect(screen.getByRole("button", { name: "Add — ₱165.00" })).toBeInTheDocument();
});

test("a selection past maxSelect is ignored", async () => {
  const user = userEvent.setup();
  // The seed has no group that can be overfilled, so inject one that can.
  useCatalogStore.setState({
    catalog: {
      ...catalog,
      modifierGroups: [
        ...catalog.modifierGroups,
        {
          id: "mg-test",
          name: "Syrups",
          minSelect: 0,
          maxSelect: 2,
          modifiers: [
            { id: "mod-a", name: "Caramel", priceDeltaC: 1000 },
            { id: "mod-b", name: "Hazelnut", priceDeltaC: 1000 },
            { id: "mod-c", name: "Mint", priceDeltaC: 1000 },
          ],
        },
      ],
    },
  });
  const product: Product = { ...find("prod-espresso"), modifierGroupIds: ["mg-test"] };
  render(<VariantModifierSheet product={product} onClose={onClose} />);

  expect(screen.getByText("SYRUPS — CHOOSE UP TO 2")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Caramel/ }));
  await user.click(screen.getByRole("button", { name: /Hazelnut/ }));
  expect(screen.getByRole("button", { name: "Add — ₱105.00" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /Mint/ }));
  expect(screen.getByRole("button", { name: "Add — ₱105.00" })).toBeInTheDocument();
});

test("confirming adds a fully snapshotted line", async () => {
  const user = userEvent.setup();
  render(<VariantModifierSheet product={find("prod-latte")} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: /Large/ }));
  await user.click(screen.getByRole("button", { name: /Oat milk/ }));
  await user.click(screen.getByRole("button", { name: "Add — ₱170.00" }));

  const line = useCartStore.getState().cart.lines[0]!;
  expect(line.name).toBe("Iced Latte — Large");
  expect(line.unitPriceC).toBe(14500);
  expect(line.modifiers).toEqual([
    { groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 },
  ]);
  expect(onClose).toHaveBeenCalled();
});

test("the quantity stepper multiplies the Add amount", async () => {
  const user = userEvent.setup();
  render(<VariantModifierSheet product={find("prod-latte")} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: /Medium/ }));
  await user.click(screen.getByRole("button", { name: "Increase quantity" }));
  expect(screen.getByRole("button", { name: "Add — ₱260.00" })).toBeInTheDocument();
});

test("the misc modal creates an off-catalog line", async () => {
  const user = userEvent.setup();
  render(<MiscItemModal open onClose={onClose} />);

  expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  await user.type(screen.getByLabelText("Name"), "Tinapa");
  for (const k of ["1", "5", "0"]) await user.click(screen.getByRole("button", { name: k }));
  await user.click(screen.getByRole("button", { name: "Add" }));

  const line = useCartStore.getState().cart.lines[0]!;
  expect(line.name).toBe("Tinapa");
  expect(line.productId).toBeNull();
  expect(line.unitPriceC).toBe(15000);
});
