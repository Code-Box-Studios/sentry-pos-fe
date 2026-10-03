import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import type { PosApi } from "@/api/client";
import { useOperatorStore } from "@/state/operator";
import { useShiftStore } from "@/state/shift";
import { OperatorUnlockScreen } from "./OperatorUnlockScreen";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
const owner = { userId: "owner", name: "Owner", role: "owner" as const, requiresSetup: false };
const ana = { userId: "ana", name: "Ana", role: "cashier" as const, requiresSetup: true };
const setup = vi.fn();
beforeEach(() => {
  setup.mockReset(); useOperatorStore.getState().lock();
  useShiftStore.setState({ shift: null, hydrated: true });
  setApiForTests({ listOperators: async () => [owner, ana], setupOperatorPin: setup, getCurrentShift: async () => null } as unknown as PosApi);
});
afterEach(() => setApiForTests(null));
test("shows the owner as themselves and assigned named staff", async () => {
  render(<OperatorUnlockScreen />);
  expect(await screen.findByRole("button", { name: /Owner.*owner/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Ana.*cashier/i })).toBeInTheDocument();
});
test("cashier first unlock requires a different, confirmed permanent PIN", async () => {
  setup.mockResolvedValue({ token: "human", operator: ana, expiresAt: new Date(Date.now() + 3600000).toISOString() });
  render(<OperatorUnlockScreen />);
  await userEvent.click(await screen.findByRole("button", { name: /Ana.*cashier/i }));
  await userEvent.type(screen.getByLabelText("Temporary PIN"), "111111");
  await userEvent.type(screen.getByLabelText("New terminal PIN"), "111111");
  await userEvent.type(screen.getByLabelText("Confirm terminal PIN"), "111111");
  await userEvent.click(screen.getByRole("button", { name: "Set PIN and unlock" }));
  expect(setup).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/different/i);
  await userEvent.clear(screen.getByLabelText("New terminal PIN"));
  await userEvent.type(screen.getByLabelText("New terminal PIN"), "222222");
  await userEvent.clear(screen.getByLabelText("Confirm terminal PIN"));
  await userEvent.type(screen.getByLabelText("Confirm terminal PIN"), "222222");
  await userEvent.click(screen.getByRole("button", { name: "Set PIN and unlock" }));
  expect(setup).toHaveBeenCalledWith("ana", "111111", "222222");
  expect(useOperatorStore.getState().operator?.userId).toBe("ana");
  expect(localStorage.getItem("sentry-operator")).toBeNull();
});
test("a missing owner PIN directs the owner to portal settings, never cashier setup", async () => {
  setApiForTests({ listOperators: async () => [{ ...owner, requiresSetup: true }] } as unknown as PosApi);
  render(<OperatorUnlockScreen />);
  await userEvent.click(await screen.findByRole("button", { name: /Owner.*owner/i }));
  expect(screen.getByText(/set.*owner PIN.*portal settings/i)).toBeInTheDocument();
  expect(screen.queryByLabelText("Temporary PIN")).toBeNull();
});
test("a drawer may only be resumed by its original operator", async () => {
  useShiftStore.setState({ shift: { id: "drawer", openedAt: "", closedAt: null, openingCashC: 0, cashMovements: [], operatorUserId: "ana" }, hydrated: true });
  render(<OperatorUnlockScreen />);
  expect(await screen.findByRole("button", { name: /Owner.*owner/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Ana.*cashier/i })).toBeEnabled();
});
test("an unavailable operator offers a counted emergency close without takeover", async () => {
  useShiftStore.setState({ shift: { id: "drawer", openedAt: "2026-09-29T00:00:00Z", closedAt: null, openingCashC: null, cashMovements: [], operatorUserId: "inactive" }, hydrated: true });
  render(<OperatorUnlockScreen />);
  expect(await screen.findByRole("button", { name: "Emergency close" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Emergency close" }));
  expect(screen.getByLabelText("Emergency close reason")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Submit counted close" })).toBeDisabled();
  expect(useOperatorStore.getState().token).toBeNull();
});
