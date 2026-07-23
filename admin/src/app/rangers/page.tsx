"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronRight, UserPlus } from "lucide-react";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import { ConfirmModal } from "@/components/admin-shell/modal";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoInput } from "@/design-system/components/input";
import { inviteRanger, listRangers, type RangerRow } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
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

function RangersContent() {
  const [rows, setRows] = useState<RangerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listRangers().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  async function sendInvite() {
    if (!/^\d{10}$/.test(invitePhone)) {
      toast.error("Enter a valid 10-digit number");
      return;
    }
    setBusy(true);
    try {
      const res = await inviteRanger(invitePhone);
      toast.success(`Invite created — code ${res.inviteCode.slice(0, 8)}`);
      setInviteOpen(false);
      setInvitePhone("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex items-end justify-between gap-4 pb-4">
        <div>
          <p className="text-sm font-semibold text-spoto-purple">Team</p>
          <h1 className="mt-1 font-heading text-3xl font-bold text-spoto-ink">Rangers</h1>
        </div>
        <SpotoButton onClick={() => setInviteOpen(true)} icon={<UserPlus className="h-5 w-5" />}>
          Invite
        </SpotoButton>
      </header>

      {loading ? (
        <SpotoCard className="text-center text-sm text-spoto-muted">Loading rangers…</SpotoCard>
      ) : rows.length === 0 ? (
        <SpotoCard className="text-center text-sm text-spoto-muted">No rangers yet.</SpotoCard>
      ) : (
        <>
          {/* Desktop table */}
          <SpotoCard className="hidden overflow-hidden p-0 lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-spoto-line text-spoto-muted">
                  <th className="px-4 py-3 font-heading font-semibold">ID</th>
                  <th className="px-4 py-3 font-heading font-semibold">Ranger</th>
                  <th className="px-4 py-3 font-heading font-semibold">Platform</th>
                  <th className="px-4 py-3 font-heading font-semibold">Area</th>
                  <th className="px-4 py-3 font-heading font-semibold">Submissions</th>
                  <th className="px-4 py-3 font-heading font-semibold">Wallet</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-spoto-line/60 transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-spoto-muted">{r.shortId}</td>
                    <td className="px-4 py-3">
                      <Link href={`/rangers/${r.id}`} className="font-heading font-semibold text-spoto-ink hover:text-spoto-purple">
                        {r.fullName}
                      </Link>
                      <p className="text-xs text-spoto-muted">{r.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-spoto-ink">{PLATFORM_LABELS[r.deliveryPlatform] ?? r.deliveryPlatform}</td>
                    <td className="px-4 py-3 text-spoto-ink">{r.preferredArea}</td>
                    <td className="px-4 py-3 text-spoto-ink">{r.submissionCount}</td>
                    <td className="px-4 py-3 font-heading font-semibold text-spoto-green">{formatInr(r.walletBalance)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/rangers/${r.id}`} className="inline-flex text-spoto-muted hover:text-white">
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SpotoCard>

          {/* Mobile cards */}
          <div className="grid gap-3 lg:hidden">
            {rows.map((r) => (
              <SpotoCard key={r.id} className="p-4">
                <Link href={`/rangers/${r.id}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-spoto-muted">{r.shortId}</p>
                    <h3 className="truncate font-heading text-base font-bold text-spoto-ink">{r.fullName}</h3>
                    <p className="mt-0.5 text-sm text-spoto-muted">
                      {PLATFORM_LABELS[r.deliveryPlatform] ?? r.deliveryPlatform} · {r.submissionCount} leads
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-heading text-sm font-bold text-spoto-green">{formatInr(r.walletBalance)}</span>
                    <ChevronRight className="h-5 w-5 text-spoto-muted" />
                  </div>
                </Link>
              </SpotoCard>
            ))}
          </div>
        </>
      )}

      <ConfirmModal
        open={inviteOpen}
        title="Invite a ranger"
        description="Create an invite for a new ranger by phone number."
        confirmLabel="Create invite"
        loading={busy}
        onConfirm={sendInvite}
        onCancel={() => setInviteOpen(false)}
      >
        <SpotoInput
          inputMode="numeric"
          placeholder="10-digit mobile number"
          value={invitePhone}
          maxLength={10}
          onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, ""))}
        />
      </ConfirmModal>
    </>
  );
}

export default function RangersPage() {
  return (
    <AdminShell>
      <RangersContent />
    </AdminShell>
  );
}
