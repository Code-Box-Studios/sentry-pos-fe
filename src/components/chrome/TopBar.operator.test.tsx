import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCartStore } from "@/state/cart";
import { useOperatorStore } from "@/state/operator";
import { usePairingStore } from "@/state/pairing";
import { TopBar } from "./TopBar";

const { replace, lockOperator } = vi.hoisted(() => ({ replace: vi.fn(), lockOperator: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/api", () => ({ getApi: () => ({ lockOperator }) }));

beforeEach(() => {
  vi.clearAllMocks();
  lockOperator.mockResolvedValue(undefined);
  useOperatorStore.getState().unlock({
    operator: { userId: "ana", name: "Ana Reyes", role: "cashier" },
    token: "memory-only-token", expiresAt: new Date(Date.now() + 43_200_000).toISOString(),
  });
  usePairingStore.setState({ deviceToken: "paired-device", status: "paired" });
  useCartStore.getState().resetAll();
  useCartStore.getState().ensurePendingIds();
});

test("names the cashier, offers own activity and locks without discarding payment intent", async () => {
  const pending = useCartStore.getState().pendingSaleId;
  render(<TopBar active="sale" />);
  expect(screen.getByText("Ana Reyes")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "My activity" })).toHaveAttribute("href", "/activity");
  await userEvent.setup().click(screen.getByRole("button", { name: "Lock terminal" }));
  expect(lockOperator).toHaveBeenCalledOnce();
  expect(useOperatorStore.getState().token).toBeNull();
  expect(usePairingStore.getState().deviceToken).toBe("paired-device");
  expect(useCartStore.getState().pendingSaleId).toBe(pending);
  expect(replace).toHaveBeenCalledWith("/unlock");
});

test("local lock still takes effect if the network is unavailable", async () => {
  lockOperator.mockRejectedValue(new Error("Offline"));
  render(<TopBar active="sale" />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Lock terminal" }));
  expect(useOperatorStore.getState().operator).toBeNull();
});
