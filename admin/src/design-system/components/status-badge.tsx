import { cn } from "@/lib/utils";

/** Maps backend PropertyStatus values to human labels + a tone. */
export const STATUS_META: Record<string, { label: string; tone: string }> = {
  submitted: { label: "Submitted", tone: "bg-white/10 text-white/80" },
  under_review: { label: "Under Review", tone: "bg-amber-400/15 text-amber-300" },
  need_more_information: { label: "Need More Info", tone: "bg-amber-400/15 text-amber-300" },
  verified: { label: "Verified", tone: "bg-spoto-purple/20 text-spoto-purple" },
  listed_on_spoto: { label: "Listed on Spoto", tone: "bg-spoto-purple/20 text-spoto-purple" },
  reward_credited: { label: "Reward Credited", tone: "bg-spoto-green/20 text-spoto-green" },
  duplicate: { label: "Duplicate", tone: "bg-white/10 text-spoto-muted" },
  rejected: { label: "Rejected", tone: "bg-red-500/15 text-red-400" },
};

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "bg-white/10 text-white/80" };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-heading font-bold",
        meta.tone,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
