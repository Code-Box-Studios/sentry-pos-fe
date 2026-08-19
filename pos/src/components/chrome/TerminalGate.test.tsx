import { render, screen } from "@testing-library/react";
import { usePairingStore } from "@/state/pairing";
import { TerminalGate } from "./TerminalGate";

const replace = vi.fn();
let pathname = "/sale";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => pathname,
}));

beforeEach(() => {
  replace.mockClear();
  usePairingStore.setState({ status: "unpaired", hydrated: true, deviceToken: null, business: null, branch: null });
});

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

test("a paired terminal never sees /pair again", () => {
  pathname = "/pair";
  usePairingStore.setState({ status: "paired", hydrated: true, deviceToken: "t" });
  render(<TerminalGate><div>content</div></TerminalGate>);
  expect(replace).toHaveBeenCalledWith("/sale");
});

test("children stay hidden until the persisted pairing rehydrates", () => {
  pathname = "/sale";
  usePairingStore.setState({ hydrated: false });
  render(<TerminalGate><div>content</div></TerminalGate>);
  expect(screen.queryByText("content")).toBeNull();
  expect(replace).not.toHaveBeenCalled();
});
