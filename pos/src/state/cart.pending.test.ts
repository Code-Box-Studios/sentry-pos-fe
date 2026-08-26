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

// setQty on an existing line routes through mapLines rather than calling mutate directly —
// cover that branch of the funnel too, not just direct-mutate actions like addMisc.
test("setQty on an existing line invalidates the ids (mapLines branch of the funnel)", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  const lineId = useCartStore.getState().cart.lines[0]!.id;
  const first = useCartStore.getState().ensurePendingIds();
  useCartStore.getState().setQty(lineId, 3);
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

test("resetAll() drops the ids with the cart", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().ensurePendingIds();
  useCartStore.getState().resetAll();
  expect(useCartStore.getState().pendingSaleId).toBeNull();
  expect(useCartStore.getState().pendingPaymentId).toBeNull();
});

test("hold() starts the new cart without inherited ids", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().ensurePendingIds();
  useCartStore.getState().hold("Table 4", "shift-1");
  expect(useCartStore.getState().pendingSaleId).toBeNull();
  expect(useCartStore.getState().pendingPaymentId).toBeNull();
});

// resume() hand-writes its nulling instead of routing through mutate — the most dangerous swap,
// since a resumed cart is a DIFFERENT basket. Losing this would silently replay the wrong sale.
test("resume() does not inherit the held cart's ids", () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().hold("Table 4", "shift-1");
  useCartStore.getState().addMisc("Sticker", 2000);
  const first = useCartStore.getState().ensurePendingIds();
  useCartStore.getState().resume(useCartStore.getState().heldCarts[0]!.id);
  expect(useCartStore.getState().pendingSaleId).toBeNull();
  expect(useCartStore.getState().ensurePendingIds().saleId).not.toBe(first.saleId);
});

test("a persisted cart rehydrates with its minted ids intact", async () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  const ids = useCartStore.getState().ensurePendingIds();
  const persisted = localStorage.getItem("sentry-pos:carts");

  // A page load starts empty in memory; put the snapshot back before rehydrating since resetAll's
  // own write would otherwise overwrite it with the cleared state.
  useCartStore.getState().resetAll();
  localStorage.setItem("sentry-pos:carts", persisted!);
  await useCartStore.persist.rehydrate();

  expect(useCartStore.getState().cart.lines).toHaveLength(1);
  expect(useCartStore.getState().ensurePendingIds()).toEqual(ids);
});

test("a legacy blob predating pending ids rehydrates with both null", async () => {
  useCartStore.getState().addMisc("Tote bag", 15000);
  useCartStore.getState().ensurePendingIds();

  const legacy = JSON.parse(localStorage.getItem("sentry-pos:carts")!);
  delete legacy.state.pendingSaleId;
  delete legacy.state.pendingPaymentId;

  useCartStore.getState().resetAll();
  localStorage.setItem("sentry-pos:carts", JSON.stringify(legacy));
  await useCartStore.persist.rehydrate();

  expect(useCartStore.getState().cart.lines).toHaveLength(1);
  expect(useCartStore.getState().pendingSaleId).toBeNull();
  expect(useCartStore.getState().pendingPaymentId).toBeNull();
});
