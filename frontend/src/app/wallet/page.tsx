"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { getWallet, type WalletSummary } from "@/lib/api/ranger";
import { useSession } from "@/lib/auth/session";
import { formatDate, formatInr } from "@/lib/format";

function txIcon(type: string) {
  if (type === "debit") return <ArrowUpRight className="h-4 w-4 text-red-400" />;
  if (type === "hold") return <Clock className="h-4 w-4 text-amber-300" />;
  return <ArrowDownLeft className="h-4 w-4 text-spoto-green" />;
}

function WalletContent() {
  const { session } = useSession();
  const rangerId = session?.rangerId ?? null;
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rangerId) {
      setLoading(false);
      return;
    }
    getWallet(rangerId)
      .then(setWallet)
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  }, [rangerId]);

  const stats = [
    { label: "Lifetime", value: wallet?.lifetimeEarnings ?? 0 },
    { label: "Pending", value: wallet?.pendingRewards ?? 0 },
    { label: "Withdrawn", value: wallet?.withdrawnAmount ?? 0 },
  ];

  return (
    <>
      <header className="pb-4">
        <p className="text-sm font-semibold text-spoto-purple">Wallet</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">Your rewards</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SpotoCard className="border-none bg-gradient-to-br from-spoto-purple to-[#7c4fd0] text-white">
          <p className="text-sm text-white/75">Current balance</p>
          <p className="mt-2 font-heading text-4xl font-bold">
            {formatInr(wallet?.currentBalance ?? 0)}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-white/65">{s.label}</p>
                <p className="font-heading font-semibold">{formatInr(s.value)}</p>
              </div>
            ))}
          </div>
        </SpotoCard>

        <SpotoCard className="flex flex-col justify-center gap-3">
          <p className="text-sm text-spoto-muted">
            Withdraw to{" "}
            <span className="font-heading font-semibold text-spoto-ink">aman@upi</span>
          </p>
          <SpotoButton
            variant="cta"
            onClick={() => toast.success("Withdrawal requested (demo)")}
            disabled={!wallet || wallet.currentBalance <= 0}
          >
            Withdraw {formatInr(wallet?.currentBalance ?? 0)}
          </SpotoButton>
        </SpotoCard>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-heading text-lg font-bold">Transactions</h2>
        {loading ? (
          <SpotoCard className="text-center text-sm text-spoto-muted">Loading…</SpotoCard>
        ) : wallet && wallet.transactions.length > 0 ? (
          <div className="grid gap-2">
            {wallet.transactions.map((tx) => (
              <SpotoCard key={tx.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5">
                    {txIcon(tx.type)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-semibold text-spoto-ink">
                      {tx.description}
                    </p>
                    <p className="text-xs text-spoto-muted">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 font-heading text-sm font-bold ${
                    tx.type === "debit" ? "text-red-400" : "text-spoto-green"
                  }`}
                >
                  {tx.type === "debit" ? "-" : "+"}
                  {formatInr(tx.amount)}
                </span>
              </SpotoCard>
            ))}
          </div>
        ) : (
          <SpotoCard className="text-center text-sm text-spoto-muted">No transactions yet.</SpotoCard>
        )}
      </section>
    </>
  );
}

export default function WalletPage() {
  return (
    <AppShell>
      <WalletContent />
    </AppShell>
  );
}
