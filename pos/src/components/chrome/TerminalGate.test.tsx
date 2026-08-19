import { render, screen } from "@testing-library/react";
import { setApiForTests } from "@/api";
import type { PosApi } from "@/api/client";
import type { Shift } from "@/api/types";
import { usePairingStore } from "@/state/pairing";
import { useShiftStore } from "@/state/shift";
import { TerminalGate } from "./TerminalGate";

const replace = vi.fn();
let pathname = "/sale";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => pathname,
}));

const OPEN_SHIFT = { id: "shift-1" } as Shift;

beforeEach(() => {
  replace.mockClear();
  usePairingStore.setState({ status: "unpaired", hydrated: true, deviceToken: null, business: null, branch: null });
  useShiftStore.setState({ shift: null, hydrated: false });
  // A paired gate boots the catalogue and the shift. Stubbing both as never-settling keeps the shift
  // store exactly where each test puts it, so "has not answered yet" stays distinguishable from
  // "answered: no shift".
  setApiForTests({
    pullCatalog: () => new Promise(() => {}),
    getCurrentShift: () => new Promise(() => {}),
  } as unknown as PosApi);
});

afterEach(() => setApiForTests(null));

test("an unpaired terminal is pushed to /pair from anywhere else", () => {
  pathname = "/sale";
  render(<TerminalGate><div>content</div></TerminalGate>);
  expect(replace).toHaveBeenCalledWith("/pair");
});

test("an unpaired terminal stays on /pair", () => {
  pathname = "/pair";
  render(<TerminalGate><div>content</div></TerminalGate>);
  expect(replace).not.toHaveBeenCalled();
  expect(screen.getByText("content")).toBeInTheDocument();
});

test("a freshly paired terminal goes straight to /shift-open, not through /sale", () => {
  pathname = "/pair";
  usePairingStore.setState({ status: "paired", hydrated: true, deviceToken: "t" });
  useShiftStore.setState({ shift: null, hydrated: true });
  render(<TerminalGate><div>content</div></TerminalGate>);
  expect(replace).toHaveBeenCalledExactlyOnceWith("/shift-open");
});

test("a paired terminal with a shift already open lands on /sale", () => {
  pathname = "/pair";
  usePairingStore.setState({ status: "paired", hydrated: true, deviceToken: "t" });
  useShiftStore.setState({ shift: OPEN_SHIFT, hydrated: true });
  render(<TerminalGate><div>content</div></TerminalGate>);
  expect(replace).toHaveBeenCalledExactlyOnceWith("/sale");
});

test("a paired terminal waits for the first getCurrentShift before picking a screen", () => {
  pathname = "/pair";
  usePairingStore.setState({ status: "paired", hydrated: true, deviceToken: "t" });
  useShiftStore.setState({ shift: null, hydrated: false });
  render(<TerminalGate><div>content</div></TerminalGate>);
  // Guessing /sale here and correcting once the answer arrives is the second route transition that
  // made pairing feel slow.
  expect(replace).not.toHaveBeenCalled();
});

test("children stay hidden until the persisted pairing rehydrates", () => {
  pathname = "/sale";
  usePairingStore.setState({ hydrated: false });
  render(<TerminalGate><div>content</div></TerminalGate>);
  expect(screen.queryByText("content")).toBeNull();
  expect(replace).not.toHaveBeenCalled();
});
