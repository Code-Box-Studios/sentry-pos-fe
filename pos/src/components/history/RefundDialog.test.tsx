import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import type { CompletedSale, SaleDraft } from "@/api/types";
import { emptyCart } from "@/domain/cart";
import { computeTotals } from "@/domain/totals";
import { nowIso } from "@/lib/time";
import { newId } from "@/lib/uuid";
import { useShiftStore } from "@/state/shift";
import { pairForTest, seedCatalogForTest } from "@/test/utils";
import { RefundDialog } from "./RefundDialog";
import { VoidDialog } from "./VoidDialog";

let api: MockPosApi;
let sale: CompletedSale;
const onClose = vi.fn();
const onDone = vi.fn();

function draft(shiftId: string): SaleDraft {
  const lines = [
    {
      id: newId(),
      productId: "prod-pandesal",
      variantId: null,
      name: "Pan de sal",
      soldBy: "unit" as const,
      qty: 2,
      unitPriceC: 1200,
      modifiers: [],
      discount: null,
      scPwdMarked: false,
      trackStock: true,
    },
  ];
  const totals = computeTotals({ ...emptyCart(), lines }, { taxRate: 0.12, serviceChargeRate: 0.05 });
  return {
    id: newId(),
    receiptNo: "MKT-T1-000315",
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
  onClose.mockClear();
  onDone.mockClear();
  resetMockState();
  api = new MockPosApi({ latencyMs: 0 });
  setApiForTests(api);
  await pairForTest(api);
  seedCatalogForTest();

  useShiftStore.setState({ shift: null, hydrated: false });
  await useShiftStore.getState().open(0);
  sale = await api.completeSale(draft(useShiftStore.getState().shift!.id));
});

afterEach(() => setApiForTests(null));

const enterPin = async (user: ReturnType<typeof userEvent.setup>, pin: string) => {
  for (const digit of pin) await user.click(screen.getByRole("button", { name: digit }));
};

test("refund needs both a reason and a full PIN", async () => {
  const user = userEvent.setup();
  render(<RefundDialog sale={sale} open onClose={onClose} onDone={onDone} />);

  const submit = screen.getByRole("button", { name: "Refund ₱24.00" });
  expect(submit).toBeDisabled();

  await user.type(screen.getByLabelText("Reason"), "Customer returned order");
  expect(submit).toBeDisabled();

  await enterPin(user, "12345");
  expect(submit).toBeDisabled();

  await enterPin(user, "6");
  expect(submit).toBeEnabled();
});

test("a wrong PIN counts down and leaves the sale completed", async () => {
  const user = userEvent.setup();
  render(<RefundDialog sale={sale} open onClose={onClose} onDone={onDone} />);

  await user.type(screen.getByLabelText("Reason"), "Customer returned order");
  await enterPin(user, "000000");
  await user.click(screen.getByRole("button", { name: "Refund ₱24.00" }));

  expect(await screen.findByText("Wrong PIN — 3 attempts left")).toBeInTheDocument();
  expect((await api.getSale(sale.id)).status).toBe("completed");
  expect(onDone).not.toHaveBeenCalled();

  // The entry clears so the next attempt starts fresh.
  await enterPin(user, "000000");
  await user.click(screen.getByRole("button", { name: "Refund ₱24.00" }));
  expect(await screen.findByText("Wrong PIN — 2 attempts left")).toBeInTheDocument();
});

test("the fourth failure locks the terminal and disables the button", async () => {
  const user = userEvent.setup();
  render(<RefundDialog sale={sale} open onClose={onClose} onDone={onDone} />);
  await user.type(screen.getByLabelText("Reason"), "Customer returned order");

  for (let i = 0; i < 5; i++) {
    await enterPin(user, "000000");
    await user.click(screen.getByRole("button", { name: "Refund ₱24.00" }));
  }

  expect(await screen.findByText(/^Locked — try again in \d+ min$/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Refund ₱24.00" })).toBeDisabled();
});

test("the right PIN refunds, returns stock and reports the updated sale", async () => {
  const user = userEvent.setup();
  render(<RefundDialog sale={sale} open onClose={onClose} onDone={onDone} />);

  await user.type(screen.getByLabelText("Reason"), "wrong size served");
  await enterPin(user, "123456");
  await user.click(screen.getByRole("button", { name: "Refund ₱24.00" }));

  await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  const updated = onDone.mock.calls[0]![0] as CompletedSale;
  expect(updated.status).toBe("refunded");
  expect(updated.statusReason).toBe("wrong size served");
  expect(updated.refundShiftId).toBe(sale.shiftId);
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(8);
  expect(onClose).toHaveBeenCalled();
});

test("an in-shift refund warns about the drawer; an out-of-shift one does not", async () => {
  render(<RefundDialog sale={sale} open onClose={onClose} onDone={onDone} />);
  expect(screen.getByText(/This shift's expected cash is reduced\./)).toBeInTheDocument();
});

test("void requires a reason and returns stock", async () => {
  const user = userEvent.setup();
  render(<VoidDialog sale={sale} open onClose={onClose} onDone={onDone} />);

  const submit = screen.getByRole("button", { name: "Void sale" });
  expect(submit).toBeDisabled();

  await user.type(screen.getByLabelText("Reason"), "double tap");
  expect(submit).toBeEnabled();
  await user.click(submit);

  await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  const updated = onDone.mock.calls[0]![0] as CompletedSale;
  expect(updated.status).toBe("voided");
  expect((await api.getStockLevels()).find((s) => s.productId === "prod-pandesal")!.qty).toBe(8);
});
