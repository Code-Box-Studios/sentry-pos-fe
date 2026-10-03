import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ValidationError } from "@/api/errors";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import type { CatalogPayload, Product } from "@/domain/types";
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { useLastSaleStore } from "@/state/lastSale";
import { useOperatorStore } from "@/state/operator";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";
import { pairForTest, seedCatalogForTest } from "@/test/utils";
import PaymentPage from "./page";

const replace = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back }),
  usePathname: () => "/payment",
}));

let api: MockPosApi;
let catalog: CatalogPayload;
const find = (id: string): Product => catalog.products.find((p) => p.id === id)!;

beforeEach(async () => {
  replace.mockClear();
  back.mockClear();
  resetMockState();
  api = new MockPosApi({ latencyMs: 0 });
  setApiForTests(api);
  await pairForTest(api);
  useOperatorStore.getState().unlock(await api.unlockOperator("mock-owner", "123456"));

  catalog = seedCatalogForTest();
  usePairingStore.setState({
    status: "paired",
    hydrated: true,
    deviceToken: "t",
    terminalName: "Counter 1",
    terminalCode: "T1",
    receiptSeq: 1,
    branch: catalog.branch,
    business: catalog.business,
  });
  useCartStore.getState().resetAll();
  useLastSaleStore.getState().set(null);
  useShiftStore.setState({ shift: null, hydrated: false });
  await useShiftStore.getState().open(0);
});

afterEach(() => setApiForTests(null));

test("cash cannot complete until the drawer covers the total", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<PaymentPage />);

  expect(screen.getByLabelText("Amount due")).toHaveTextContent("₱85.00");
  const complete = screen.getByRole("button", { name: "Complete sale" });
  expect(complete).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "₱100" }));
  expect(complete).toBeEnabled();
  expect(screen.getByText("Change")).toBeInTheDocument();
  expect(screen.getByText("₱15.00")).toBeInTheDocument();
});

test("quick-tender pills stack, and Exact resets to the amount due", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<PaymentPage />);

  await user.click(screen.getByRole("button", { name: "₱100" }));
  await user.click(screen.getByRole("button", { name: "₱100" }));
  expect(screen.getByText("₱115.00")).toBeInTheDocument(); // change from ₱200

  await user.click(screen.getByRole("button", { name: "Exact" }));
  expect(screen.getByText("₱0.00")).toBeInTheDocument();
});

test("completing writes the sale, burns the receipt number, decrements stock and clears the cart", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-pandesal"), { qty: 6 });
  render(<PaymentPage />);

  await user.click(screen.getByRole("button", { name: "Exact" }));
  await user.click(screen.getByRole("button", { name: "Complete sale" }));

  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/receipt"));

  const sales = await api.listSales({ date: null });
  expect(sales).toHaveLength(1);
  expect(sales[0]!.receiptNo).toBe("MKT-T1-000001");
  expect(sales[0]!.totalC).toBe(7200);

  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000002");
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
  expect(useCatalogStore.getState().availableQty("prod-pandesal", null)).toBe(2);
  expect(useLastSaleStore.getState().sale?.receiptNo).toBe("MKT-T1-000001");
});

test("a non-cash method records its reference and completes without tender", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<PaymentPage />);

  await user.click(screen.getByRole("button", { name: "GCash" }));
  await user.type(screen.getByLabelText("Reference number (optional)"), "1029-3847");
  await user.click(screen.getByRole("button", { name: "Complete sale" }));

  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/receipt"));
  const [sale] = await api.listSales({ date: null });
  expect(sale!.method).toBe("gcash");
  expect(sale!.referenceNo).toBe("1029-3847");
});

test("a stock race keeps the cart, flags the line, and does not burn the receipt number", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-pandesal"), { qty: 6 });
  const lineId = useCartStore.getState().cart.lines[0]!.id;

  // Another terminal took the stock while this sale was being keyed.
  await api.adjustStock({ productId: "prod-pandesal", variantId: null, newQty: 2, reasonCategory: "count_correction", note: null });

  render(<PaymentPage />);
  await user.click(screen.getByRole("button", { name: "Exact" }));
  await user.click(screen.getByRole("button", { name: "Complete sale" }));

  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/sale"));

  expect(await api.listSales({ date: null })).toHaveLength(0);
  expect(useCartStore.getState().cart.lines).toHaveLength(1);
  expect(useCartStore.getState().conflictLineIds).toEqual([lineId]);
  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000001"); // untouched
  expect(useCatalogStore.getState().availableQty("prod-pandesal", null)).toBe(2);
});

test("the header goes back to the sale", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  render(<PaymentPage />);

  await user.click(screen.getByRole("button", { name: "← Back to sale" }));
  expect(back).toHaveBeenCalled();
});

test("timeout after commit freezes payment intent and retries it after reload", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(find("prod-espresso"));
  const original = api.completeSale.bind(api);
  const complete = vi.spyOn(api, "completeSale").mockImplementationOnce(async draft => {
    await original(draft);
    throw new Error("Response lost");
  });
  const { unmount } = render(<PaymentPage />);
  await user.click(screen.getByRole("button", { name: "GCash" }));
  await user.type(screen.getByLabelText("Reference number (optional)"), "paid-ref");
  await user.click(screen.getByRole("button", { name: "Complete sale" }));
  expect(screen.getByRole("button", { name: "Cash" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "← Back to sale" })).toBeDisabled();
  const persisted = localStorage.getItem("sentry-pos:carts")!;
  expect(complete.mock.calls[0]![0].operatorUserId).toBe(useOperatorStore.getState().operator!.userId);
  unmount();
  useCartStore.getState().resetAll();
  localStorage.setItem("sentry-pos:carts", persisted);
  await useCartStore.persist.rehydrate();
  render(<PaymentPage />);
  expect(screen.getByLabelText("Reference number (optional)")).toHaveValue("paid-ref");
  await user.click(screen.getByRole("button", { name: "Retry original payment" }));
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/receipt"));
  expect(complete.mock.calls[1]![0]).toEqual(complete.mock.calls[0]![0]);
  expect(await api.listSales({ date: null })).toHaveLength(1);
  expect(useLastSaleStore.getState().sale?.payment.referenceNo).toBe("paid-ref");
});

test("a definitive rejection lets the cashier correct payment details", async () => {
  useCartStore.getState().addProduct(find("prod-espresso"));
  const complete = vi.spyOn(api, "completeSale").mockRejectedValueOnce(new ValidationError("Payment rejected"));
  const user = userEvent.setup();
  render(<PaymentPage />);
  await user.click(screen.getByRole("button", { name: "Exact" }));
  await user.click(screen.getByRole("button", { name: "Complete sale" }));
  expect(screen.getByRole("button", { name: "GCash" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "GCash" }));
  await user.click(screen.getByRole("button", { name: "Complete sale" }));
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/receipt"));
  expect(complete.mock.calls[1]![0].id).not.toBe(complete.mock.calls[0]![0].id);
  expect(useLastSaleStore.getState().sale?.payment.method).toBe("gcash");
});

test("pending payment retains quoted total when business settings refresh", async () => {
  useCartStore.getState().addProduct(find("prod-espresso"));
  useCartStore.getState().setOrderType("dine_in");
  vi.spyOn(api, "completeSale").mockRejectedValueOnce(new Error("Response lost"));
  const user = userEvent.setup();
  const { unmount } = render(<PaymentPage />);
  await user.click(screen.getByRole("button", { name: "Exact" }));
  await user.click(screen.getByRole("button", { name: "Complete sale" }));
  unmount();
  useCatalogStore.setState({ catalog: { ...catalog, business: { ...catalog.business, serviceChargeRate: 0.1 } } });
  render(<PaymentPage />);
  expect(screen.getByLabelText("Amount due")).toHaveTextContent("₱89.25");
});
