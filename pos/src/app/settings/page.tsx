"use client";

import { useEffect, useState } from "react";
import { getApi } from "@/api";
import { TopBar } from "@/components/chrome/TopBar";
import { ReceiptView } from "@/components/receipt/ReceiptView";
import { SAMPLE_SALE } from "@/components/receipt/sampleSale";
import { TestPrint } from "@/components/settings/TestPrint";
import { UnpairDialog } from "@/components/settings/UnpairDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatManilaTime } from "@/lib/time";
import { APP_VERSION } from "@/lib/version";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";
import { useSettingsStore, type PaperWidth } from "@/state/settings";

const WIDTHS: PaperWidth[] = ["58", "80"];

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex-row flex-wrap items-center gap-4 p-5">
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="text-[15px] font-semibold text-ink">{title}</div>
        <div className="text-[13px] text-steel">{description}</div>
      </div>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const paperWidth = useSettingsStore((s) => s.paperWidth);
  const setPaperWidth = useSettingsStore((s) => s.setPaperWidth);
  const catalog = useCatalogStore((s) => s.catalog);
  const business = usePairingStore((s) => s.business);
  const branch = usePairingStore((s) => s.branch);
  const terminalName = usePairingStore((s) => s.terminalName ?? "");
  const terminalCode = usePairingStore((s) => s.terminalCode ?? "");

  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [unpairOpen, setUnpairOpen] = useState(false);

  useEffect(() => {
    getApi()
      .health()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
  }, []);

  const loadedAt = catalog?.loadedAt ? formatManilaTime(catalog.loadedAt) : "—";

  return (
    <main className="flex h-dvh flex-col bg-surface">
      <TopBar active="settings" />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-6 lg:max-w-[720px]">
        <SettingCard title="Receipt paper width" description="Sets the print stylesheet">
          <div className="flex gap-1.5">
            {WIDTHS.map((w) => (
              <Button
                key={w}
                size="sm"
                variant={paperWidth === w ? "dark" : "secondary"}
                className={paperWidth === w ? "" : "border-hairline"}
                onClick={() => setPaperWidth(w)}
              >
                {w} mm
              </Button>
            ))}
          </div>
          {business && branch && (
            <TestPrint business={business} branch={branch} terminalCode={terminalCode} paperWidth={paperWidth} />
          )}
        </SettingCard>

        <SettingCard
          title="Receipt preview"
          description="Header, footer, and TIN come from the portal's business settings"
        >
          <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
        </SettingCard>

        <SettingCard
          title="Connection"
          description={`${healthy === false ? "Offline" : "Online"} · ${
            healthy === false ? "API unreachable" : "API reachable"
          } · last catalog load ${loadedAt}`}
        >
          <Badge variant={healthy === false ? "warn" : "soft-green"}>
            {healthy === false ? "UNREACHABLE" : "HEALTHY"}
          </Badge>
        </SettingCard>

        <SettingCard
          title={
            business && branch
              ? `Paired to ${business.name} — ${branch.name} (${branch.code}), ${terminalName}`
              : "Not paired"
          }
          description="Unpairing requires the owner to sign in. The owner can also unpair remotely from the portal."
        >
          <Button variant="outline-destructive" size="sm" onClick={() => setUnpairOpen(true)}>
            Unpair…
          </Button>
        </SettingCard>

        <p className="px-1 text-[13px] text-stone">
          Sentry POS v{APP_VERSION} · refund PIN is managed in the owner portal
        </p>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90dvh] gap-4 overflow-y-auto rounded-xl sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-ink">Receipt preview</DialogTitle>
          </DialogHeader>
          {business && branch && (
            <div className="mx-auto" style={{ width: paperWidth === "58" ? 240 : 320 }}>
              <ReceiptView
                sale={SAMPLE_SALE}
                business={business}
                branch={branch}
                terminalCode={terminalCode}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UnpairDialog open={unpairOpen} onClose={() => setUnpairOpen(false)} />
    </main>
  );
}
