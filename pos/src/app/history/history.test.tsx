import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import type { CompletedSale, SaleDraft } from "@/api/types";
import { emptyCart } from "@/domain/cart";
import { computeTotals } from "@/domain/totals";
import type { CatalogPayload } from "@/domain/types";
import { newId } from "@/lib/uuid";
import { nowIso } from "@/lib/time";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";
import { pairForTest, seedCatalogForTest } from "@/test/utils";
import HistoryPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/history",
}));

let api: MockPosApi;
let catalog: CatalogPayload;

function draft(shiftId: string, unitPriceC: number, name: string): SaleDraft {
  const lines = [
    {
      id: newId(),
      productId: "prod-espresso",
      variantId: null,
      name,
      soldBy: "unit" as const,
      qty: 1,
      unitPriceC,
      modifiers: [],
      discount: null,
      scPwdMarked: false,
      trackStock: false,
    },
  ];
  const cart = { ...emptyCart(), lines };
  const totals = computeTotals(cart, { taxRate: 0.12, serviceChargeRate: 0.05 });
  return {
    id: newId(),
    receiptNo: `MKT-T1-${String(unitPriceC).padStart(6, "0")}`,
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

let completed: CompletedSale;
let voided: CompletedSale;

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

  useShiftStore.setState({ shift: null, hydrated: false });
  await useShiftStore.getState().open(0);
  const shiftId = useShiftStore.getState().shift!.id;

  voided = await api.completeSale(draft(shiftId, 8500, "Espresso"));
  completed = await api.completeSale(draft(shiftId, 12000, "Cappuccino"));
  voided = await api.voidSale(voided.id, "double tap");
});

afterEach(() => setApiForTests(null));

test("sales list newest first with their status", async () => {
  render(<HistoryPage />);

  const rows = await screen.findAllByRole("button", { name: /MKT-T1-0/ });
  expect(rows).toHaveLength(2);
  expect(rows[0]!).toHaveTextContent(completed.receiptNo); // newest first
  expect(rows[1]!).toHaveTextContent(voided.receiptNo);

  expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  expect(screen.getByText("VOIDED")).toBeInTheDocument();
});

test("a voided row is struck through and carries its reason", async () => {
  render(<HistoryPage />);

  const row = await screen.findByRole("button", { name: new RegExp(voided.receiptNo) });
  expect(row).toHaveTextContent('"double tap"');
  const amount = within(row).getByText("₱85.00");
  expect(amount.className).toContain("line-through");
});

test("the summary counts sold sales and flags the void", async () => {
  render(<HistoryPage />);
  // The voided ₱85.00 sale drops out of both the count and the gross.
  expect(await screen.findByText("1 sale · ₱120.00 · 1 void")).toBeInTheDocument();
});

test("tapping a row opens the detail with a reprint control", async () => {
  const user = userEvent.setup();
  render(<HistoryPage />);

  await user.click(await screen.findByRole("button", { name: new RegExp(completed.receiptNo) }));

  expect(await screen.findByRole("button", { name: "Reprint" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "← History" })).toBeInTheDocument();
  expect(screen.getByText("KAPE DIARIA")).toBeInTheDocument();
});

test("a voided sale offers neither void nor refund", async () => {
  const user = userEvent.setup();
  render(<HistoryPage />);

  await user.click(await screen.findByRole("button", { name: new RegExp(voided.receiptNo) }));

  expect(await screen.findByRole("button", { name: "Reprint" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Void…" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Refund…" })).toBeNull();
});

test("going back returns to the list", async () => {
  const user = userEvent.setup();
  render(<HistoryPage />);

  await user.click(await screen.findByRole("button", { name: new RegExp(completed.receiptNo) }));
  await user.click(await screen.findByRole("button", { name: "← History" }));

  expect(await screen.findAllByRole("button", { name: /MKT-T1-0/ })).toHaveLength(2);
});
