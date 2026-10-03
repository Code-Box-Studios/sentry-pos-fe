import { act, fireEvent } from "@testing-library/react";
import { printNode } from "./printReceipt";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ""; });

test("printing waits for receipt images to load", async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="print-root"></div>';
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  // eslint-disable-next-line @next/next/no-img-element
  await act(async () => { printNode(<img src="https://media.example/logo.png" alt="logo" />, "58"); });
  await act(async () => { vi.advanceTimersByTime(0); });
  expect(print).not.toHaveBeenCalled();
  await act(async () => { fireEvent.load(document.querySelector("img")!); });
  expect(print).toHaveBeenCalledOnce();
  await act(async () => { window.dispatchEvent(new Event("afterprint")); vi.runOnlyPendingTimers(); });
});
