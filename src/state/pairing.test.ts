import { usePairingStore, formatReceiptNo } from "./pairing";

test("formatReceiptNo pads and prefixes demo", () => {
  expect(formatReceiptNo("MKT", "T1", 318, false)).toBe("MKT-T1-000318");
  expect(formatReceiptNo("MKT", "T1", 1, true)).toBe("DEMO-MKT-T1-000001");
});

test("peek does not consume the sequence; commit advances it", () => {
  usePairingStore.setState({
    status: "paired", terminalCode: "T1", receiptSeq: 1,
    branch: { id: "b", name: "Marikit", code: "MKT", address: "" },
    business: { id: "x", name: "Kape Diaria", type: "mixed", currency: "PHP", taxRate: 0.12, serviceChargeRate: 0.05, allowMiscItems: true, isDemo: false, dayStartTime: "04:00", receiptHeader: "", receiptFooter: "" },
    deviceToken: "t", terminalName: "Counter 1",
  });
  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000001");
  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000001"); // peek is idempotent
  usePairingStore.getState().commitReceiptSeq();
  expect(usePairingStore.getState().peekReceiptNo()).toBe("MKT-T1-000002");
});
