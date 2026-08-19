"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getApi } from "@/api";
import { ApiError } from "@/api/errors";
import type { BusinessSummary, OwnerSession } from "@/api/types";
import type { BranchInfo } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCatalogStore } from "@/state/catalog";
import { usePairingStore } from "@/state/pairing";

function message(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

function DoneRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-6 items-center justify-center rounded-full bg-brand-green text-[13px] font-semibold text-ink">
        ✓
      </div>
      <div className="text-sm text-slate">
        {label} — <span className="font-semibold text-ink">{value}</span>
      </div>
    </div>
  );
}

/** First launch: owner sign-in binds this device to exactly one branch (pos-spec §3). */
export function PairingFlow() {
  const router = useRouter();
  const pair = usePairingStore((s) => s.pair);
  const refreshCatalog = useCatalogStore((s) => s.refresh);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<OwnerSession | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [terminalName, setTerminalName] = useState("Counter 1");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const business = businesses.find((b) => b.id === businessId) ?? null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSignInError(null);
    try {
      const api = getApi();
      const s = await api.ownerSignIn(email, password);
      setSession(s);
      setBusinesses(await api.listBusinesses(s));
    } catch (err) {
      setSignInError(message(err, "Could not sign in"));
    } finally {
      setBusy(false);
    }
  }

  async function chooseBusiness(id: string) {
    if (!session) return;
    setBusinessId(id);
    setBranchId(null);
    setPairError(null);
    setBusy(true);
    try {
      setBranches(await getApi().listBranches(session, id));
    } catch (err) {
      setPairError(message(err, "Could not load branches"));
    } finally {
      setBusy(false);
    }
  }

  async function handlePair() {
    if (!session || !businessId || !branchId) return;
    setBusy(true);
    setPairError(null);
    try {
      const result = await getApi().pairTerminal(session, businessId, branchId, terminalName);
      pair(result);
      await refreshCatalog();
      router.replace("/sale");
    } catch (err) {
      setPairError(message(err, "Could not pair this terminal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink p-6">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-7">
        <Image src="/brand/sentry-mark-reverse.svg" alt="Sentry" width={64} height={64} className="size-16" priority />
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-[28px] font-medium text-white">Pair this terminal</h1>
          <p className="text-[15px] text-white/64">Sign in as the business owner to bind this device to one branch.</p>
        </div>

        <Card className="w-full gap-5 p-8">
          {!session ? (
            <form className="flex flex-col gap-5" onSubmit={handleSignIn}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-[13px] font-semibold text-ink">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@business.ph"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-[13px] font-semibold text-ink">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {signInError && <p className="text-sm text-danger">{signInError}</p>}
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy || !email || !password}>
                Sign in
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <DoneRow label="Signed in" value={session.email} />

              {business ? (
                <DoneRow label="Business" value={business.name} />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="text-[13px] font-semibold text-ink">Business</div>
                  <div className="flex flex-wrap gap-2">
                    {businesses.map((b) => (
                      <Button key={b.id} size="sm" variant="secondary" onClick={() => chooseBusiness(b.id)} disabled={busy}>
                        {b.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {business && (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="text-[13px] font-semibold text-ink">Branch</div>
                    <div className="flex flex-wrap gap-2">
                      {branches.map((b) => (
                        <Button
                          key={b.id}
                          size="sm"
                          variant={b.id === branchId ? "dark" : "secondary"}
                          onClick={() => setBranchId(b.id)}
                          disabled={busy}
                        >
                          {b.name} — {b.code}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="terminal-name" className="text-[13px] font-semibold text-ink">Terminal name</Label>
                    <Input
                      id="terminal-name"
                      value={terminalName}
                      onChange={(e) => setTerminalName(e.target.value)}
                    />
                  </div>

                  {pairError && <p className="text-sm text-danger">{pairError}</p>}

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handlePair}
                    disabled={busy || !branchId || !terminalName.trim()}
                  >
                    Pair terminal
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>

        <p className="text-[13px] text-white/48">One terminal, one branch. Moving the device is unpair + re-pair.</p>
      </div>
    </main>
  );
}
