import { act, render, screen } from "@testing-library/react";
import { setApiForTests } from "@/api";
import type { PosApi } from "@/api/client";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";
import { useCartStore } from "@/state/cart";
import { useOperatorStore } from "@/state/operator";
import { DESIGN_SALE } from "@/components/receipt/fixtures";
import { TerminalGate } from "./TerminalGate";

const replace = vi.fn();
let pathname = "/sale";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => pathname }));
beforeEach(() => {
  replace.mockClear(); pathname = "/sale";
  useCartStore.getState().resetAll(); useOperatorStore.getState().lock();
  usePairingStore.setState({ status: "paired", hydrated: true, deviceToken: "device" });
  useShiftStore.setState({ hydrated: true, shift: null });
  setApiForTests({ pullCatalog: () => new Promise(() => {}), getCurrentShift: () => new Promise(() => {}), lockOperator: vi.fn().mockResolvedValue(undefined) } as unknown as PosApi);
});
afterEach(() => { setApiForTests(null); vi.useRealTimers(); });
test("fresh pairing or reload locks before the opening drawer route", () => {
  pathname = "/pair";
  render(<TerminalGate><div>private terminal</div></TerminalGate>);
  expect(replace).toHaveBeenCalledWith("/unlock");
  expect(screen.queryByText("private terminal")).toBeNull();
});
test("an unresolved sale remains intact behind the operator lock", () => {
  useCartStore.getState().savePendingDraft(DESIGN_SALE);
  render(<TerminalGate><div>payment</div></TerminalGate>);
  expect(replace).toHaveBeenCalledWith("/unlock");
  expect(replace).not.toHaveBeenCalledWith("/payment");
  expect(useCartStore.getState().pendingDraft?.id).toBe(DESIGN_SALE.id);
});
test("only the current drawer operator may resume", () => {
  useOperatorStore.getState().unlock({ token: "human", operator: { userId: "other", name: "Other", role: "owner" }, expiresAt: new Date(Date.now() + 3600000).toISOString() });
  useShiftStore.setState({ shift: { id: "drawer", openedAt: "", closedAt: null, openingCashC: 0, cashMovements: [], operatorUserId: "cashier" } });
  render(<TerminalGate><div>sell</div></TerminalGate>);
  expect(useOperatorStore.getState().operator).toBeNull();
  expect(replace).toHaveBeenCalledWith("/unlock");
  expect(useShiftStore.getState().shift?.id).toBe("drawer");
});
test("five minutes idle locks without clearing the pairing or pending sale", async () => {
  vi.useFakeTimers();
  useOperatorStore.getState().unlock({ token: "human", operator: { userId: "cashier", name: "Ana", role: "cashier" }, expiresAt: new Date(Date.now() + 12 * 3600000).toISOString() });
  useCartStore.getState().savePendingDraft(DESIGN_SALE);
  pathname = "/payment";
  render(<TerminalGate><div>payment</div></TerminalGate>);
  await act(async () => { vi.advanceTimersByTime(5 * 60000); });
  expect(useOperatorStore.getState().token).toBeNull();
  expect(usePairingStore.getState().deviceToken).toBe("device");
  expect(useCartStore.getState().pendingDraft?.id).toBe(DESIGN_SALE.id);
  expect(replace).toHaveBeenCalledWith("/unlock");
});
