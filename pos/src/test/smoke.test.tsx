import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

test("restyled button renders as a pill with label", () => {
  render(<Button>Pair terminal</Button>);
  const btn = screen.getByRole("button", { name: "Pair terminal" });
  expect(btn).toBeInTheDocument();
  expect(btn.className).toContain("rounded-full");
});
