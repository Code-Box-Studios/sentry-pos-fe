import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ActionApproval, CompletedSale } from "@/api/types";
import { useCatalogStore } from "@/state/catalog";
import { useOperatorStore } from "@/state/operator";
import { VoidDialog } from "@/components/history/VoidDialog";
import { ActionApprovalForm } from "./ActionApprovalForm";

const { listOperators, voidSale } = vi.hoisted(() => ({ listOperators: vi.fn(), voidSale: vi.fn() }));
vi.mock("@/api", () => ({ getApi: () => ({ listOperators, voidSale }) }));
beforeEach(() => {
  vi.clearAllMocks();
  listOperators.mockResolvedValue([
    { userId: "owner", name: "Maria", role: "owner", requiresSetup: false },
    { userId: "manager", name: "Ben", role: "manager", requiresSetup: false },
    { userId: "ana", name: "Ana", role: "cashier", requiresSetup: false },
    { userId: "pending", name: "Pending manager", role: "manager", requiresSetup: true },
  ]);
  useOperatorStore.getState().unlock({ operator: { userId: "ana", name: "Ana", role: "cashier" }, token: "ana-token", expiresAt: new Date(Date.now() + 43_200_000).toISOString() });
  vi.spyOn(useCatalogStore.getState(), "refreshStock").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

function Form() {
  const [value, onChange] = useState<ActionApproval | null>(null);
  return <ActionApprovalForm value={value} onChange={onChange} />;
}

test("lists only ready privileged people and clears PIN when a different approver is selected", async () => {
  render(<Form />);
  const select = await screen.findByRole("combobox", { name: "Approver" });
  await screen.findByRole("option", { name: "Ben · Manager" });
  expect(screen.queryByRole("option", { name: /Ana/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /Pending/ })).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.selectOptions(select, "manager");
  await user.type(screen.getByLabelText("Approver PIN"), "654321");
  await user.selectOptions(select, "owner");
  expect(screen.getByLabelText("Approver PIN")).toHaveValue("");
  expect(useOperatorStore.getState().token).toBe("ana-token");
});

test("cashier void requires separate approval and never takes over the operator", async () => {
  const sale = { id: "sale", receiptNo: "MAIN-T1-000001", totals: { totalC: 10000 } } as CompletedSale;
  voidSale.mockResolvedValue({ ...sale, status: "voided" });
  const onDone = vi.fn();
  render(<VoidDialog sale={sale} open onClose={vi.fn()} onDone={onDone} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Reason"), "Duplicate");
  expect(screen.getByRole("button", { name: "Void sale" })).toBeDisabled();
  await user.selectOptions(await screen.findByRole("combobox", { name: "Approver" }), "manager");
  await user.type(screen.getByLabelText("Approver PIN"), "654321");
  await user.click(screen.getByRole("button", { name: "Void sale" }));
  expect(voidSale).toHaveBeenCalledWith("sale", "Duplicate", { approverUserId: "manager", pin: "654321" });
  expect(onDone).toHaveBeenCalledOnce();
  expect(useOperatorStore.getState().operator?.userId).toBe("ana");
  expect(useOperatorStore.getState().token).toBe("ana-token");
});
