import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import type { CatalogPayload } from "@/domain/types";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";
import { pairForTest, seedCatalogForTest } from "@/test/utils";
import StockPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/stock",
}));

let api: MockPosApi;
let catalog: CatalogPayload;

/** The row element for a stock line, found by its label. */
const row = (label: string) => screen.getByText(label).parentElement!;

beforeEach(async () => {
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
});

afterEach(() => setApiForTests(null));

test("only tracked products are listed, with low and out badges", async () => {
  render(<StockPage />);

  expect(await screen.findByText("Pan de sal")).toBeInTheDocument();
  expect(within(row("Pan de sal")).getByText("LOW")).toBeInTheDocument();
  expect(within(row("Pan de sal")).getByText("8")).toBeInTheDocument();

  expect(within(row("Ube loaf")).getByText("OUT")).toBeInTheDocument();
  expect(within(row("Ube loaf")).getByText("0")).toBeInTheDocument();

  // Untracked coffee never appears.
  expect(screen.queryByText("Espresso")).toBeNull();
});

test("a weight product is labelled in kilos and shows three decimals", async () => {
  render(<StockPage />);
  expect(await screen.findByText("Jasmine rice (kg)")).toBeInTheDocument();
  expect(within(row("Jasmine rice (kg)")).getByText("23.450")).toBeInTheDocument();
});

test("an adjustment needs a reason before it can be posted", async () => {
  const user = userEvent.setup();
  render(<StockPage />);

  await user.click(within(row("Ube loaf")).getByRole("button", { name: "Adjust" }));
  expect(await screen.findByText("Adjust stock — Ube loaf")).toBeInTheDocument();
  expect(screen.getByText(/^System says 0\./)).toBeInTheDocument();

  const post = screen.getByRole("button", { name: "Post adjustment" });
  expect(post).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "2" }));
  expect(screen.getByText("Δ +2")).toBeInTheDocument();
  expect(post).toBeDisabled(); // quantity alone is not enough

  await user.click(screen.getByRole("button", { name: "Count correction" }));
  expect(post).toBeEnabled();
});

test("posting an adjustment updates the row and clears the OUT badge", async () => {
  const user = userEvent.setup();
  render(<StockPage />);

  await user.click(within(row("Ube loaf")).getByRole("button", { name: "Adjust" }));
  await user.click(await screen.findByRole("button", { name: "2" }));
  await user.click(screen.getByRole("button", { name: "Count correction" }));
  await user.type(screen.getByLabelText("Note"), "found 2 in the back chiller");
  await user.click(screen.getByRole("button", { name: "Post adjustment" }));

  await vi.waitFor(() => expect(useCatalogStore.getState().availableQty("prod-ubeloaf", null)).toBe(2));
  expect(within(row("Ube loaf")).getByText("2")).toBeInTheDocument();
  expect(within(row("Ube loaf")).queryByText("OUT")).toBeNull();
});

test("the numpad offers no way to key a negative quantity", async () => {
  const user = userEvent.setup();
  render(<StockPage />);

  await user.click(within(row("Ube loaf")).getByRole("button", { name: "Adjust" }));
  const display = await screen.findByLabelText("New quantity");
  await user.click(screen.getByRole("button", { name: "Backspace" }));
  expect(display).toHaveTextContent("0");
  expect(screen.queryByRole("button", { name: "−" })).toBeNull();
  expect(screen.getByRole("button", { name: "Post adjustment" })).toBeDisabled();
});

test("a unit product cannot key decimals", async () => {
  const user = userEvent.setup();
  render(<StockPage />);

  await user.click(within(row("Coke 1.5L")).getByRole("button", { name: "Adjust" }));
  expect(await screen.findByRole("button", { name: "." })).toBeDisabled();
});
