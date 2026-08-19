import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogPayload } from "@/domain/types";
import { useCartStore } from "@/state/cart";
import { usePairingStore } from "@/state/pairing";
import { setViewportWidth } from "@/test/setup";
import { seedCatalogForTest } from "@/test/utils";
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
