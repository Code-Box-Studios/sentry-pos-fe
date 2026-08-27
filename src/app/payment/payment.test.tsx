import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import type { CatalogPayload, Product } from "@/domain/types";
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { useLastSaleStore } from "@/state/lastSale";
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
