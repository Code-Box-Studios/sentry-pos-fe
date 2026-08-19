import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import type { CatalogPayload } from "@/domain/types";
import { useCartStore } from "@/state/cart";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";
import { useSettingsStore } from "@/state/settings";
import { useShiftStore } from "@/state/shift";
import { pairForTest, seedCatalogForTest } from "@/test/utils";
import SettingsPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/settings",
}));

let api: MockPosApi;
let catalog: CatalogPayload;

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
    deviceToken: "device-1",
    terminalName: "Counter 1",
    terminalCode: "T1",
    receiptSeq: 1,
    branch: catalog.branch,
    business: catalog.business,
  });
  useSettingsStore.setState({ paperWidth: "80" });
  useCartStore.getState().resetAll();
  useShiftStore.setState({ shift: null, hydrated: false });
});

afterEach(() => setApiForTests(null));

test("the paper width toggle persists", async () => {
  const user = userEvent.setup();
  render(<SettingsPage />);

  await user.click(screen.getByRole("button", { name: "58 mm" }));
  expect(useSettingsStore.getState().paperWidth).toBe("58");
  expect(localStorage.getItem("sentry-pos:settings")).toContain(`"paperWidth":"58"`);
});

test("the header names the pairing and the version", async () => {
  render(<SettingsPage />);
  expect(
    screen.getByText("Paired to Kape Diaria — Marikit (MKT), Counter 1")
  ).toBeInTheDocument();
  expect(screen.getByText(/^Sentry POS v\d+\.\d+\.\d+ · refund PIN is managed in the owner portal$/)).toBeInTheDocument();
  expect(await screen.findByText("HEALTHY")).toBeInTheDocument();
});

test("the receipt preview shows a sample at business branding only", async () => {
  const user = userEvent.setup();
  render(<SettingsPage />);

  await user.click(screen.getByRole("button", { name: "Preview" }));
  expect(await screen.findByText("KAPE DIARIA")).toBeInTheDocument();
  expect(screen.getByText("SAMPLE-0000")).toBeInTheDocument();
});

test("unpairing with the wrong password fails inline and keeps the terminal paired", async () => {
  const user = userEvent.setup();
  render(<SettingsPage />);

  await user.click(screen.getByRole("button", { name: "Unpair…" }));
  await user.type(await screen.findByLabelText("Email"), "maria@kapediaria.ph");
  await user.type(screen.getByLabelText("Password"), "nope");
  await user.click(screen.getByRole("button", { name: "Unpair" }));

  expect(await screen.findByText("Wrong email or password")).toBeInTheDocument();
  expect(usePairingStore.getState().status).toBe("paired");
});

test("unpairing with the right credentials resets the terminal", async () => {
  const user = userEvent.setup();
  useCartStore.getState().addProduct(catalog.products.find((p) => p.id === "prod-espresso")!);
  await useShiftStore.getState().open(0);

  render(<SettingsPage />);

  await user.click(screen.getByRole("button", { name: "Unpair…" }));
  await user.type(await screen.findByLabelText("Email"), "maria@kapediaria.ph");
  await user.type(screen.getByLabelText("Password"), "sentry-demo");
  await user.click(screen.getByRole("button", { name: "Unpair" }));

  await vi.waitFor(() => expect(usePairingStore.getState().status).toBe("unpaired"));
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
  expect(useShiftStore.getState().shift).toBeNull();
  expect(replace).toHaveBeenCalledWith("/pair");
});

test("a portal remote-unpair resets the terminal on the next catalog call", async () => {
  api.debugRevokeDevice();

  await useCatalogStore.getState().refresh();

  expect(usePairingStore.getState().status).toBe("unpaired");
  expect(usePairingStore.getState().deviceToken).toBeNull();
});
