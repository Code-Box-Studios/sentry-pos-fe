import { render, screen } from "@testing-library/react";
import { ClosePanel } from "./ClosePanel";
import type { ShiftTotals } from "@/api/types";
test("blind close never reveals expected cash or over/short before submission", () => {
  const totals = { grossC: 10000, saleCount: 1, byMethod: { cash: null, card: 0, gcash: 0, maya: 0, other: 0 }, voidCount: 0, voidAmountC: 0, refundCount: 0, refundAmountC: 0, scPwdDiscountC: 0, serviceChargeC: 0, expectedCashC: null, cashSalesC: null, cashRefundsC: null, cashInC: null, cashOutC: null, blindCloseEnabled: true };
  render(<ClosePanel totals={totals as unknown as ShiftTotals} openingCashC={0} heldCount={0} countedCashC={12000} onCountedChange={vi.fn()} onClose={vi.fn()} busy={false} />);
  expect(screen.queryByText(/Expected:/)).toBeNull();
  expect(screen.queryByText("Over / short")).toBeNull();
  expect(screen.getByText(/revealed after.*submit/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Close.*print Z/ })).toBeEnabled();
});
