import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MoneyPad } from "./MoneyPad";

const onChange = vi.fn();

function Harness({ initial = null }: { initial?: number | null }) {
  const [valueC, setValueC] = useState<number | null>(initial);
  return (
    <MoneyPad
      label="Opening cash"
      valueC={valueC}
      onChange={(c) => {
        onChange(c);
        setValueC(c);
      }}
    />
  );
}

const key = (k: string) => screen.getByRole("button", { name: k });
const display = () => screen.getByLabelText("Opening cash").textContent;

beforeEach(() => onChange.mockClear());

test("keying digits builds a grouped peso amount", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  expect(display()).toBe("₱0.00");
  for (const k of ["2", "0", "0", "0"]) await user.click(key(k));
  expect(display()).toBe("₱2,000.00");
  expect(onChange).toHaveBeenLastCalledWith(200000);
});

test("the decimal key enables centavos", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  for (const k of ["5", ".", "5", "0"]) await user.click(key(k));
  expect(display()).toBe("₱5.50");
  expect(onChange).toHaveBeenLastCalledWith(550);
});

test("centavos are capped at two places", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  for (const k of ["5", ".", "5", "0", "7"]) await user.click(key(k));
  expect(onChange).toHaveBeenLastCalledWith(550);
});

test("backspace deletes, and an empty display reports null", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  for (const k of ["1", "2"]) await user.click(key(k));
  expect(onChange).toHaveBeenLastCalledWith(1200);
  await user.click(key("Backspace"));
  expect(onChange).toHaveBeenLastCalledWith(100);
  await user.click(key("Backspace"));
  expect(onChange).toHaveBeenLastCalledWith(null);
  expect(display()).toBe("₱0.00");
});

test("a half-typed decimal is not a value yet", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(key("."));
  expect(display()).toBe("₱0.");
  expect(onChange).toHaveBeenLastCalledWith(null);
});

test("an externally set amount resyncs the keys", async () => {
  const user = userEvent.setup();
  render(<Harness initial={50000} />);
  expect(display()).toBe("₱500.00");
  await user.click(key("Backspace"));
  expect(display()).toBe("₱500.0");
});
