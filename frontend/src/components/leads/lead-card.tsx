import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SpotoCard } from "@/design-system/components/card";
import { StatusBadge } from "@/design-system/components/status-badge";
import type { LeadSummary } from "@/lib/api/ranger";
import { formatInr } from "@/lib/format";

export function LeadCard({ lead }: { lead: LeadSummary }) {
  const reward = lead.reward > 0 ? formatInr(lead.reward) : "—";

  return (
    <SpotoCard className="p-4 transition-colors hover:border-spoto-purple/50">
      <Link className="flex items-center justify-between gap-4" href={`/leads/${lead.id}`}>
        <div className="min-w-0">
          <h3 className="truncate font-heading text-base font-bold text-spoto-ink">{lead.buildingName}</h3>
          <p className="mt-1 text-sm font-medium text-spoto-muted">
            {lead.area} · {formatInr(lead.rent)}
          </p>
          <div className="mt-3">
            <StatusBadge status={lead.status} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-heading text-sm font-bold text-spoto-green">{reward}</span>
          <ChevronRight aria-hidden className="h-5 w-5 text-spoto-muted" />
        </div>
      </Link>
    </SpotoCard>
  );
}
