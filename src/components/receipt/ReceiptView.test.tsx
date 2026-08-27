import { render, screen, within } from "@testing-library/react";
import { DESIGN_CART, DESIGN_SALE, FIXTURE_BRANCH, FIXTURE_BUSINESS, saleFrom } from "./fixtures";
import { ReceiptView } from "./ReceiptView";

function view(props: Partial<React.ComponentProps<typeof ReceiptView>> = {}) {
  return render(
    <ReceiptView
      sale={DESIGN_SALE}
      business={FIXTURE_BUSINESS}
      branch={FIXTURE_BRANCH}
      terminalCode="T1"
      {...props}
    />
  );
}

/** Finds the value printed next to a label on the same receipt row. */
function rowValue(label: string): string {
  const cell = screen.getByText(label);
  return cell.nextElementSibling?.textContent ?? "";
}

test("the header carries the business, never Sentry", () => {
  view();
  expect(screen.getByText("KAPE DIARIA")).toBeInTheDocument();
  expect(screen.getByText("Marikit Branch")).toBeInTheDocument();
  expect(screen.getByText("123 Gen. Ordoñez Ave, Marikina")).toBeInTheDocument();
  expect(screen.getByText("TIN 123-456-789-000")).toBeInTheDocument();
  expect(screen.queryByText(/sentry/i)).toBeNull();
});

test("receipt identity rows", () => {
  view();
  expect(rowValue("Receipt")).toBe("MKT-T1-000318");
  expect(rowValue("Date")).toBe("19 Aug 2026 10:42");
  expect(rowValue("Terminal")).toBe("MKT · T1");
});

test("an item line prints the modifier-inclusive unit price", () => {
  view();
  expect(screen.getByText("Iced Latte — Large 1×170.00")).toBeInTheDocument();
  expect(screen.getByText("+ Oat milk 25.00")).toBeInTheDocument();
  expect(screen.getByText("Pan de sal 6×12.00")).toBeInTheDocument();
  expect(screen.getByText("Jasmine rice 0.750×95.00")).toBeInTheDocument();
});

test("a line discount prints as its own indented note", () => {
  view();
  expect(screen.getByText("Ensaymada 2×55.00")).toBeInTheDocument();
  expect(screen.getByText("Merienda 10% −11.00")).toBeInTheDocument();
});

test("the totals block matches the spec-correct arithmetic", () => {
  view();
  expect(rowValue("Subtotal")).toBe("423.25");
  expect(rowValue("Discounts")).toBe("-11.00");
  expect(rowValue("Service charge 5%")).toBe("20.61");
  expect(rowValue("TOTAL")).toBe("432.86");
  expect(rowValue("Cash")).toBe("500.00");
  expect(rowValue("Change")).toBe("67.14");
});

test("the VAT breakdown balances against the total", () => {
  view();
  expect(rowValue("VATable sales")).toBe("386.48");
  expect(rowValue("VAT-exempt sales")).toBe("0.00");
  expect(rowValue("VAT 12% (included)")).toBe("46.38");
});

test("the footer comes from business settings", () => {
  view();
  expect(screen.getByText("Salamat po! Ingat!")).toBeInTheDocument();
});

test("a reprint is stamped", () => {
  const { container } = view({ reprint: true });
  expect(within(container).getByText("*** REPRINT ***")).toBeInTheDocument();
});

test("a voided sale is stamped too", () => {
  view({ sale: saleFrom(DESIGN_CART, { status: "voided", statusReason: "double tap" }) });
  expect(screen.getByText("*** VOIDED ***")).toBeInTheDocument();
});

test("an SC/PWD sale prints the ID that was presented", () => {
  const sale = saleFrom(
    { ...DESIGN_CART, orderType: "none", lines: [DESIGN_CART.lines[1]!], scPwd: { idNo: "SC-1234-5678", name: "Jose Cruz" } },
    {},
    10000
  );
  view({ sale });
  expect(screen.getByText("ID SC-1234-5678 — Jose Cruz")).toBeInTheDocument();
  // 6 × ₱12.00 = 72.00 → VAT off (64.29) → 20% off → 51.43, a 20.57 discount
  expect(rowValue("SC/PWD discount")).toBe("-20.57");
  expect(rowValue("TOTAL")).toBe("51.43");
  expect(rowValue("VAT-exempt sales")).toBe("51.43");
  expect(rowValue("VAT 12% (included)")).toBe("0.00");
});

test("a non-cash sale prints its reference number", () => {
  const sale = saleFrom(DESIGN_CART);
  view({
    sale: { ...sale, payment: { ...sale.payment, method: "gcash", referenceNo: "1029-3847", tenderedC: sale.totals.totalC, changeC: 0 } },
  });
  expect(rowValue("GCash")).toBe("432.86");
  expect(rowValue("Ref")).toBe("1029-3847");
  expect(screen.queryByText("Change")).toBeNull();
});
