import { render, screen } from "@testing-library/react";
import type { BusinessSettings } from "@/domain/types";
import { usePairingStore } from "@/state/pairing";
import { TopBar } from "./TopBar";

const business = (isDemo: boolean): BusinessSettings => ({
  id: isDemo ? "biz-kape-demo" : "biz-kape",
  name: isDemo ? "Kape Diaria (Demo)" : "Kape Diaria",
  type: "mixed",
  currency: "PHP",
  taxRate: 0.12,
  serviceChargeRate: 0.05,
  allowMiscItems: true,
  isDemo,
  dayStartTime: "04:00",
  receiptHeader: "",
  receiptFooter: "",
});

function pair(isDemo: boolean) {
  usePairingStore.setState({
    status: "paired",
    hydrated: true,
    deviceToken: "t",
    terminalName: "Counter 1",
    terminalCode: "T1",
    receiptSeq: 1,
    branch: { id: "branch-mkt", name: "Marikit", code: "MKT", address: "" },
    business: business(isDemo),
  });
}

test("renders the five nav pills, the terminal chip, and no DEMO badge for a real business", () => {
  pair(false);
  render(<TopBar active="sale" />);
  for (const label of ["Sale", "History", "Shift", "Stock", "Settings"]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
  expect(screen.getByText("MKT · T1")).toBeInTheDocument();
  expect(screen.queryByText("DEMO")).toBeNull();
});

test("shows the DEMO badge when paired to the demo business", () => {
  pair(true);
  render(<TopBar active="history" />);
  expect(screen.getByText("DEMO")).toBeInTheDocument();
});
