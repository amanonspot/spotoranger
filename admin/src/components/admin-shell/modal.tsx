"use client";

import { SpotoButton } from "@/design-system/components/button";
import { SpotoCard } from "@/design-system/components/card";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "cta" | "outline";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCancel}>
      <SpotoCard className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-bold text-spoto-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-spoto-muted">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <SpotoButton variant="outline" onClick={onCancel}>
            Cancel
          </SpotoButton>
          <SpotoButton variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? "Working…" : confirmLabel}
          </SpotoButton>
        </div>
      </SpotoCard>
    </div>
  );
}
