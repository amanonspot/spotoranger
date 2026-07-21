import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SpotoCard } from "@/design-system/components/card";
import { StatusBadge } from "@/design-system/components/status-badge";
import { formatInr } from "@/lib/format";
import type { SubmissionRow } from "@/lib/api/admin";

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  if (rows.length === 0) {
    return <SpotoCard className="text-center text-sm text-spoto-muted">No submissions found.</SpotoCard>;
  }

  return (
    <>
      {/* Desktop: data table */}
      <SpotoCard className="hidden overflow-hidden p-0 lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-spoto-line text-spoto-muted">
              <th className="px-4 py-3 font-heading font-semibold">ID</th>
              <th className="px-4 py-3 font-heading font-semibold">Building</th>
              <th className="px-4 py-3 font-heading font-semibold">Ranger</th>
              <th className="px-4 py-3 font-heading font-semibold">Rent</th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
              <th className="px-4 py-3 font-heading font-semibold">Reward</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-spoto-line/60 transition-colors hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-xs text-spoto-muted">{r.shortId}</td>
                <td className="px-4 py-3">
                  <Link href={`/submissions/${r.id}`} className="font-heading font-semibold text-spoto-ink hover:text-spoto-purple">
                    {r.buildingName}
                  </Link>
                  <p className="text-xs text-spoto-muted">{r.area}</p>
                </td>
                <td className="px-4 py-3 text-spoto-ink">{r.rangerName}</td>
                <td className="px-4 py-3 text-spoto-ink">{formatInr(r.rent)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 font-heading font-semibold text-spoto-green">
                  {r.reward > 0 ? formatInr(r.reward) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/submissions/${r.id}`} className="inline-flex text-spoto-muted hover:text-white">
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SpotoCard>

      {/* Mobile: stacked cards */}
      <div className="grid gap-3 lg:hidden">
        {rows.map((r) => (
          <SpotoCard key={r.id} className="p-4">
            <Link href={`/submissions/${r.id}`} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-spoto-muted">{r.shortId}</p>
                <h3 className="truncate font-heading text-base font-bold text-spoto-ink">{r.buildingName}</h3>
                <p className="mt-0.5 text-sm text-spoto-muted">
                  {r.rangerName} · {r.area}
                </p>
                <div className="mt-2">
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-heading text-sm font-bold text-spoto-green">
                  {r.reward > 0 ? formatInr(r.reward) : "—"}
                </span>
                <ChevronRight className="h-5 w-5 text-spoto-muted" />
              </div>
            </Link>
          </SpotoCard>
        ))}
      </div>
    </>
  );
}
