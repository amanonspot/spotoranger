"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Smartphone, Wallet } from "lucide-react";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import { SubmissionsTable } from "@/components/admin-shell/submissions-table";
import { SpotoCard } from "@/design-system/components/card";
import { getRanger, type RangerDetail } from "@/lib/api/admin";
import { formatInr } from "@/lib/format";

const PLATFORM_LABELS: Record<string, string> = {
  zomato: "Zomato",
  swiggy: "Swiggy",
  blinkit: "Blinkit",
  zepto: "Zepto",
  bigbasket: "BigBasket",
  swish: "Swish",
  other: "Other",
};

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-spoto-muted">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="text-right font-heading text-sm font-semibold text-spoto-ink">{value}</span>
    </div>
  );
}

function RangerDetailContent() {
  const params = useParams<{ id: string }>();
  const [ranger, setRanger] = useState<RangerDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!params?.id) return;
    getRanger(params.id)
      .then((data) => {
        setRanger(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [params?.id]);

  if (state === "loading") return <SpotoCard className="text-center text-sm text-spoto-muted">Loading…</SpotoCard>;
  if (state === "error" || !ranger) return <SpotoCard className="text-center text-sm text-spoto-muted">Ranger not found.</SpotoCard>;

  return (
    <>
      <Link href="/rangers" className="mb-4 inline-flex items-center gap-2 text-sm font-heading font-semibold text-spoto-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to rangers
      </Link>

      <header className="pb-4">
        <p className="font-mono text-xs text-spoto-muted">Ranger {ranger.shortId}</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-spoto-ink">{ranger.fullName}</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <SpotoCard className="divide-y divide-spoto-line lg:col-span-1">
          <InfoRow icon={Smartphone} label="Phone" value={ranger.phone} />
          <InfoRow icon={Wallet} label="Platform" value={PLATFORM_LABELS[ranger.deliveryPlatform] ?? ranger.deliveryPlatform} />
          <InfoRow icon={MapPin} label="Preferred area" value={ranger.preferredArea} />
          <InfoRow icon={Wallet} label="UPI ID" value={ranger.upiId || "—"} />
        </SpotoCard>

        <SpotoCard className="border-none bg-gradient-to-br from-spoto-purple to-[#7c4fd0] text-white lg:col-span-2">
          <p className="text-sm text-white/75">Wallet balance</p>
          <p className="mt-2 font-heading text-4xl font-bold">{formatInr(ranger.wallet.currentBalance)}</p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-white/65">Lifetime</p>
              <p className="font-heading font-semibold">{formatInr(ranger.wallet.lifetimeEarnings)}</p>
            </div>
            <div>
              <p className="text-white/65">Pending</p>
              <p className="font-heading font-semibold">{formatInr(ranger.wallet.pendingRewards)}</p>
            </div>
            <div>
              <p className="text-white/65">Withdrawn</p>
              <p className="font-heading font-semibold">{formatInr(ranger.wallet.withdrawnAmount)}</p>
            </div>
          </div>
        </SpotoCard>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-bold">Submissions ({ranger.submissions.length})</h2>
        <SubmissionsTable rows={ranger.submissions} />
      </section>
    </>
  );
}

export default function RangerDetailPage() {
  return (
    <AdminShell>
      <RangerDetailContent />
    </AdminShell>
  );
}
