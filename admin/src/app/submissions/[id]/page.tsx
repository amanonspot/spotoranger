"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, GraduationCap, Phone, RotateCcw } from "lucide-react";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import { ConfirmModal } from "@/components/admin-shell/modal";
import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";
import { SpotoTextarea } from "@/design-system/components/input";
import { StatusBadge, statusLabel } from "@/design-system/components/status-badge";
import { changeStatus, getSubmission, resetDemo, sendReward, type SubmissionDetail } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatDate, formatInr } from "@/lib/format";

const BHK_LABELS: Record<string, string> = {
  "1_rk": "1 RK",
  "1_bhk": "1 BHK",
  "2_bhk": "2 BHK",
  "3_bhk": "3 BHK",
  "4_bhk_plus": "4 BHK+",
};

type ActionKind = "verify" | "reward" | "need_more_information" | "duplicate" | "rejected" | "reset";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-spoto-muted">{label}</span>
      <span className="text-right font-heading text-sm font-semibold text-spoto-ink">{value}</span>
    </div>
  );
}

function StepRow({
  n,
  label,
  done,
  children,
}: {
  n: number;
  label: string;
  done: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-spoto border border-spoto-line p-3">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full text-xs font-heading font-bold",
            done ? "bg-spoto-green text-[#101010]" : "bg-spoto-purple/20 text-spoto-purple",
          )}
        >
          {done ? "✓" : n}
        </span>
        <span className="font-heading text-sm font-semibold text-spoto-ink">{label}</span>
        {done && <span className="ml-auto text-xs font-heading font-semibold text-spoto-green">Done</span>}
      </div>
      {children}
    </div>
  );
}

function SubmissionDetailContent() {
  const params = useParams<{ id: string }>();
  const [sub, setSub] = useState<SubmissionDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!params?.id) return;
    getSubmission(params.id)
      .then((data) => {
        setSub(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [params?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function perform(kind: ActionKind) {
    if (!sub) return;
    setBusy(true);
    try {
      if (kind === "reward") {
        await sendReward(sub.id);
        toast.success("₹100 reward sent to the ranger");
      } else if (kind === "verify") {
        await changeStatus(sub.id, { status: "verified" });
        toast.success("Submission verified — reward unlocked");
      } else if (kind === "reset") {
        await resetDemo();
        toast.success("Demo reset");
      } else {
        await changeStatus(sub.id, { status: kind, reason });
        toast.success(`Marked ${statusLabel(kind)}`);
      }
      setAction(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <SpotoCard className="text-center text-sm text-spoto-muted">Loading…</SpotoCard>;
  if (state === "error" || !sub) return <SpotoCard className="text-center text-sm text-spoto-muted">Submission not found.</SpotoCard>;

  const verifyDone = ["verified", "listed_on_spoto", "reward_credited"].includes(sub.status);
  const rewardEnabled = sub.status === "verified" || sub.status === "listed_on_spoto";
  const isRewarded = sub.status === "reward_credited";
  const isTerminalNegative = ["rejected", "duplicate"].includes(sub.status);
  const canVerify = ["submitted", "under_review", "need_more_information"].includes(sub.status);
  const isDemo = sub.buildingName.startsWith("Demo Listing");

  return (
    <>
      <Link href="/submissions" className="mb-4 inline-flex items-center gap-2 text-sm font-heading font-semibold text-spoto-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to submissions
      </Link>

      <header className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-spoto-muted">Submission {sub.shortId}</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-spoto-ink">{sub.buildingName}</h1>
            <p className="mt-1 text-sm text-spoto-muted">{sub.area}</p>
          </div>
          <StatusBadge status={sub.status} />
        </div>
      </header>

      {isDemo && (
        <SpotoCard className="mb-4 border-spoto-purple/40 bg-spoto-purple/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-spoto-purple" />
              <div>
                <p className="font-heading text-sm font-bold text-spoto-ink">Practice the review flow</p>
                <p className="mt-1 text-sm text-spoto-muted">
                  1) Click <span className="font-semibold text-spoto-ink">Verify</span> — the reward button unlocks. 2) Click{" "}
                  <span className="font-semibold text-spoto-green">Send Reward ₹100</span> to credit the ranger. Reset anytime to try again.
                </p>
              </div>
            </div>
            <SpotoButton variant="secondary" onClick={() => setAction("reset")} icon={<RotateCcw className="h-4 w-4" />}>
              Reset demo
            </SpotoButton>
          </div>
        </SpotoCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Details */}
        <SpotoCard className="divide-y divide-spoto-line lg:col-span-1">
          <DetailRow label="Rent" value={formatInr(sub.rent)} />
          <DetailRow label="Deposit" value={formatInr(sub.deposit)} />
          <DetailRow label="Type" value={BHK_LABELS[sub.bhk] ?? sub.bhk} />
          <DetailRow label="Owner" value={sub.ownerName} />
          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm text-spoto-muted">Owner phone</span>
            <a href={`tel:${sub.ownerPhone}`} className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-spoto-green">
              <Phone className="h-4 w-4" /> {sub.ownerPhone}
            </a>
          </div>
          <DetailRow label="Reward" value={sub.reward > 0 ? formatInr(sub.reward) : "—"} />
        </SpotoCard>

        {/* Ranger + timeline */}
        <SpotoCard className="lg:col-span-1">
          <h2 className="mb-3 font-heading text-base font-bold text-spoto-ink">Ranger</h2>
          <Link href={`/rangers/${sub.rangerId}`} className="block rounded-spoto bg-spoto-surface-2 p-3 hover:bg-white/5">
            <p className="font-heading text-sm font-semibold text-spoto-ink">{sub.rangerName}</p>
            <p className="text-xs text-spoto-muted">{sub.rangerPhone}</p>
          </Link>

          <h2 className="mb-3 mt-5 font-heading text-base font-bold text-spoto-ink">Timeline</h2>
          <ol className="relative ml-2 border-l border-spoto-line">
            {sub.statusHistory.map((h, i) => {
              const last = i === sub.statusHistory.length - 1;
              return (
                <li key={h.id} className="mb-4 ml-5 last:mb-0">
                  <span className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-spoto-surface ${last ? "bg-spoto-green" : "bg-spoto-purple"}`} />
                  <p className="font-heading text-sm font-bold text-spoto-ink">{statusLabel(h.toStatus)}</p>
                  <p className="text-xs text-spoto-muted">{formatDate(h.changedAt)}</p>
                  {h.reason && <p className="mt-0.5 text-sm text-white/80">{h.reason}</p>}
                </li>
              );
            })}
          </ol>
        </SpotoCard>

        {/* Two-step actions */}
        <SpotoCard className="lg:col-span-1">
          <h2 className="mb-3 font-heading text-base font-bold text-spoto-ink">Review actions</h2>

          {isTerminalNegative ? (
            <p className="text-sm text-spoto-muted">This submission is finalized ({statusLabel(sub.status)}). No further action.</p>
          ) : (
            <div className="grid gap-3">
              <StepRow n={1} label="Verify submission" done={verifyDone}>
                {canVerify && (
                  <SpotoButton className="w-full" onClick={() => perform("verify")} disabled={busy}>
                    Verify (success)
                  </SpotoButton>
                )}
              </StepRow>

              <StepRow n={2} label="Send reward" done={isRewarded}>
                {!isRewarded && (
                  <>
                    <SpotoButton className="w-full" variant="cta" disabled={!rewardEnabled || busy} onClick={() => setAction("reward")}>
                      Send Reward (₹100)
                    </SpotoButton>
                    {!rewardEnabled && (
                      <p className="mt-2 text-xs text-spoto-muted">Verify the submission first to unlock the reward.</p>
                    )}
                  </>
                )}
              </StepRow>

              {!isRewarded && (
                <div className="mt-1 grid gap-2 border-t border-spoto-line pt-3">
                  <p className="text-xs text-spoto-muted">Other outcomes</p>
                  <SpotoButton variant="secondary" onClick={() => setAction("need_more_information")}>Request more info</SpotoButton>
                  <SpotoButton variant="secondary" onClick={() => setAction("duplicate")}>Mark duplicate</SpotoButton>
                  <SpotoButton variant="outline" onClick={() => setAction("rejected")}>Reject (failed)</SpotoButton>
                </div>
              )}
            </div>
          )}
        </SpotoCard>
      </div>

      {/* Modals */}
      <ConfirmModal
        open={action === "reward"}
        title="Send ₹100 reward?"
        description={`This lists ${sub.buildingName} live on Spoto and credits ₹100 to ${sub.rangerName}'s wallet.`}
        confirmLabel="Send Reward ₹100"
        confirmVariant="cta"
        loading={busy}
        onConfirm={() => perform("reward")}
        onCancel={() => setAction(null)}
      />
      <ConfirmModal
        open={action === "reset"}
        title="Reset the demo listing?"
        description="Returns the demo to 'submitted' and undoes its practice reward so you can run the flow again."
        confirmLabel="Reset demo"
        loading={busy}
        onConfirm={() => perform("reset")}
        onCancel={() => setAction(null)}
      />
      <ConfirmModal
        open={action === "need_more_information" || action === "duplicate" || action === "rejected"}
        title={action ? `Mark ${statusLabel(action)}` : ""}
        description="Add a note for the ranger (optional)."
        confirmLabel="Confirm"
        confirmVariant="outline"
        loading={busy}
        onConfirm={() => action && perform(action)}
        onCancel={() => setAction(null)}
      >
        <SpotoTextarea placeholder="Reason / note" value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmModal>
    </>
  );
}

export default function SubmissionDetailPage() {
  return (
    <AdminShell>
      <SubmissionDetailContent />
    </AdminShell>
  );
}
