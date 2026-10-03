import { render, screen } from "@testing-library/react";
import { setApiForTests } from "@/api";
import type { PosApi } from "@/api/client";
import { useOperatorStore } from "@/state/operator";
import ActivityPage from "./page";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(() => setApiForTests(null));
test("renders only the server-scoped cashier sales and closed drawer variance", async () => {
  useOperatorStore.setState({ operator: { userId: "ana", name: "Ana", role: "cashier" } });
  const getOperatorActivity = vi.fn().mockResolvedValue({
    sales: [{ id: "sale", receiptNo: "MAIN-T1-000001", createdAt: "2026-09-29T01:00:00Z", status: "completed", totalC: 12000, operatorUserId: "ana" }],
    shifts: [{ id: "shift", openedAt: "2026-09-29T00:00:00Z", closedAt: "2026-09-29T02:00:00Z", operatorUserId: "ana", overShortC: -100 }],
  });
  setApiForTests({ getOperatorActivity } as unknown as PosApi);
  render(<ActivityPage />);
  expect(await screen.findByText("MAIN-T1-000001")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "My activity" })).toBeInTheDocument();
  expect(screen.getByText("−₱1.00")).toBeInTheDocument();
  expect(getOperatorActivity).toHaveBeenCalledWith();
});
