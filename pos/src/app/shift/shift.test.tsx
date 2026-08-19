import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import type { SaleDraft } from "@/api/types";
import { emptyCart } from "@/domain/cart";
import { computeTotals } from "@/domain/totals";
import type { CatalogPayload } from "@/domain/types";
import { nowIso } from "@/lib/time";
import { newId } from "@/lib/uuid";
import { useCartStore } from "@/state/cart";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";
import { pairForTest, seedCatalogForTest } from "@/test/utils";
import ShiftPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/shift",
}));

let api: MockPosApi;
let catalog: CatalogPayload;

function cashSale(shiftId: string, unitPriceC: number): SaleDraft {
  const lines = [
    {
      id: newId(),
      productId: "prod-espresso",
      variantId: null,
      name: "Espresso",
      soldBy: "unit" as const,
      qty: 1,
      unitPriceC,
      modifiers: [],
      discount: null,
      scPwdMarked: false,
      trackStock: false,
    },
  ];
  const totals = computeTotals({ ...emptyCart(), lines }, { taxRate: 0.12, serviceChargeRate: 0.05 });
  return {
    id: newId(),
    receiptNo: "MKT-T1-000001",
    shiftId,
    orderType: "none",
    lines,
    orderDiscount: null,
    scPwd: null,
    totals,
    payment: { id: newId(), method: "cash", referenceNo: null, amountC: totals.totalC, tenderedC: totals.totalC, changeC: 0 },
    createdAtDevice: nowIso(),
  };
}

beforeEach(async () => {
  replace.mockClear();
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

  useShiftStore.setState({ shift: null, hydrated: false });
  await useShiftStore.getState().open(200000);
  const shiftId = useShiftStore.getState().shift!.id;

  await api.completeSale(cashSale(shiftId, 50000));
  await useShiftStore.getState().addCashMovement("in", 100000, "change fund from safe");
  await useShiftStore.getState().addCashMovement("out", 75000, "LPG delivery paid from drawer");
});

afterEach(() => setApiForTests(null));

test("X totals and the expected-cash breakdown add up", async () => {
  render(<ShiftPage />);

  // 2,000 opening + 500 cash sale + 1,000 in − 750 out = 2,750
  expect(await screen.findByText("Expected: 2,000.00 + 500.00 + 1,000.00 − 750.00")).toBeInTheDocument();
  expect(screen.getByText("₱2,750.00")).toBeInTheDocument();
  expect(screen.getByText("1 sale")).toBeInTheDocument();
});

test("cash movements are listed with direction", async () => {
  render(<ShiftPage />);

  expect(await screen.findByText("Cash in — change fund from safe")).toBeInTheDocument();
  expect(screen.getByText("Cash out — LPG delivery paid from drawer")).toBeInTheDocument();
  expect(screen.getByText("+1,000.00")).toBeInTheDocument();
  expect(screen.getByText("−750.00")).toBeInTheDocument();
});

test("held carts block the close until they are dealt with", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(catalog.products.find((p) => p.id === "prod-espresso")!);
  useCartStore.getState().hold("Table 4", useShiftStore.getState().shift!.id);

  render(<ShiftPage />);

  expect(
    await screen.findByText("1 held cart must be completed or discarded before closing.")
  ).toBeInTheDocument();

  await user.click(await screen.findByLabelText("Counted cash"));
  for (const k of ["2", "7", "5", "0"]) await user.click(screen.getByRole("button", { name: k }));
  await user.click(screen.getByRole("button", { name: "Done" }));

  expect(screen.getByRole("button", { name: "Close & print Z" })).toBeDisabled();
});

test("counting the drawer closes the shift and shows the Z report", async () => {
  const user = userEvent.setup();
  render(<ShiftPage />);

  await user.click(await screen.findByLabelText("Counted cash"));
  // ₱2,700.00 counted against ₱2,750.00 expected → short 50.00
  for (const k of ["2", "7", "0", "0"]) await user.click(screen.getByRole("button", { name: k }));
  await user.click(screen.getByRole("button", { name: "Done" }));

  // The close panel chip and the live Z preview both read the same over/short.
  expect(screen.getAllByText("−50.00")).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Close & print Z" }));

  expect(await screen.findByText("Z REPORT")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Print Z" })).toBeInTheDocument();
  expect(useShiftStore.getState().shift).toBeNull();
  expect(await api.getCurrentShift()).toBeNull();
});

test("Done after closing sends the terminal back to shift open", async () => {
  const user = userEvent.setup();
  render(<ShiftPage />);

  await user.click(await screen.findByLabelText("Counted cash"));
  for (const k of ["2", "7", "5", "0"]) await user.click(screen.getByRole("button", { name: k }));
  await user.click(screen.getByRole("button", { name: "Done" }));
  await user.click(screen.getByRole("button", { name: "Close & print Z" }));

  await user.click(await screen.findByRole("button", { name: "Done" }));
  expect(replace).toHaveBeenCalledWith("/shift-open");
});
