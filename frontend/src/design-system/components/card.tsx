import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function SpotoCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-spoto border border-spoto-line bg-spoto-surface p-5 shadow-lg shadow-black/20",
        className,
      )}
      {...props}
    />
  );
}
