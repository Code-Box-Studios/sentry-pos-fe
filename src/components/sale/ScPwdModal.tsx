"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/state/cart";

/** Captures the ID that has to print on the receipt (project-spec §7). */
export function ScPwdModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const scPwd = useCartStore((s) => s.cart.scPwd);
  const setScPwd = useCartStore((s) => s.setScPwd);
  const [idNo, setIdNo] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setIdNo(scPwd?.idNo ?? "");
      setName(scPwd?.name ?? "");
    }
  }, [open, scPwd]);

  const valid = idNo.trim() !== "" && name.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-5 rounded-xl sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">SC / PWD discount</DialogTitle>
          <p className="text-sm text-steel">
            VAT is removed first, then 20% off — applied per line; a line takes SC/PWD or a promo discount,
            whichever is higher.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="scpwd-id" className="text-[13px] font-semibold text-ink">ID number</Label>
          <Input id="scpwd-id" value={idNo} onChange={(e) => setIdNo(e.target.value)} placeholder="SC-1234-5678" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="scpwd-name" className="text-[13px] font-semibold text-ink">Name</Label>
          <Input id="scpwd-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jose Cruz" />
        </div>

        <div className="flex gap-2.5">
          {scPwd ? (
            <Button
              variant="outline-destructive"
              className="flex-1"
              onClick={() => {
                setScPwd(null);
                onClose();
              }}
            >
              Remove SC/PWD
            </Button>
          ) : (
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              setScPwd({ idNo: idNo.trim(), name: name.trim() });
              onClose();
            }}
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
