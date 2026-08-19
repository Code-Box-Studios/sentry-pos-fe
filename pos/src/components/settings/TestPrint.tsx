"use client";

import { ReceiptView } from "@/components/receipt/ReceiptView";
import { printNode } from "@/components/receipt/printReceipt";
import { SAMPLE_SALE } from "@/components/receipt/sampleSale";
import { Button } from "@/components/ui/button";
import type { BranchInfo, BusinessSettings } from "@/domain/types";
import type { PaperWidth } from "@/state/settings";

export function sampleReceipt(business: BusinessSettings, branch: BranchInfo, terminalCode: string) {
  return <ReceiptView sale={SAMPLE_SALE} business={business} branch={branch} terminalCode={terminalCode} />;
}

export function TestPrint({
  business,
  branch,
  terminalCode,
  paperWidth,
}: {
  business: BusinessSettings;
  branch: BranchInfo;
  terminalCode: string;
  paperWidth: PaperWidth;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => printNode(sampleReceipt(business, branch, terminalCode), paperWidth)}
    >
      Test print
    </Button>
  );
}
