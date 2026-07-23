"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import { SubmissionsTable } from "@/components/admin-shell/submissions-table";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoChip } from "@/design-system/components/chip";
import { SpotoInput } from "@/design-system/components/input";
import { listSubmissions, type SubmissionRow } from "@/lib/api/admin";

const FILTERS = [
  { value: "", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "need_more_information", label: "Need Info" },
  { value: "verified", label: "Verified" },
  { value: "listed_on_spoto", label: "Listed" },
  { value: "reward_credited", label: "Rewarded" },
  { value: "rejected", label: "Rejected" },
];

function SubmissionsContent() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listSubmissions({ status: filter || undefined, search: search || undefined })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  return (
    <>
      <header className="pb-4">
        <p className="text-sm font-semibold text-spoto-purple">Review queue</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">Submissions</h1>
      </header>

      <div className="mb-4 grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-spoto-muted" />
          <SpotoInput
            className="pl-11"
            placeholder="Search building, area, or ranger"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => (
            <SpotoChip key={f.value} label={f.label} selected={filter === f.value} onClick={() => setFilter(f.value)} />
          ))}
        </div>
      </div>

      {loading ? (
        <SpotoCard className="text-center text-sm text-spoto-muted">Loading submissions…</SpotoCard>
      ) : (
        <SubmissionsTable rows={rows} />
      )}
    </>
  );
}

export default function SubmissionsPage() {
  return (
    <AdminShell>
      <SubmissionsContent />
    </AdminShell>
  );
}
