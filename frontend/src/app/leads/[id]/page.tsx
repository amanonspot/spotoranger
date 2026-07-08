"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell/app-shell";
import { SpotoCard } from "@/design-system/components/card";
import { StatusBadge, statusLabel } from "@/design-system/components/status-badge";
import { getLead, type LeadDetail } from "@/lib/api/ranger";
import { formatDate, formatInr } from "@/lib/format";

const BHK_LABELS: Record<string, string> = {
  "1_rk": "1 RK",
  "1_bhk": "1 BHK",
  "2_bhk": "2 BHK",
  "3_bhk": "3 BHK",
  "4_bhk_plus": "4 BHK+",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-spoto-muted">{label}</span>
      <span className="text-right font-heading text-sm font-semibold text-spoto-ink">{value}</span>
    </div>
  );
}

function LeadDetailContent() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!params?.id) return;
    getLead(params.id)
      .then((data) => {
        setLead(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [params?.id]);

  if (state === "loading") {
    return <SpotoCard className="text-center text-sm text-spoto-muted">Loading lead…</SpotoCard>;
  }
  if (state === "error" || !lead) {
    return <SpotoCard className="text-center text-sm text-spoto-muted">Lead not found.</SpotoCard>;
  }

  return (
    <>
      <Link
        href="/leads"
        className="mb-4 inline-flex items-center gap-2 text-sm font-heading font-semibold text-spoto-muted hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <header className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-spoto-ink">{lead.buildingName}</h1>
            <p className="mt-1 text-sm text-spoto-muted">{lead.area}</p>
          </div>
          <StatusBadge status={lead.status} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpotoCard className="divide-y divide-spoto-line">
          <DetailRow label="Rent" value={formatInr(lead.rent)} />
          <DetailRow label="Deposit" value={formatInr(lead.deposit)} />
          <DetailRow label="Type" value={BHK_LABELS[lead.bhk] ?? lead.bhk} />
          <DetailRow label="Owner" value={lead.ownerName} />
          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm text-spoto-muted">Owner phone</span>
            <a
              href={`tel:${lead.ownerPhone}`}
              className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-spoto-green"
            >
              <Phone className="h-4 w-4" /> {lead.ownerPhone}
            </a>
          </div>
          <DetailRow label="Reward" value={lead.reward > 0 ? formatInr(lead.reward) : "—"} />
          <DetailRow label="Submitted" value={formatDate(lead.submittedAt)} />
        </SpotoCard>

        <SpotoCard>
          <h2 className="mb-4 font-heading text-lg font-bold text-spoto-ink">Status timeline</h2>
          <ol className="relative ml-2 border-l border-spoto-line">
            {lead.statusHistory.map((entry, idx) => {
              const last = idx === lead.statusHistory.length - 1;
              return (
                <li key={entry.id} className="mb-5 ml-5 last:mb-0">
                  <span
                    className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-spoto-surface ${
                      last ? "bg-spoto-green" : "bg-spoto-purple"
                    }`}
                  />
                  <p className="font-heading text-sm font-bold text-spoto-ink">
                    {statusLabel(entry.toStatus)}
                  </p>
                  <p className="text-xs text-spoto-muted">{formatDate(entry.changedAt)}</p>
                  {entry.reason && <p className="mt-1 text-sm text-white/80">{entry.reason}</p>}
                  {entry.suggestion && (
                    <p className="mt-1 rounded-spoto bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                      {entry.suggestion}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </SpotoCard>
      </div>
    </>
  );
}

export default function LeadDetailPage() {
  return (
    <AppShell>
      <LeadDetailContent />
    </AppShell>
  );
}
