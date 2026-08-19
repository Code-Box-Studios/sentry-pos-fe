import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import { usePairingStore } from "@/state/pairing";
import { PairingFlow } from "./PairingFlow";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/pair",
}));

beforeEach(() => {
  replace.mockClear();
  resetMockState();
  setApiForTests(new MockPosApi({ latencyMs: 0 }));
  usePairingStore.setState({ status: "unpaired", hydrated: true, deviceToken: null, business: null, branch: null, terminalCode: null });
});

afterEach(() => setApiForTests(null));

async function signIn(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(screen.getByLabelText("Email"), "maria@kapediaria.ph");
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

test("owner signs in, picks branch, names the terminal, and pairs", async () => {
  const user = userEvent.setup();
  render(<PairingFlow />);

  await signIn(user, "sentry-demo");
  await user.click(await screen.findByRole("button", { name: "Kape Diaria" }));
  await user.click(await screen.findByRole("button", { name: "Marikit — MKT" }));
  expect(screen.getByLabelText("Terminal name")).toHaveValue("Counter 1");
  await user.click(screen.getByRole("button", { name: "Pair terminal" }));

  await vi.waitFor(() => expect(usePairingStore.getState().status).toBe("paired"));
  expect(usePairingStore.getState().terminalCode).toBe("T1");
  expect(usePairingStore.getState().branch?.code).toBe("MKT");
  // Pairing records the device and stops. Routing belongs to TerminalGate, which knows whether a
  // shift is open; this form used to send everyone to /sale and have them bounced out again.
  expect(replace).not.toHaveBeenCalled();
});

test("a wrong password surfaces inline and leaves the terminal unpaired", async () => {
  const user = userEvent.setup();
  render(<PairingFlow />);

  await signIn(user, "nope");

  expect(await screen.findByText("Wrong email or password")).toBeInTheDocument();
  expect(usePairingStore.getState().status).toBe("unpaired");
});
