import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogPayload, Product } from "@/domain/types";
import { useCartStore } from "@/state/cart";
import { seedCatalogForTest } from "@/test/utils";
import { DiscountPicker } from "./DiscountPicker";
import { ScPwdModal } from "./ScPwdModal";

let catalog: CatalogPayload;
const find = (id: string): Product => catalog.products.find((p) => p.id === id)!;
const onClose = vi.fn();
const S = { taxRate: 0.12, serviceChargeRate: 0.05 };
const totals = () => useCartStore.getState().totals(S);

beforeEach(() => {
  catalog = seedCatalogForTest();
  useCartStore.getState().resetAll();
  onClose.mockClear();
});

test("a line picker offers line and both-scoped discounts, never order-only ones", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-ensaymada"), { qty: 2 });
  const lineId = useCartStore.getState().cart.lines[0]!.id;

  render(<DiscountPicker target={{ kind: "line", lineId }} open onClose={onClose} />);

  expect(screen.getByRole("button", { name: /Merienda 10%/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /₱20 off/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Barkada 5%/ })).toBeNull();

  await user.click(screen.getByRole("button", { name: /Merienda 10%/ }));
  expect(useCartStore.getState().cart.lines[0]!.discount).toMatchObject({ source: "named", discountId: "disc-merienda" });
  // 2 × ₱55.00 = 110.00, less 10%
  expect(totals().promoDiscountC).toBe(1100);
  expect(totals().totalC).toBe(9900);
  expect(onClose).toHaveBeenCalled();
});

test("an order picker offers order and both-scoped discounts", () => {
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<DiscountPicker target={{ kind: "order" }} open onClose={onClose} />);

  expect(screen.getByRole("button", { name: /₱20 off/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Barkada 5%/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Merienda 10%/ })).toBeInTheDocument();
});

test("free-entry percent applies to the order", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<DiscountPicker target={{ kind: "order" }} open onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "1" }));
  await user.click(screen.getByRole("button", { name: "0" }));
  await user.click(screen.getByRole("button", { name: /^Apply/ }));

  expect(useCartStore.getState().cart.orderDiscount).toEqual({ source: "free", kind: "percent", value: 10 });
  expect(totals().totalC).toBe(7650); // 85.00 less 10%
});

test("a free-entry percent over 100 is refused at the keypad", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<DiscountPicker target={{ kind: "order" }} open onClose={onClose} />);

  for (const k of ["1", "0", "1"]) await user.click(screen.getByRole("button", { name: k }));
  expect(screen.getByLabelText("Percent").textContent).toBe("10%");
});

test("an existing discount can be removed", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  useCartStore.getState().setOrderDiscount({ source: "free", kind: "percent", value: 10 });

  render(<DiscountPicker target={{ kind: "order" }} open onClose={onClose} />);
  await user.click(screen.getByRole("button", { name: "Remove discount" }));

  expect(useCartStore.getState().cart.orderDiscount).toBeNull();
  expect(totals().totalC).toBe(8500);
});

test("SC/PWD capture takes VAT off first, then 20%", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<ScPwdModal open onClose={onClose} />);

  expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  await user.type(screen.getByLabelText("ID number"), "SC-1234-5678");
  await user.type(screen.getByLabelText("Name"), "Jose Cruz");
  await user.click(screen.getByRole("button", { name: "Apply" }));

  expect(useCartStore.getState().cart.scPwd).toEqual({ idNo: "SC-1234-5678", name: "Jose Cruz" });
  expect(totals().totalC).toBe(6071);
  expect(totals().vatExemptSalesC).toBe(6071);
  expect(totals().vatC).toBe(0);
});

test("SC/PWD can be lifted again", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  useCartStore.getState().setScPwd({ idNo: "SC-1", name: "Jose" });

  render(<ScPwdModal open onClose={onClose} />);
  await user.click(screen.getByRole("button", { name: "Remove SC/PWD" }));

  expect(useCartStore.getState().cart.scPwd).toBeNull();
  expect(totals().totalC).toBe(8500);
});
