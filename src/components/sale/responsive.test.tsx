import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogPayload } from "@/domain/types";
import { useCartStore } from "@/state/cart";
import { usePairingStore } from "@/state/pairing";
import { setViewportWidth } from "@/test/setup";
import { seedCatalogForTest } from "@/test/utils";
import { useShiftStore } from "@/state/shift";
import { useCatalogStore } from "@/state/catalog";
import SalePage from "@/app/sale/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/sale",
}));

let catalog: CatalogPayload;

const PHONE = 390;
const TABLET_LANDSCAPE = 1194;

beforeEach(() => {
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
});

afterEach(() => setViewportWidth(TABLET_LANDSCAPE));

test("the tablet layout keeps the cart in a side pane", () => {
  setViewportWidth(TABLET_LANDSCAPE);
  render(<SalePage />);

  expect(screen.getByText("Current sale")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /View sale/ })).toBeNull();
});

test("the phone layout swaps the side pane for a bottom bar", () => {
  setViewportWidth(PHONE);
  render(<SalePage />);

  expect(screen.getByRole("button", { name: /View sale/ })).toBeInTheDocument();
  expect(screen.queryByText("Current sale")).toBeNull();
});

test("the phone bottom bar reports the running total and opens the cart", async () => {
  const user = userEvent.setup({ delay: null });
  setViewportWidth(PHONE);
  useCartStore.getState().addProduct(catalog.products.find((p) => p.id === "prod-espresso")!);
  render(<SalePage />);

  const bar = screen.getByRole("button", { name: /View sale/ });
  expect(bar).toHaveTextContent("1 item · ₱85.00");

  await user.click(bar);
  expect(await screen.findByRole("button", { name: "Charge ₱85.00" })).toBeInTheDocument();
});

test("an empty cart cannot open the phone sheet", () => {
  setViewportWidth(PHONE);
  render(<SalePage />);
  expect(screen.getByRole("button", { name: /View sale/ })).toBeDisabled();
});

test("phones list products as rows, tablets as tiles", () => {
  setViewportWidth(PHONE);
  const { unmount } = render(<SalePage />);
  // The row layout puts the price beside the name rather than under it.
  expect(screen.getByRole("button", { name: /Espresso/ })).toHaveTextContent("₱85.00");
  expect(screen.getByRole("button", { name: /Ube loaf/ })).toBeDisabled();
  unmount();

  setViewportWidth(TABLET_LANDSCAPE);
  render(<SalePage />);
  expect(screen.getByRole("button", { name: /Espresso/ })).toBeInTheDocument();
  expect(screen.getByText("Current sale")).toBeInTheDocument();
});

test("scanning a variant selects its required modifiers before adding", async () => {
  const user = userEvent.setup();
  const product = catalog.products.find(p => p.id === "prod-latte")!;
  const variant = product.variants[0]!;
  variant.barcode = "12345678";
  catalog.modifierGroups.find(g => g.id === "mg-milk")!.minSelect = 1;
  useCatalogStore.setState({ catalog: { ...catalog } });
  render(<SalePage />);
  for (const key of "12345678") fireEvent.keyDown(document, { key });
  fireEvent.keyDown(document, { key: "Enter" });
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
  expect(screen.getByRole("button", { name: /^Add —/ })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: /Oat milk/ }));
  await user.click(screen.getByRole("button", { name: /^Add —/ }));
  expect(useCartStore.getState().cart.lines[0]).toMatchObject({ variantId: variant.id, modifiers: [{ modifierId: "mod-oat" }] });
});

test("the selling screen notices the day boundary without navigation", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T19:59:50Z"));
  useShiftStore.setState({ shift: { id: "shift", openedAt: "2026-09-14T18:00:00Z", closedAt: null, openingCashC: 0, cashMovements: [] } });
  catalog.business.dayStartTime = "04:00";
  useCatalogStore.setState({ catalog: { ...catalog } });
  const { unmount } = render(<SalePage />);
  expect(screen.queryByText(/The business day ended/)).toBeNull();
  act(() => vi.advanceTimersByTime(60000));
  expect(screen.getByText(/The business day ended at 04:00/)).toBeInTheDocument();
  unmount();
  vi.useRealTimers();
  useShiftStore.setState({ shift: null });
});
