import type { LucideIcon } from "lucide-react";

import { SpotoCard } from "@/design-system/components/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "purple",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "purple" | "green" | "amber";
}) {
  const tone =
    accent === "green"
      ? "bg-spoto-green/15 text-spoto-green"
      : accent === "amber"
      ? "bg-amber-400/15 text-amber-300"
      : "bg-spoto-purple/15 text-spoto-purple";

  return (
    <SpotoCard className="flex items-center gap-4 p-4">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-spoto", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-spoto-muted">{label}</p>
        <p className="font-heading text-2xl font-bold text-spoto-ink">{value}</p>
      </div>
    </SpotoCard>
  );
}
