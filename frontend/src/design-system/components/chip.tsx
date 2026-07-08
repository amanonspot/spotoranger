"use client";

// Re-export the adopted Spoto design-system Chip under the app's naming so
// screens keep a single import surface (@/design-system/components/*).
import Chip from "@/components/revamp/Chip";

type ChipProps = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  tone?: "default" | "hero";
};

export function SpotoChip(props: ChipProps) {
  return <Chip {...props} />;
}
