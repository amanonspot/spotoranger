"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IndianRupee, MapPin, Plus, WalletCards } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { LeadCard } from "@/components/leads/lead-card";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { getWallet, listLeads, type LeadSummary, type WalletSummary } from "@/lib/api/ranger";
import { useSession } from "@/lib/auth/session";
import { formatInr } from "@/lib/format";

function HomeContent() {
  const { session } = useSession();
  const rangerId = session?.rangerId ?? null;
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [leads, setLeads] = useState<LeadSummary[]>([]);

  useEffect(() => {
    if (!rangerId) return;
    getWallet(rangerId).then(setWallet).catch(() => setWallet(null));
    listLeads(rangerId).then((all) => setLeads(all.slice(0, 3))).catch(() => setLeads([]));
  }, [rangerId]);

  const firstName = session?.fullName?.split(" ")[0] ?? "Ranger";

  return (
    <>
      <section className="pb-4">
        <p className="text-sm font-medium text-spoto-muted">Hello {firstName}</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-spoto-ink">
          Ready to submit a house?
        </h1>
      </section>

      <section>
        <SpotoCard className="border-none bg-gradient-to-br from-spoto-purple to-[#7c4fd0] text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/75">Current balance</p>
              <p className="mt-2 font-heading text-4xl font-bold">
                {formatInr(wallet?.currentBalance ?? 0)}
              </p>
            </div>
            <div className="rounded-full bg-white/15 p-3">
              <WalletCards aria-hidden className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-white/65">Lifetime</p>
              <p className="font-heading font-semibold">{formatInr(wallet?.lifetimeEarnings ?? 0)}</p>
            </div>
            <div>
              <p className="text-white/65">Pending</p>
              <p className="font-heading font-semibold">{formatInr(wallet?.pendingRewards ?? 0)}</p>
            </div>
            <div>
              <p className="text-white/65">Withdrawn</p>
              <p className="font-heading font-semibold">{formatInr(wallet?.withdrawnAmount ?? 0)}</p>
            </div>
          </div>
        </SpotoCard>
      </section>

      <section className="grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-3">
        <SpotoButton href="/submit" variant="cta" icon={<Plus className="h-5 w-5" />}>
          Submit New House
        </SpotoButton>
        <SpotoButton href="/leads" variant="secondary" icon={<MapPin className="h-5 w-5" />}>
          My Leads
        </SpotoButton>
        <SpotoButton href="/wallet" variant="secondary" icon={<IndianRupee className="h-5 w-5" />}>
          Withdraw
        </SpotoButton>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Recent leads</h2>
          <Link className="text-sm font-heading font-semibold text-spoto-green" href="/leads">
            View all
          </Link>
        </div>
        {leads.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        ) : (
          <SpotoCard className="text-center text-sm text-spoto-muted">
            No leads yet. Submit your first house to get started.
          </SpotoCard>
        )}
      </section>
    </>
  );
}

export default function RangerHomePage() {
  return (
    <AppShell>
      <HomeContent />
    </AppShell>
  );
}
