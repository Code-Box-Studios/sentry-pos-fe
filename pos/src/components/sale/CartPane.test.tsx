import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogPayload, Product } from "@/domain/types";
import { useCartStore } from "@/state/cart";
import { seedCatalogForTest } from "@/test/utils";
import { CartPane } from "./CartPane";

let catalog: CatalogPayload;
const find = (id: string): Product => catalog.products.find((p) => p.id === id)!;
const noop = () => undefined;

beforeEach(() => {
  catalog = seedCatalogForTest();
  useCartStore.getState().resetAll();
});

function pane(overrides: Partial<React.ComponentProps<typeof CartPane>> = {}) {
  return render(
    <CartPane
      onCharge={noop}
      onDiscount={noop}
      onLineDiscount={noop}
      onScPwd={noop}
      onHold={noop}
      onHeldList={noop}
      onEditWeight={noop}
      {...overrides}
    />
  );
}

test("an empty cart cannot be charged", () => {
  pane();
  expect(screen.getByRole("button", { name: /Charge/ })).toBeDisabled();
  expect(screen.getByText("No items yet — tap a product to start.")).toBeInTheDocument();
});

test("the stepper drives the line total and the footer", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  pane();

  expect(screen.getByRole("button", { name: "Charge ₱85.00" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Increase quantity" }));
  expect(screen.getByRole("button", { name: "Charge ₱170.00" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
  expect(screen.getByRole("button", { name: "Charge ₱85.00" })).toBeInTheDocument();
});

test("dine-in adds the service charge row, other order types do not", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  pane();

  expect(screen.queryByText("Service charge 5%")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Dine-in" }));
  expect(screen.getByText("Service charge 5%")).toBeInTheDocument();
  // 85.00 + 5% = 89.25
  expect(screen.getByRole("button", { name: "Charge ₱89.25" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Takeout" }));
  expect(screen.queryByText("Service charge 5%")).toBeNull();
});

test("clearing the cart needs a confirm, and cancelling keeps the lines", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  pane();

  await user.click(screen.getByRole("button", { name: "Clear" }));
  expect(await screen.findByText("Clear this sale?")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(useCartStore.getState().cart.lines).toHaveLength(1);

  await user.click(screen.getByRole("button", { name: "Clear" }));
  await user.click(await screen.findByRole("button", { name: "Clear sale" }));
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
});

test("a weight line shows a keyed chip instead of a stepper", () => {
  useCartStore.getState().addProduct(find("prod-rice"), { qty: 0.75 });
  pane();

  expect(screen.getByRole("button", { name: "0.750 kg" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Increase quantity" })).toBeNull();
  expect(screen.getByText("@ ₱95.00 / kg")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Charge ₱71.25" })).toBeInTheDocument();
});

test("modifiers are itemised under the line and priced into the total", () => {
  useCartStore.getState().addProduct(find("prod-latte"), {
    variantId: "var-latte-l",
    modifiers: [{ groupId: "mg-milk", modifierId: "mod-oat", name: "Oat milk", priceDeltaC: 2500 }],
  });
  pane();

  expect(screen.getByText("Iced Latte — Large")).toBeInTheDocument();
  expect(screen.getByText("+ Oat milk (+₱25.00)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Charge ₱170.00" })).toBeInTheDocument();
});

test("removing a line empties the cart", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  pane();

  await user.click(screen.getByRole("button", { name: "Remove Espresso" }));
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
});
