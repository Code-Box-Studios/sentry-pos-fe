"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApi } from "@/api";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetTerminalState } from "@/lib/handle-api-error";

/** Unpairing is online-only and needs the owner to sign in again (pos-spec §11). */
export function UnpairDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await getApi().unpair(email, password);
      resetTerminalState();
      router.replace("/pair");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not unpair this terminal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-5 rounded-xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">Unpair this terminal</DialogTitle>
          <p className="text-sm text-steel">
            Sign in as the owner to confirm. Sales already recorded stay on the device; the terminal
            returns to the pairing screen.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="unpair-email" className="text-[13px] font-semibold text-ink">Email</Label>
          <Input
            id="unpair-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="unpair-password" className="text-[13px] font-semibold text-ink">Password</Label>
          <Input
            id="unpair-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={busy || !email || !password}
            onClick={submit}
          >
            Unpair
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
