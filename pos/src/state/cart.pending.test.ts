import { useCartStore } from "./cart";

beforeEach(() => {
  useCartStore.getState().resetAll();
});

test("ids are stable across retries of the same cart", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  const first = useCartStore.getState().ensurePendingIds();
  expect(useCartStore.getState().ensurePendingIds()).toEqual(first);
  expect(first.saleId).not.toBe(first.paymentId);
});

test("any cart mutation invalidates the pending ids", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  const first = useCartStore.getState().ensurePendingIds();
  useCartStore.getState().addMisc("Sticker", 2000);
  const second = useCartStore.getState().ensurePendingIds();
  expect(second.saleId).not.toBe(first.saleId);
  expect(second.paymentId).not.toBe(first.paymentId);
});

test("clear() drops the ids with the cart", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().ensurePendingIds();
  useCartStore.getState().clear();
  expect(useCartStore.getState().pendingSaleId).toBeNull();
  expect(useCartStore.getState().pendingPaymentId).toBeNull();
});

test("hold() starts the new cart without inherited ids", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().ensurePendingIds();
  useCartStore.getState().hold("Table 4", "shift-1");
  expect(useCartStore.getState().pendingSaleId).toBeNull();
});
