"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { LeadCard } from "@/components/leads/lead-card";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoChip } from "@/design-system/components/chip";
import { listLeads, type LeadSummary } from "@/lib/api/ranger";
import { useSession } from "@/lib/auth/session";

const FILTERS = [
  { value: "", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "verified", label: "Verified" },
  { value: "reward_credited", label: "Rewarded" },
  { value: "rejected", label: "Rejected" },
];

function LeadsContent() {
  const { session } = useSession();
  const rangerId = session?.rangerId ?? null;
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rangerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listLeads(rangerId)
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [rangerId]);

  const visible = useMemo(
    () => (filter ? leads.filter((l) => l.status === filter) : leads),
    [leads, filter],
  );

  return (
    <>
      <header className="pb-4">
        <p className="text-sm font-semibold text-spoto-purple">My leads</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">All submissions</h1>
      </header>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((f) => (
          <SpotoChip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onClick={() => setFilter(f.value)}
          />
        ))}
      </div>

      {loading ? (
        <SpotoCard className="text-center text-sm text-spoto-muted">Loading leads…</SpotoCard>
      ) : visible.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <SpotoCard className="text-center text-sm text-spoto-muted">
          No leads match this filter.
        </SpotoCard>
      )}
    </>
  );
}

export default function LeadsPage() {
  return (
    <AppShell>
      <LeadsContent />
    </AppShell>
  );
}
